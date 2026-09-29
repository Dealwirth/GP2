import { beforeEach, describe, expect, it } from 'vitest';
import type { TaskProposal } from '../src/domain/types.ts';
import {
  baueTask,
  leereDuplikatspeicher,
  parameterHash,
  pruefeFaktenbindung,
  validiere,
} from '../src/validation/pipeline.ts';
import { statischeGrundaufgaben } from '../src/tasks/generator.ts';
import { leereFehlerliste, sammlungfehler } from '../src/tasks/robust.ts';

const guterVorschlag: TaskProposal = {
  proposalId: 'p1',
  format: 'mc',
  stufe: 1,
  estimatedSeconds: 25,
  examArea: 'funktionsanalyse',
  topicIds: ['schutzmasnahmen'],
  prompt: 'Wie groß muss U₀ bei 300 mA sein, damit R_A = 166,7 Ω gilt?',
  options: [
    { id: 'a', text: '50 V' },
    { id: 'b', text: '230 V' },
  ],
  factRefs: [
    { factId: 'u0-50', value: 50 },
    { factId: 'u0-230', value: 230 },
    { factId: 'idn-feuchteraum', value: 0.3 },
    { factId: 're-grenzwert', value: 166.7 },
  ],
  learningGoal: 'Abschaltbedingung lesen.',
  origin: 'ki',
};

describe('Faktenbindung', () => {
  it('akzeptiert eine Aufgabe, deren Zahlen an zitierte Fakten hängen', () => {
    const c = pruefeFaktenbindung(guterVorschlag);
    expect(c.passed).toBe(true);
  });

  it('weist eine erfundene Zahl zurück', () => {
    const erfunden: TaskProposal = {
      ...guterVorschlag,
      prompt: 'Wie groß muss U₀ bei 300 mA sein, damit R_A = 137,4 Ω gilt?',
      options: [
        { id: 'a', text: '50 V' },
        { id: 'b', text: '137,4 V' },
      ],
    };
    const c = pruefeFaktenbindung(erfunden);
    expect(c.passed).toBe(false);
    expect(c.detail).toContain('137.4');
  });

  it('erkennt auch mA-Darstellung eines Ampere-Werts als gebunden', () => {
    const inMilliampere: TaskProposal = {
      ...guterVorschlag,
      prompt: 'Welcher Fehlerstrom gehört zu 0,3 A?',
      options: [
        { id: 'a', text: '300 mA' },
        { id: 'b', text: '30 mA' },
      ],
    };
    const c = pruefeFaktenbindung(inMilliampere, ['0.3']);
    expect(c.passed).toBe(true);
  });

  it('akzeptiert Werte, die die Rechen-Engine erzeugt hat', () => {
    const berechnet = pruefeFaktenbindung(
      {
        ...guterVorschlag,
        prompt: 'Wie groß ist das Ergebnis?',
        options: [
          { id: 'a', text: '123,4 Ω' },
          { id: 'b', text: '230 V' },
        ],
      },
      ['123.4', '230'],
    );
    expect(berechnet.passed).toBe(true);
  });
});

describe('Validierung', () => {
  beforeEach(() => leereDuplikatspeicher());

  it('lässt einen guten Vorschlag durch', () => {
    const { bestanden } = validiere(guterVorschlag, parameterHash(['x1']));
    expect(bestanden).toBe(true);
  });

  it('weist doppelt erzeugte Parameter ab', () => {
    const hash = parameterHash(['doppelt']);
    expect(validiere(guterVorschlag, hash).bestanden).toBe(true);
    const zweite = validiere(guterVorschlag, hash);
    expect(zweite.bestanden).toBe(false);
    const dup = zweite.record.checks.find((c) => c.id === 'duplikat');
    expect(dup?.passed).toBe(false);
  });

  it('erlaubt keine Aufgabe ohne gültigen Faktenbezug', () => {
    const ohneFakten: TaskProposal = { ...guterVorschlag, factRefs: [] };
    const { bestanden } = validiere(ohneFakten, parameterHash(['ohne']));
    expect(bestanden).toBe(false);
  });

  it('protokolliert eine fehlgeschlagene Zweitprüfung', () => {
    const { record, bestanden } = validiere(guterVorschlag, parameterHash(['zp']), {
      zweitpruefung: { bestanden: false, detail: 'Distractor zu ähnlich' },
    });
    expect(bestanden).toBe(false);
    expect(record.checks.find((c) => c.id === 'zweitpruefung')?.detail).toBe(
      'Distractor zu ähnlich',
    );
  });

  it('lehnt Faktbezüge ab, die es nicht gibt', () => {
    const falsch: TaskProposal = {
      ...guterVorschlag,
      factRefs: [{ factId: 'erfunden-xyz' }],
    };
    const { bestanden, record } = validiere(falsch, parameterHash(['f']));
    expect(bestanden).toBe(false);
    expect(record.checks.find((c) => c.id === 'gueltiger-zeitraum')?.passed).toBe(false);
  });
});

describe('baueTask', () => {
  beforeEach(() => leereDuplikatspeicher());

  it('wirft bei fehlgeschlagener Validierung – es gibt keinen Weg daran vorbei', () => {
    const ohneFakten: TaskProposal = { ...guterVorschlag, factRefs: [] };
    expect(() =>
      baueTask({
        proposal: ohneFakten,
        paramsHash: parameterHash(['w1']),
        explanation: 'x',
      }),
    ).toThrow(/Validierung fehlgeschlagen/);
  });

  it('hängt Versionsstände an jede Aufgabe', () => {
    const task = baueTask({
      proposal: guterVorschlag,
      paramsHash: parameterHash(['w2']),
      correctOptionId: 'a',
      explanation: 'Richtig ist 50 V.',
    });
    expect(task.factVersion).toBe('1.0');
    expect(task.engineVersion).toBe('1.0.0');
    expect(task.validation.checks.every((c) => c.passed)).toBe(true);
    expect(task.approved).toBe(true);
  });
});

describe('Statische Grundaufgaben', () => {
  it('erzeugt Aufgaben ganz ohne KI', () => {
    leereDuplikatspeicher();
    const aufgaben = statischeGrundaufgaben();
    expect(aufgaben.length).toBeGreaterThan(4);
    for (const a of aufgaben) {
      expect(a.proposal.origin).toBe('statisch');
      expect(a.validation.checks.every((c) => c.passed)).toBe(true);
      expect(a.approved).toBe(true);
      expect(a.solutionSteps.length).toBeGreaterThan(0);
      // Multiple Choice braucht einen Schlüssel, offene Formate brauchen
      // stattdessen Pflichtbegriffe. Beides muss belegt sein – aber nie beides.
      if (a.proposal.options && a.proposal.options.length > 0) {
        expect(a.correctOptionId).toBeDefined();
      } else {
        expect(a.proposal.expectedKeywords?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('lässt einen einzigen fehlerhaften Datensatz nicht den Vorrat kosten', () => {
    // Genau dieser Fall hat die Seite einmal schwarz werden lassen: eine
    // kuratierte Aufgabe, deren Quellenangabe die Faktenbindung nicht bestand.
    // Jetzt wird der Datensatz übersprungen und der Grund festgehalten.
    leereDuplikatspeicher();
    leereFehlerliste();
    const aufgaben = statischeGrundaufgaben();
    expect(aufgaben.length).toBeGreaterThan(0);
    expect(
      sammlungfehler().map((f) => `${f.quelle}/${f.id}: ${f.grund}`),
    ).toEqual([]);
  });

  it('rechnet die Abschaltbedingung korrekt aus', () => {
    leereDuplikatspeicher();
    const [erste] = statischeGrundaufgaben();
    expect(erste?.proposal.prompt).toContain('230 V');
    expect(erste?.correctOptionId).toBe('a');
    expect(erste?.optionRationale?.a).toContain('766,7');
  });

  it('baut den festen Vorrat beliebig oft neu auf', () => {
    leereDuplikatspeicher();
    // Der Vorrat ist deterministisch und wird bei jedem Sitzungsstart neu
    // gebaut. Wäre er von der Duplikatsperre betroffen, wäre ab der zweiten
    // Sitzung im selben Browserfenster keine einzige Aufgabe mehr verfügbar.
    const einmal = statischeGrundaufgaben();
    const zweimal = statischeGrundaufgaben();
    expect(zweimal.length).toBe(einmal.length);
    expect(zweimal.map((t) => t.taskId)).toEqual(einmal.map((t) => t.taskId));
  });

  it('hält KI-Aufgaben weiterhin gegen Duplikate ab', () => {
    leereDuplikatspeicher();
    const vorschlag = guterVorschlag;
    const hash = parameterHash(['ki-test']);
    expect(validiere(vorschlag, hash, { duplikatPruefen: true }).bestanden).toBe(true);
    // Zweiter Versuch mit derselben Parameterkombination: jetzt abgelehnt.
    const zweiter = validiere(vorschlag, hash, { duplikatPruefen: true });
    expect(zweiter.bestanden).toBe(false);
    expect(zweiter.record.checks.find((c) => c.id === 'duplikat')?.passed).toBe(false);
    leereDuplikatspeicher();
  });
});
