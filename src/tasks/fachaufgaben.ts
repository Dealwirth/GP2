import type { Task, TaskOption } from '../domain/types.ts';
import { FACHFRAGEN, type FachFrage } from '../content/curriculum/fachfragen.ts';
import { baueTask, parameterHash } from '../validation/pipeline.ts';
import { sammleSicher } from './robust.ts';
import type { Aufgabenstufe } from '../domain/types.ts';

/**
 * Aufgaben aus dem geprüften Fachwissen-Bestand.
 *
 * Gleiches Prinzip wie beim Wirtschafts- und Sozialkunde-Bestand: Die Richtigkeit
 * steckt in der Frage, nicht in einem berechenbaren Fakt. Deshalb ist der
 * Bestand kuratiert, und jede falsche Option bildet einen echten Irrtum ab.
 */
function mische(frage: FachFrage): { optionen: TaskOption[]; korrekt: string } {
  const korrekt = 'a';
  const falsch = [...frage.falsch];
  const versatz = [...frage.id].reduce((s, c) => s + c.charCodeAt(0), 0) % 3;
  const gedreht = [...falsch.slice(versatz), ...falsch.slice(0, versatz)];

  return {
    optionen: [
      { id: korrekt, text: frage.richtig },
      { id: 'b', text: gedreht[0]! },
      { id: 'c', text: gedreht[1]! },
    ],
    korrekt,
  };
}

export function aufgabeFachwissen(frage: FachFrage): Task {
  const { optionen, korrekt } = mische(frage);
  if (frage.topicIds.length === 0) {
    throw new Error(`Fachfrage ${frage.id} ist keinem Thema zugeordnet.`);
  }

  return baueTask({
    proposal: {
      proposalId: `fach-${frage.id}`,
      format: 'mc',
      stufe: (frage.bereich === 'kundenauftrag' ? 3 : 2) as Aufgabenstufe,
      estimatedSeconds: frage.bereich === 'kundenauftrag' ? 45 : 30,
      examArea: frage.bereich,
      topicIds: [...frage.topicIds],
      prompt: frage.frage,
      options: optionen,
      factRefs: [],
      learningGoal: frage.erklaerung,
      hint: `Bezug: ${frage.verweis}`,
      origin: 'statisch',
    },
    paramsHash: parameterHash(['fach', frage.id]),
    correctOptionId: korrekt,
    optionRationale: {
      [korrekt]: frage.begruendung,
      b: 'Diese Antwort beschreibt einen verbreiteten Irrtum, trifft aber nicht zu.',
      c: 'Diese Antwort beschreibt einen verbreiteten Irrtum, trifft aber nicht zu.',
    },
    solutionSteps: [
      { label: 'Sachverhalt', result: frage.frage },
      { label: 'Zutreffend ist', result: frage.richtig },
      { label: 'Begründung', result: frage.begruendung },
    ],
    explanation: frage.erklaerung,
  });
}

export function fachAufgaben(): Task[] {
  // Einzeln absichern: Eine fehlerhafte Frage darf nicht den ganzen Bestand
  // mitnehmen. Der Grund landet in der Fehlerliste und wird im Test geprüft.
  return sammleSicher(
    'fach',
    FACHFRAGEN.map((frage) => ({ id: frage.id, erzeuge: () => aufgabeFachwissen(frage) })),
  );
}
