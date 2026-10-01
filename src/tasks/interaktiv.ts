import type { InteraktiveLoesung, Task } from '../domain/types.ts';
import {
  LUECK_FRAGEN,
  REIHENFOLGE_FRAGEN,
  WF_FRAGEN,
  ZUORD_FRAGEN,
} from '../content/curriculum/interaktivfragen.ts';
import { baueTask, parameterHash } from '../validation/pipeline.ts';
import { sammleSicher } from './robust.ts';
import type { Aufgabenstufe } from '../domain/types.ts';

/**
 * Aufgaben in den interaktiven Formaten.
 *
 * Die Faktenbasis trägt Werte und Aussagen – daraus entstehen Wert- und
 * Zuordnungsfragen, aber nicht jede Prüfungsform. Was hier gebaut wird, füllt
 * genau diese Lücke: Richtig/Falsch, Zuordnung, Reihenfolge und Lückentext.
 *
 * Wichtig für die Bewertung: Die Lösung steckt im Vorschlag (`interaktiv`).
 * Das ist bei diesen Formaten unvermeidlich – eine Reihenfolge lässt sich
 * nicht wie eine Multiple-Choice-Option in einer getrennten Kennung ablegen.
 * Die Pipeline prüft deshalb, dass der Aufgabentext keine Zahl enthält, die
 * nicht aus der Faktenbasis stammt.
 */

/** Ein Aufzählungszeichen vor einer Zeile verrät die Reihenfolge – es muss weg. */
function ohneNummerierung(schritte: string[]): string[] {
  return schritte.map((s) => s.replace(/^\s*\d+[.)]\s+/, ''));
}

function basis(proposalId: string, thema: string, bereich: Task['proposal']['examArea'], frage: string, stufe: Aufgabenstufe, interaktiv: InteraktiveLoesung, factIds: string[] = []): Task['proposal'] {
  return {
    proposalId,
    format: interaktiv.format,
    stufe,
    estimatedSeconds: stufe === 1 ? 25 : 45,
    examArea: bereich,
    topicIds: [thema],
    prompt: frage,
    interaktiv,
    factRefs: factIds.map((id) => ({ factId: id })),
    learningGoal: '',
    origin: 'statisch',
  };
}

export function aufgabeWahrFalsch(quelle: (typeof WF_FRAGEN)[number]): Task {
  const interaktiv: InteraktiveLoesung = {
    format: 'wahr-falsch',
    richtigWahr: quelle.wahr,
  };
  return baueTask({
    proposal: {
      ...basis(
        `wf-${quelle.id}`,
        quelle.thema,
        quelle.bereich,
        quelle.aussage,
        (quelle.stufe ?? 1) as Aufgabenstufe,
        interaktiv,
        quelle.factIds ?? [],
      ),
      learningGoal: quelle.erklaerung,
    },
    paramsHash: parameterHash(['wf', quelle.id]),
    interaktiv: { ...interaktiv },
    solutionSteps: [
      { label: 'Aussage', result: quelle.aussage },
      { label: 'Bewertung', result: quelle.wahr ? 'wahr' : 'falsch' },
      { label: 'Begründung', result: quelle.begruendung },
    ],
    explanation: quelle.erklaerung,
  });
}

export function aufgabeZuordnung(quelle: (typeof ZUORD_FRAGEN)[number]): Task {
  const interaktiv: InteraktiveLoesung = {
    format: 'zuordnung',
    paare: quelle.paare.map(([links, rechts]) => ({ links, rechts })),
  };
  return baueTask({
    proposal: {
      ...basis(
        `zu-${quelle.id}`,
        quelle.thema,
        quelle.bereich,
        quelle.frage,
        (quelle.stufe ?? 2) as Aufgabenstufe,
        interaktiv,
        quelle.factIds ?? [],
      ),
      learningGoal: quelle.erklaerung,
    },
    paramsHash: parameterHash(['zu', quelle.id]),
    interaktiv: { ...interaktiv },
    solutionSteps: [
      { label: 'Zuordnung', result: quelle.paare.map(([l, r]) => `${l} → ${r}`).join('; ') },
      { label: 'Begründung', result: quelle.begruendung },
    ],
    explanation: quelle.erklaerung,
  });
}

export function aufgabeReihenfolge(quelle: (typeof REIHENFOLGE_FRAGEN)[number]): Task {
  const interaktiv: InteraktiveLoesung = {
    format: 'reihenfolge',
    schritte: ohneNummerierung(quelle.schritte),
  };
  return baueTask({
    proposal: {
      ...basis(
        `re-${quelle.id}`,
        quelle.thema,
        quelle.bereich,
        quelle.frage,
        (quelle.stufe ?? 2) as Aufgabenstufe,
        interaktiv,
      ),
      learningGoal: quelle.erklaerung,
    },
    paramsHash: parameterHash(['re', quelle.id]),
    interaktiv: { ...interaktiv },
    solutionSteps: [
      {
        label: 'Richtige Reihenfolge',
        result: ohneNummerierung(quelle.schritte)
          .map((s, i) => `${i + 1}. ${s}`)
          .join(' · '),
      },
      { label: 'Begründung', result: quelle.begruendung },
    ],
    explanation: quelle.erklaerung,
  });
}

export function aufgabeLuecke(quelle: (typeof LUECK_FRAGEN)[number]): Task {
  const interaktiv: InteraktiveLoesung = {
    format: 'luecke',
    luecken: quelle.loesungen,
  };
  return baueTask({
    proposal: {
      ...basis(
        `lu-${quelle.id}`,
        quelle.thema,
        quelle.bereich,
        quelle.text,
        (quelle.stufe ?? 1) as Aufgabenstufe,
        interaktiv,
        quelle.factIds ?? [],
      ),
      learningGoal: quelle.erklaerung,
    },
    paramsHash: parameterHash(['lu', quelle.id]),
    interaktiv: { ...interaktiv },
    solutionSteps: [
      {
        label: 'Lösung',
        result: quelle.loesungen.map((l) => l.loesung).join(' · '),
      },
      { label: 'Begründung', result: quelle.begruendung },
    ],
    explanation: quelle.erklaerung,
  });
}

/** Alle kuratierten interaktiven Aufgaben – einzeln abgesichert. */
export function interaktiveAufgaben(): Task[] {
  return [
    ...sammleSicher(
      'wf',
      WF_FRAGEN.map((f) => ({ id: f.id, erzeuge: () => aufgabeWahrFalsch(f) })),
    ),
    ...sammleSicher(
      'zu',
      ZUORD_FRAGEN.map((f) => ({ id: f.id, erzeuge: () => aufgabeZuordnung(f) })),
    ),
    ...sammleSicher(
      're',
      REIHENFOLGE_FRAGEN.map((f) => ({ id: f.id, erzeuge: () => aufgabeReihenfolge(f) })),
    ),
    ...sammleSicher(
      'lu',
      LUECK_FRAGEN.map((f) => ({ id: f.id, erzeuge: () => aufgabeLuecke(f) })),
    ),
  ];
}
