import type { Task, TaskOption } from '../domain/types.ts';
import type { Rezept, RezeptArt } from './schemas.ts';
import { ZWEITPRUEFUNG_SCHEMA, VORSCHLAG_SCHEMA } from './schemas.ts';
import { KiNichtErreichbar, frage, frageAufgabenVorschlag, type AiEinstellungen } from './client.ts';
import { ZWEITPRUEFUNG_PROMPT, systemPromptFuerAufgaben } from './prompts.ts';
import { gleicheOptionenAb, rechne, RezeptFehler } from '../tasks/resolve.ts';
import { baueTask, parameterHash, type TaskBausatz } from '../validation/pipeline.ts';
import { FAKTEN, holeFakt } from '../content/facts/index.ts';
import { holeAtom } from '../content/curriculum/index.ts';
import { lagerEintrag } from '../content/lernlager.ts';
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
  // Zwei Wege: über den fachlichen Zuschnitt des Themas (Fakten-Tags) und
  // über die Grundfakten, die für Rechen- und Normenthemen immer gelten.
  const tags = new Set<string>([atom.fachlich, atom.kapitelId.split('-')[1] ?? '']);
  const ids = new Set<string>();

  for (const fakt of FAKTEN) {
    if (fakt.tags.some((t) => tags.has(t))) ids.add(fakt.id);
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
      if (holeFakt(id)) ids.add(id);
    }
  }
  return [...ids];
}

type Entwurf = TaskBausatz;

/**
 * Baut einen vorläufigen Task, damit die Zweitprüfung etwas zu prüfen bekommt.
 * Dieser Task wird nie verwendet – er existiert nur als Prüfgegenstand.
 *
 * Scheitert schon der Entwurf an der Validierung (etwa weil der Vorschlag eine
 * Zahl erfindet, die an keinem Fakt hängt), wird der Grund zurückgegeben statt
 * geworfen. Sonst reißt ein einziger schlechter Vorschlag die ganze Runde mit,
 * und von drei angeforderten Aufgaben kommt keine einzige an.
 */
function entwurfAlsTask(
  entwurf: Entwurf,
): { task: Task } | { grund: string } {
  try {
    return {
      task: baueTask({ ...entwurf, validierungsOptionen: { duplikatPruefen: false } }),
    };
  } catch (fehler) {
    return { grund: fehler instanceof Error ? fehler.message : 'Validierung fehlgeschlagen.' };
  }
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

  // Das Lernlager liefert Besprechung, typische Fragen und die erlaubten
  // Fakten. Ohne Lager-Eintrag greift die automatische Faktensammlung.
  const lager = lagerEintrag(atom.id);
  const faktenIds = lager && lager.faktenIds.length > 0 ? lager.faktenIds : relevanteFakten(atom);
  const system = systemPromptFuerAufgaben(atom, faktenIds, lager ?? undefined);
  const nutzer = [
    `Erstelle ${anzahl} verschiedene Aufgaben zum Thema "${atom.titel}".`,
    lager ? `Gehe dabei von dieser Besprechung aus: ${lager.typischeFragen[0] ?? atom.lernziel}` : '',
    'Variiere den Blickwinkel zwischen den Aufgaben (Anwendung, Fehlererkennung, Wert ableiten).',
    'Antworte als JSON-Objekt mit dem Feld "aufgaben", das die Aufgaben als Liste enthält.',
  ]
    .filter(Boolean)
    .join(' ');

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
    const entwurfTask = entwurfAlsTask(versuch.entwurf);
    if ('grund' in entwurfTask) {
      verworfen.push({ grund: entwurfTask.grund, vorschlag: roh.prompt.slice(0, 120) });
      continue;
    }

    const zweitpruefung = einstellungen.zweitpruefung
      ? await zweitpruefe(einstellungen, entwurfTask.task, signal)
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
