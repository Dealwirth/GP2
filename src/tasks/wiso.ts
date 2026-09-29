import type { ExamArea, Task, TaskOption } from '../domain/types.ts';
import { WISO_FRAGEN, type WisoFrage } from '../content/curriculum/wiso.ts';
import { baueTask, parameterHash } from '../validation/pipeline.ts';
import { sammleSicher } from './robust.ts';
import type { Aufgabenstufe } from '../domain/types.ts';

/**
 * Aufgaben aus dem geprüften Wirtschafts- und Sozialkunde-Bestand.
 *
 * Der Unterschied zu den Rechenaufgaben: Hier gibt es keinen Fakt, aus dem die
 * Antwort folgt. Die Richtigkeit steckt in der Frage selbst – deshalb ist der
 * Bestand kuratiert und jede Antwort hat eine eigene Begründung.
 *
 * Die Optionen werden deterministisch gemischt, damit die richtige Antwort
 * nicht immer an erster Stelle steht. Der Zufall kommt aus der Parameter-ID,
 * also aus der Frage selbst – gleiche Frage, gleiche Reihenfolge.
 *
 * Wichtig: Zugeordnet werden nur Themen des Wirtschafts- und Sozialkunde-
 * Bereichs. Verweise auf technische Themen bleiben im Bestand stehen, damit
 * der Bezug sichtbar ist, ohne die Bereichszuordnung zu brechen.
 */
function mische(frage: WisoFrage): { optionen: TaskOption[]; korrekt: string } {
  const korrekt = 'a';
  const falsch = [...frage.falsch];
  // Umsortierung, damit die korrekte Antwort nicht bei jeder Frage an erster
  // Stelle steht. Der Versatz ergibt sich aus der Frage-ID.
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

export function aufgabeWiso(frage: WisoFrage): Task {
  const { optionen, korrekt } = mische(frage);
  const topicIds = frage.topicIds.filter((id) => id.startsWith('wiso-'));
  if (topicIds.length === 0) {
    // Ohne diese Prüfung entstünde eine Aufgabe ohne Themenbezug, und jede
    // Antwort dazu liefe ins Leere statt in den Lernstand.
    throw new Error(
      `Wiso-Frage ${frage.id} hat kein Thema aus dem Wirtschafts- und Sozialkunde-Bereich.`,
    );
  }

  return baueTask({
    proposal: {
      proposalId: `wiso-${frage.id}`,
      format: 'mc',
      stufe: 2 as Aufgabenstufe,
      estimatedSeconds: 30,
      examArea: 'wiso' as ExamArea,
      topicIds,
      prompt: frage.frage,
      options: optionen,
      factRefs: [],
      learningGoal: 'Wirtschafts- und Sozialkunde praxisbezogen beantworten können.',
      origin: 'statisch',
    },
    paramsHash: parameterHash(['wiso', frage.id]),
    correctOptionId: korrekt,
    optionRationale: {
      [korrekt]: frage.begruendung,
      b: 'Diese Antwort trifft nicht zu – prüfe die Zuständigkeit und den Ablauf.',
      c: 'Diese Antwort trifft nicht zu – prüfe die Zuständigkeit und den Ablauf.',
    },
    solutionSteps: [
      {
        label: 'Sachverhalt klären',
        result: frage.frage,
      },
      {
        label: 'Richtige Zuordnung',
        result: frage.richtig,
      },
      {
        label: 'Begründung',
        result: frage.begruendung,
      },
    ],
    explanation: frage.erklaerung,
  });
}

export function wisoAufgaben(): Task[] {
  // Einzeln absichern – siehe `robust.ts`. Eine fehlerhafte Frage kostet
  // genau eine Aufgabe, nicht den ganzen Bestand.
  return sammleSicher(
    'wiso',
    WISO_FRAGEN.map((frage) => ({ id: frage.id, erzeuge: () => aufgabeWiso(frage) })),
  );
}
