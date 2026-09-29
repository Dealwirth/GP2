import type { Task, TaskOption } from '../domain/types.ts';
import type { Rezept, RezeptArt } from './schemas.ts';
import { ZWEITPRUEFUNG_SCHEMA, VORSCHLAG_SCHEMA } from './schemas.ts';
import { KiNichtErreichbar, frage, frageAufgabenVorschlag, type AiEinstellungen } from './client.ts';
import { ZWEITPRUEFUNG_PROMPT, systemPromptFuerAufgaben } from './prompts.ts';
import { gleicheOptionenAb, rechne, RezeptFehler } from '../tasks/resolve.ts';
import { baueTask, parameterHash, type TaskBausatz } from '../validation/pipeline.ts';
import { holeFakt } from '../content/facts/index.ts';
import { holeAtom } from '../content/curriculum/index.ts';
import type { Atom } from '../content/curriculum/types.ts';

export interface GenerierungsErgebnis {
  aufgaben: Task[];
  verworfen: { grund: string; vorschlag: string }[];
  kiAktiv: boolean;
}

interface RohVorschlag {
  format: string;
  stufe: number;
  examArea: string;
  topicIds: string[];
  prompt: string;
  options?: { id: string; text: string; begruendungWennFalsch?: string }[];
  factRefs: { factId: string; value?: number | string }[];
  learningGoal: string;
  hinweis?: string;
  berechnung: Rezept;
}

/** Fakten, die für ein Thema infrage kommen – gesammelt über die Tags. */
export function relevanteFakten(atom: Atom): string[] {
  const tags = new Set<string>([atom.fachlich, atom.kapitelId.split('-')[1] ?? '']);
  const ids = new Set<string>();

  // Fakten mit passenden Tags
  for (const f of holeFakt('u0-230') ? [{ tags: ['spannung', 'tn-system'], id: 'u0-230' }, { tags: ['spannung', 'drehstrom'], id: 'u0-400' }, { tags: ['selv', 'kleinspannung'], id: 'u0-24' }, { tags: ['abschaltbedingung'], id: 'u0-50' }] : []) {
    if (f.tags.some((t) => tags.has(t))) ids.add(f.id);
  }
  if (atom.fachlich === 'norm' || atom.fachlich === 'rechnen') {
    for (const id of [
      'idn-personenschutz',
      'idn-feuchteraum',
      'abschaltzeit-0-3s',
      'iz-tabelle-verlegeart-c',
      'absicherung-schultabelle',
      'iz-temperatur-bezug',
      'ls-kennlinie-b-magnetisch-min',
      'ls-kennlinie-c-magnetisch-min',
      'ls-kennlinie-d-magnetisch-min',
      're-grenzwert',
    ]) {
      ids.add(id);
    }
  }
  void tags;
  return [...ids];
}

type Entwurf = TaskBausatz;

/**
 * Baut einen vorläufigen Task, damit die Zweitprüfung etwas zu prüfen bekommt.
 * Dieser Task wird nie verwendet – er existiert nur als Prüfgegenstand.
 */
function entwurfAlsTask(entwurf: Entwurf): Task {
  return baueTask({ ...entwurf, validierungsOptionen: { duplikatPruefen: false } });
}

function baueTaskAusVorschlag(
  vorschlag: RohVorschlag,
  atom: Atom,
): { entwurf: Entwurf } | { grund: string } {
  if (vorschlag.format !== 'mc') {
    return { grund: 'Nur Multiple Choice ist maschinell prüfbar.' };
  }
  const optionen: TaskOption[] = vorschlag.options ?? [];
  if (optionen.length < 3) return { grund: 'Weniger als drei Antwortmöglichkeiten.' };

  let ergebnis;
  try {
    ergebnis = rechne(vorschlag.berechnung);
  } catch (fehler) {
    if (fehler instanceof RezeptFehler) return { grund: fehler.message };
    return { grund: `Rechenfehler im Rezept: ${fehler instanceof Error ? fehler.message : 'unbekannt'}` };
  }

  const abgleich = gleicheOptionenAb(optionen, ergebnis, ergebnis.einheit);
  if (abgleich.korrektOptionId === null) {
    return {
      grund:
        abgleich.passende.length === 0
          ? `Keine Option passt zum Rechenergebnis ${abgleich.erkannterWert} ${ergebnis.einheit}.`
          : `Mehrere Optionen passen (${abgleich.passende.join(', ')}) – Frage ist mehrdeutig.`,
    };
  }

  const rationale: Record<string, string> = {};
  for (const o of optionen) {
    rationale[o.id] =
      o.id === abgleich.korrektOptionId
        ? `${ergebnis.steps.at(-1)?.result ?? ''}`
        : (o.begruendungWennFalsch ?? 'Dieser Wert passt nicht zum Rechenergebnis.');
  }

  try {
    return {
      entwurf: {
        // Nur KI-Aufgaben unterliegen der Duplikatsperre: sie soll verhindern,
        // dass das Modell dieselbe Aufgabe noch einmal erfindet.
        validierungsOptionen: { duplikatPruefen: true },
        proposal: {
          proposalId: `ki_${atom.id}_${abgleich.erkannterWert}`,
          format: 'mc',
          stufe: vorschlag.stufe as 1 | 2 | 3 | 4,
          estimatedSeconds: vorschlag.stufe === 1 ? 25 : vorschlag.stufe === 2 ? 60 : 180,
          examArea: vorschlag.examArea as Task['proposal']['examArea'],
          topicIds: vorschlag.topicIds.length > 0 ? vorschlag.topicIds : [atom.id],
          prompt: vorschlag.prompt,
          options: optionen,
          factRefs: vorschlag.factRefs,
          learningGoal: vorschlag.learningGoal,
          hint: vorschlag.hinweis,
          origin: 'ki',
        },
        paramsHash: parameterHash([
          atom.id,
          vorschlag.berechnung.art,
          JSON.stringify(vorschlag.berechnung),
          vorschlag.prompt,
        ]),
        correctOptionId: abgleich.korrektOptionId,
        optionRationale: rationale,
        solutionSteps: ergebnis.steps,
        explanation:
          ergebnis.steps.at(-1)?.result ??
          `${abgleich.erkannterWert} ${ergebnis.einheit}`,
      },
    };
  } catch (fehler) {
    return { grund: fehler instanceof Error ? fehler.message : 'Validierung fehlgeschlagen.' };
  }
}

/**
 * Erzeugt Aufgaben zu einem Thema.
 *
 * Ablauf je Vorschlag:
 *   1. Rezept ausführen → Ergebnis der Engine
 *   2. prüfen, ob genau eine Option dazu passt
 *   3. Validierungspipeline (Faktenbindung, Duplikat, Gültigkeit)
 *   4. Zweitprüfung durch ein zweites Modell
 * Erst danach erscheint die Aufgabe.
 */
export async function erzeugeAufgaben(
  einstellungen: AiEinstellungen,
  atom: Atom,
  anzahl = 3,
  signal?: AbortSignal,
): Promise<GenerierungsErgebnis> {  const verworfen: { grund: string; vorschlag: string }[] = [];
  if (!einstellungen.aktiv) {
    return { aufgaben: [], verworfen, kiAktiv: false };
  }

  const faktenIds = relevanteFakten(atom);
  const system = systemPromptFuerAufgaben(atom, faktenIds);
  const nutzer = `Erstelle ${anzahl} Aufgaben zum Thema "${atom.titel}" mit Rezept.`;

  let vorschlaege: Awaited<ReturnType<typeof frageAufgabenVorschlag>>;
  try {
    vorschlaege = await frageAufgabenVorschlag(einstellungen, system, nutzer, signal);
  } catch (fehler) {
    if (fehler instanceof KiNichtErreichbar) {
      return { aufgaben: [], verworfen, kiAktiv: false };
    }
    throw fehler;
  }

  const aufgaben: Task[] = [];
  for (const proposal of vorschlaege) {
    const roh = proposal as unknown as RohVorschlag;
    const versuch = baueTaskAusVorschlag(roh, atom);
    if ('grund' in versuch) {
      verworfen.push({ grund: versuch.grund, vorschlag: roh.prompt.slice(0, 120) });
      continue;
    }

    // Die Zweitprüfung läuft vor dem Bauen, damit ihr Urteil Teil des
    // Validierungsprotokolls der Aufgabe wird und die Aufgabe bei einem
    // Beanstanden gar nicht erst entsteht.
    const zweitpruefung = einstellungen.zweitpruefung
      ? await zweitpruefe(einstellungen, entwurfAlsTask(versuch.entwurf), signal)
      : { bestanden: true, detail: 'Zweitprüfung abgeschaltet.' };

    try {
      aufgaben.push(
        baueTask({
          ...versuch.entwurf,
          validierungsOptionen: {
            ...versuch.entwurf.validierungsOptionen,
            zweitpruefung,
          },
        }),
      );
    } catch (fehler) {
      verworfen.push({
        grund: fehler instanceof Error ? fehler.message : 'Validierung fehlgeschlagen.',
        vorschlag: roh.prompt.slice(0, 120),
      });
    }
  }

  return { aufgaben, verworfen, kiAktiv: true };
}

/** Zweitprüfung durch ein zweites Modell. */
export async function zweitpruefe(
  einstellungen: AiEinstellungen,
  task: Task,
  signal?: AbortSignal,
): Promise<{ bestanden: boolean; detail: string }> {
  const nutzer = [
    `Prüfungsbereich: ${task.proposal.examArea}`,
    `Frage: ${task.proposal.prompt}`,
    `Optionen: ${(task.proposal.options ?? []).map((o) => `${o.id}) ${o.text}`).join(' | ')}`,
    `Fakten: ${task.proposal.factRefs.map((f) => f.factId).join(', ')}`,
    `Berechnetes Ergebnis: ${task.solutionSteps.at(-1)?.result ?? ''}`,
  ].join('\n');

  try {
    const roh = await frage(
      einstellungen,
      { system: ZWEITPRUEFUNG_PROMPT, nutzer, schema: ZWEITPRUEFUNG_SCHEMA, temperatur: 0.1 },
      signal,
    );
    const daten = JSON.parse(roh) as { verdacht: string; begruendung: string };
    return {
      bestanden: daten.verdacht === 'kein',
      detail: `${daten.verdacht}: ${daten.begruendung}`,
    };
  } catch (fehler) {
    // Bleibt die Zweitprüfung aus, wird die Aufgabe nicht verwendet.
    return {
      bestanden: false,
      detail: `Zweitprüfung fehlgeschlagen: ${
        fehler instanceof Error ? fehler.message : 'unbekannt'
      }`,
    };
  }
}

export { VORSCHLAG_SCHEMA, ZWEITPRUEFUNG_SCHEMA };
export type { Rezept, RezeptArt };
export type { AiEinstellungen };
export function atomAusId(id: string): Atom | undefined {
  return holeAtom(id);
}
