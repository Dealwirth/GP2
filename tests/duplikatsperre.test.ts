import { describe, expect, it } from 'vitest';
import { baueTask, leereDuplikatspeicher, parameterHash } from '../src/validation/pipeline.ts';

/**
 * Regression zur Duplikatsperre.
 *
 * Der Fehler: Der Parameter-Hash einer erzeugten Aufgabe wurde schon beim Bestehen
 * der Prüfliste eingetragen – auch dann, wenn der Vorschlag anschließend an
 * der Zweitprüfung scheiterte. Er blockierte damit für den Rest der Sitzung
 * seine eigene Parameterkombination. Genau das ließ die Aufgabenerzeugung
 * „beim ersten Mal klappen und danach nicht mehr".
 */
function bausatz(hashTeil: string, zweitpruefung?: { bestanden: boolean; detail: string }) {
  return {
    proposal: {
      proposalId: `ki_${hashTeil}`,
      format: 'mc' as const,
      stufe: 2 as const,
      estimatedSeconds: 60,
      examArea: 'funktionsanalyse' as const,
      topicIds: ['schutzmasnahmen'],
      prompt: 'Wie groß ist die Spannung U₀ im 230/400-V-Netz?',
      options: [
        { id: 'a', text: '230 V' },
        { id: 'b', text: '400 V' },
        { id: 'c', text: '50 V' },
      ],
      factRefs: [
        { factId: 'u0-230', value: 230 },
        { factId: 'u0-400', value: 400 },
        { factId: 'u0-50', value: 50 },
      ],
      learningGoal: 'Netzform kennen.',
      origin: 'ki' as const,
    },
    paramsHash: parameterHash([hashTeil]),
    correctOptionId: 'a',
    explanation: '230 V',
    validierungsOptionen: {
      duplikatPruefen: true,
      ...(zweitpruefung ? { zweitpruefung } : {}),
    },
  };
}

describe('Duplikatsperre für erzeugte Aufgaben', () => {
  it('verwirft dieselbe Parameterkombination erst, wenn sie eine Aufgabe ergeben hat', () => {
    leereDuplikatspeicher();
    expect(baueTask(bausatz('a')).taskId).toBeTruthy();
    expect(() => baueTask(bausatz('a'))).toThrowError(/duplikat/);
    leereDuplikatspeicher();
  });

  it('gibt die Parameterkombination frei, wenn die Zweitprüfung beanstandet', () => {
    leereDuplikatspeicher();
    // Erster Versuch scheitert an der Zweitprüfung.
    expect(() =>
      baueTask(bausatz('b', { bestanden: false, detail: 'mehrdeutig' })),
    ).toThrowError(/zweitpruefung/);

    // Dieselbe Parameterkombination muss danach noch frei sein. Vor der
    // Reparatur war sie durch den gescheiterten Versuch verbraucht.
    const zweiter = baueTask(bausatz('b'));
    expect(zweiter.taskId).toBeTruthy();
    leereDuplikatspeicher();
  });
});
