/**
 * Selbsttest der KI-Kette.
 *
 * Zweck: Nicht „erreichbar?" beantworten, sondern „kommt wirklich eine
 * brauchbare Aufgabe zurück?" – und zwar Stufe für Stufe, damit ein
 * Fehlschlag sofort zeigt, wo es klemmt.
 *
 * Die Stufen bauen aufeinander auf:
 *   1. Verbindung   – antwortet der Endpunkt, ist der Schlüssel gültig?
 *   2. Schema       – hält sich das Modell an das JSON-Schema?
 *   3. Vorschlag    – liefert es einen vollständigen Aufgabenvorschlag?
 *   4. Rechnung     – führt die Engine das Rezept aus und passt genau eine
 *                     Option zum Ergebnis?
 *   5. Prüfung      – besteht der Vorschlag die Validierungspipeline?
 *
 * Läuft eine Stufe nicht durch, werden die weiteren übersprungen – der
 * Bericht nennt dann genau die Stelle und den rohen Text des Modells.
 */

import type { Task } from '../domain/types.ts';
import { frage, frageAufgabenVorschlag, type AiEinstellungen } from './client.ts';
import type { Rezept } from './schemas.ts';
import { systemPromptFuerAufgaben } from './prompts.ts';
import { gleicheOptionenAb, rechne, rezeptWerte, RezeptFehler } from '../tasks/resolve.ts';
import { baueTask, parameterHash } from '../validation/pipeline.ts';
import { holeAtom } from '../content/curriculum/index.ts';
import { lagerEintrag } from '../content/lernlager.ts';
import { relevanteFakten } from './generator.ts';

export interface SelbsttestStufe {
  name: string;
  ok: boolean;
  detail: string;
  /** Laufzeit in Millisekunden – leer, wenn gar nicht gelaufen. */
  dauerMs?: number;
  /** Rohtext des Modells – nur bei Fehlschlag, gekürzt. */
  roh?: string;
}

export interface SelbsttestErgebnis {
  ok: boolean;
  modell: string;
  stufen: SelbsttestStufe[];
  /** Der fertige, geprüfte Task – falls die Kette durchlief. */
  task?: Task;
}

/** Ein Thema, das die Engine sicher abbilden kann: Strombelastbarkeit. */
const PRUEF_THEMA = 'ka-verteilung-02';

function kuerze(text: string, laenge = 600): string {
  return text.length > laenge ? `${text.slice(0, laenge)} …` : text;
}

export async function selbsttest(
  einstellungen: AiEinstellungen,
  signal?: AbortSignal,
): Promise<SelbsttestErgebnis> {
  const stufen: SelbsttestStufe[] = [];
  const modell = einstellungen.modell;

  const abbruch = (name: string, detail: string, roh?: string): SelbsttestErgebnis => {
    stufen.push({ name, ok: false, detail, roh: roh ? kuerze(roh) : undefined });
    return { ok: false, modell, stufen };
  };

  // --- Stufe 1: Verbindung ------------------------------------------------
  const atom = holeAtom(PRUEF_THEMA);
  if (!atom) return abbruch('Aufbau', `Prüfthema ${PRUEF_THEMA} nicht gefunden.`);

  const lager = lagerEintrag(atom.id);
  const faktenIds =
    lager && lager.faktenIds.length > 0 ? lager.faktenIds : relevanteFakten(atom);
  const system = systemPromptFuerAufgaben(atom, faktenIds, lager ?? undefined);
  const nutzer =
    `Erstelle genau 1 Multiple-Choice-Aufgabe zum Thema "${atom.titel}". ` +
    'Antworte als JSON-Objekt mit dem Feld "aufgaben".';

  let roh: string;
  const t0 = Date.now();
  try {
    roh = await frage(
      einstellungen,
      { system, nutzer, schema: undefined, temperatur: 0.2 },
      signal,
    );
  } catch (fehler) {
    return abbruch(
      'Verbindung',
      fehler instanceof Error ? fehler.message : 'Netzwerkfehler.',
    );
  }
  stufen.push({
    name: 'Verbindung',
    ok: true,
    detail: `Antwort in ${Date.now() - t0} ms, ${roh.length} Zeichen.`,
    dauerMs: Date.now() - t0,
  });

  // --- Stufe 2 + 3: Schema und Vorschlag ---------------------------------
  let vorschlaege;
  const t1 = Date.now();
  try {
    vorschlaege = await frageAufgabenVorschlag(einstellungen, system, nutzer, signal);
  } catch (fehler) {
    return abbruch(
      'Vorschlag',
      fehler instanceof Error ? fehler.message : 'Vorschlag nicht lesbar.',
    );
  }
  const vorschlag = vorschlaege[0];
  if (!vorschlag) return abbruch('Vorschlag', 'Das Modell lieferte keine Aufgabe.');
  stufen.push({
    name: 'Vorschlag',
    ok: true,
    detail:
      `Format ${String(vorschlag.format)}, Stufe ${String(vorschlag.stufe)}, ` +
      `${vorschlag.options?.length ?? 0} Optionen, Rezept „${String((vorschlag.berechnung as { art?: string })?.art)}".`,
    dauerMs: Date.now() - t1,
  });

  // --- Stufe 4: Rechnung --------------------------------------------------
  const berechnung = vorschlag.berechnung as Rezept;
  let ergebnis;
  try {
    ergebnis = rechne(berechnung);
  } catch (fehler) {
    const grund =
      fehler instanceof RezeptFehler
        ? fehler.message
        : fehler instanceof Error
          ? fehler.message
          : 'unbekannt';
    return abbruch('Rechnung', `Rezept nicht ausführbar: ${grund}`, JSON.stringify(vorschlag));
  }
  const optionen = (vorschlag.options ?? []).map((o) => ({ id: o.id, text: o.text }));
  const abgleich = gleicheOptionenAb(optionen, ergebnis, ergebnis.einheit);
  if (abgleich.korrektOptionId === null) {
    return abbruch(
      'Rechnung',
      abgleich.passende.length === 0
        ? `Keine Option passt zum Ergebnis ${abgleich.erkannterWert} ${ergebnis.einheit}.`
        : `Mehrere Optionen passen (${abgleich.passende.join(', ')}).`,
      JSON.stringify(vorschlag),
    );
  }
  stufen.push({
    name: 'Rechnung',
    ok: true,
    detail: `Engine rechnet ${abgleich.erkannterWert} ${ergebnis.einheit}; Option „${abgleich.korrektOptionId}" passt.`,
  });

  // --- Stufe 5: Validierung ----------------------------------------------
  const t2 = Date.now();
  try {
    const task = baueTask({
      validierungsOptionen: {
        duplikatPruefen: false,
        rezeptWerte: rezeptWerte(berechnung),
      },
      proposal: { ...vorschlag, format: 'mc', origin: 'ki' },
      paramsHash: parameterHash(['selbsttest', atom.id, String(Date.now())]),
      correctOptionId: abgleich.korrektOptionId,
      optionRationale: {},
      solutionSteps: ergebnis.steps,
      explanation:
        ergebnis.steps.at(-1)?.result ?? `${abgleich.erkannterWert} ${ergebnis.einheit}`,
    });
    stufen.push({
      name: 'Prüfung',
      ok: true,
      detail: `Bestanden – alle Prüfschritte grün (${task.validation.checks.length} Kontrollen).`,
      dauerMs: Date.now() - t2,
    });
    return { ok: true, modell, stufen, task };
  } catch (fehler) {
    return abbruch(
      'Prüfung',
      fehler instanceof Error ? fehler.message : 'Validierung fehlgeschlagen.',
      JSON.stringify(vorschlag),
    );
  }
}
