import { describe, expect, it } from 'vitest';
import { statischeGrundaufgaben, aufgabeFaktwert, aufgabeAbschaltbedingung, aufgabeStrombelastbarkeit } from '../src/tasks/generator.ts';
import { leereDuplikatspeicher } from '../src/validation/pipeline.ts';
import { ATOME, holeAtom } from '../src/content/curriculum/index.ts';
import { PRUEFUNGSBEREICHE } from '../src/content/syllabus/exam.ts';
import type { ExamArea } from '../src/domain/types.ts';

/**
 * Invarianten des Aufgabenvorrats.
 *
 * Diese Tests schützen vor genau dem Fehler, der lange unbemerkt blieb:
 * Aufgaben mit freien Themenbezeichnern, die zu keinem Atom des Lernpfads
 * gehören. Dadurch hätte jede Antwort außerhalb des Lernpfads gelandet und der
 * Fortschritt wäre nie gewachsen.
 */
describe('Aufgabenvorrat', () => {
  const aufgaben = statischeGrundaufgaben();

  it('erzeugt überhaupt Aufgaben', () => {
    expect(aufgaben.length).toBeGreaterThanOrEqual(10);
  });

  it('verweist bei jedem Thema auf ein reales Atom', () => {
    for (const task of aufgaben) {
      for (const topicId of task.proposal.topicIds) {
        expect(
          holeAtom(topicId),
          `Thema „${topicId}" der Aufgabe ${task.taskId} existiert nicht im Lernpfad`,
        ).toBeDefined();
      }
    }
  });

  it('hält den Prüfungsbereich des Themas und der Aufgabe gleich', () => {
    for (const task of aufgaben) {
      for (const topicId of task.proposal.topicIds) {
        const atom = holeAtom(topicId)!;
        expect(
          atom.bereich,
          `Thema „${atom.titel}" liegt in ${atom.bereich}, die Aufgabe aber in ${task.proposal.examArea}`,
        ).toBe(task.proposal.examArea);
      }
    }
  });

  it('deckt alle vier Bereiche von Teil 2 ab', () => {
    const bereiche = new Set(aufgaben.map((t) => t.proposal.examArea));
    for (const bereich of ['kundenauftrag', 'systementwurf', 'funktionsanalyse', 'wiso'] as ExamArea[]) {
      expect(bereiche, `Keine Aufgabe für ${PRUEFUNGSBEREICHE[bereich].label}`).toContain(bereich);
    }
  });

  it('gibt jeder Aufgabe eine eindeutige Kennung', () => {
    const ids = aufgaben.map((t) => t.taskId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gibt jeder Aufgabe eine dem Format entsprechende Lösung', () => {
    // Nicht jede Aufgabe ist Multiple Choice. Die Prüfung kennt drei
    // Antwortformate, und jedes wird anders bewertet:
    //   mc                     → genau eine richtige Option
    //   offen / strukturiert   → Pflichtbegriffe, kein Optionsschlüssel
    for (const task of aufgaben) {
      const format = task.proposal.format;
      if (task.proposal.options && task.proposal.options.length > 0) {
        expect(task.proposal.options.length, task.taskId).toBeGreaterThanOrEqual(2);
        expect(task.correctOptionId, task.taskId).toBeDefined();
        expect(
          task.proposal.options.some((o) => o.id === task.correctOptionId),
          `${task.taskId}: correctOptionId zeigt auf keine Option`,
        ).toBe(true);
      } else {
        // Ohne Optionen muss die Bewertung über Begriffe möglich sein.
        expect(format === 'offen' || format === 'strukturiert', task.taskId).toBe(true);
        expect(
          (task.proposal.expectedKeywords?.length ?? 0),
          `${task.taskId}: offene Aufgabe ohne Pflichtbegriffe`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('deckt alle drei Antwortformate der Prüfung ab', () => {
    const formate = new Set(aufgaben.map((t) => t.proposal.format));
    expect(formate).toContain('mc');
    expect(formate).toContain('fall');
    expect(formate).toContain('strukturiert');
  });

  it('liefert zu jeder Aufgabe eine Erklärung und einen Lernweg', () => {
    for (const task of aufgaben) {
      expect(task.explanation.length).toBeGreaterThan(0);
      expect(task.solutionSteps.length).toBeGreaterThan(0);
      expect(task.approved).toBe(true);
    }
  });
});

describe('Aufgabenerzeuger im Einzelnen', () => {
  it('lehnt eine Aufgabe ab, deren Fakt keinen Zahlenwert hat', () => {
    expect(() =>
      aufgabeFaktwert({
        factId: 'formel-abschaltbedingung',
        frage: 'Welche Formel gilt?',
        einheitenAntwort: '',
        examArea: 'funktionsanalyse',
        topicIds: ['fsa-schutzbewertung-02'],
      }),
    ).toThrow();
  });

  it('lehnt einen unbekannten Fakt ab', () => {
    expect(() =>
      aufgabeFaktwert({
        factId: 'gibt-es-nicht',
        frage: 'Welche Zahl?',
        einheitenAntwort: 'A',
        examArea: 'wiso',
        topicIds: ['wiso-recht-01'],
      }),
    ).toThrow();
  });

  it('rechnet die Abschaltbedingung nachvollziehbar', () => {
    const task = aufgabeAbschaltbedingung({
      u0FactId: 'u0-230',
      idnFactId: 'idn-personenschutz',
      idnStromA: 0.03,
      examArea: 'funktionsanalyse',
      topicIds: ['fsa-schutzbewertung-02'],
    });
    // 230 V / 0,03 A = 7666,7 Ω
    const schritt = task.solutionSteps[task.solutionSteps.length - 1]!;
    expect(schritt.result).toContain('7666.7');
  });

  it('rechnet die Strombelastbarkeit für beide Wege getrennt', () => {
    leereDuplikatspeicher();
    const referenz = aufgabeStrombelastbarkeit({
      querschnittMm2: 2.5,
      weg: 'referenz-iz',
      examArea: 'kundenauftrag',
      topicIds: ['ka-verteilung-04'],
    });
    const schule = aufgabeStrombelastbarkeit({
      querschnittMm2: 2.5,
      weg: 'schultabelle',
      examArea: 'kundenauftrag',
      topicIds: ['ka-verteilung-04'],
    });
    const text = (t: typeof referenz) => t.solutionSteps.map((s) => s.result).join(' ');
    // Die beiden Wege dürfen nicht dasselbe Ergebnis liefern – sonst wären sie
    // nicht zwei Wege, sondern einer.
    expect(text(referenz)).not.toBe(text(schule));
  });
});

describe('Lernpfad und Aufgaben sind verbunden', () => {
  it('erlaubt keinem Aufgabenthema eine falsche Bereichszuordnung', () => {
    leereDuplikatspeicher();
    const bereicheJeAtom = new Map(ATOME.map((a) => [a.id, a.bereich]));
    for (const task of statischeGrundaufgaben()) {
      for (const topicId of task.proposal.topicIds) {
        expect(bereicheJeAtom.get(topicId)).toBe(task.proposal.examArea);
      }
    }
  });
});
