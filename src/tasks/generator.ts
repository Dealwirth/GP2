import type { Task, TaskOption, TaskProposal } from '../domain/types.ts';
import { holeFakt } from '../content/facts/index.ts';
import { abschaltbedingung, strombelastbarkeit } from '../engine/calc/index.ts';
import { baueTask, parameterHash } from '../validation/pipeline.ts';
import type { Aufgabenstufe, ExamArea } from '../domain/types.ts';
import { wisoAufgaben } from './wiso.ts';
import { interaktiveAufgaben } from './interaktiv.ts';
import { fachAufgaben } from './fachaufgaben.ts';
import { fallAufgaben } from './fallaufgaben.ts';
import { ueberspringeFehlerhaft } from './robust.ts';

/**
 * Statische Aufgabenerzeugung aus der Faktenbasis.
 *
 * Diese Aufgaben entstehen vollständig auf dem Gerät. Sie sind der Beweis
 * dafür, dass die Plattform ohne Netz und ohne Schlüssel funktioniert – und
 * sie liefern die Referenzmenge für den gesamten Bestand.
 *
 * Jede Aufgabe durchläuft dieselbe Validierungspipeline.
 */

function zahl(wert: number, stellen = 2): string {
  return wert.toFixed(stellen).replace('.', ',');
}

/**
 * Erzeugt MC-Antwortmöglichkeiten und verteilt die richtige auf eine der drei
 * Positionen.
 *
 * Warum die Position variiert: Stünde die richtige Antwort immer an erster
 * Stelle, wäre die Aufgabe nach zwei Versuchen gelöst, ohne das Fach zu
 * berühren. Bei 81 festen Aufgaben mit derselben Position wäre genau das
 * passiert. Der Zufall wird bewusst nicht aus einer Reihenfolge abgeleitet –
 * sonst wäre die Position über die Aufgabe hinweg vorhersagbar.
 *
 * Die zurückgegebene `korrekt`-Kennung ist die der richtigen Option, nicht
 * immer „a". Alle Aufrufer richten sich danach.
 */
function baueOptionen(
  richtig: string,
  falsche: string[],
): { optionen: TaskOption[]; korrekt: string; falschIds: string[] } {
  const kennungen = ['a', 'b', 'c'];
  const position = Math.floor(Math.random() * kennungen.length);
  const falschIds: string[] = [];
  let naechsteFalsche = 0;
  const optionen: TaskOption[] = kennungen.map((id, i) => {
    if (i === position) return { id, text: richtig };
    falschIds.push(id);
    return { id, text: falsche[naechsteFalsche++] ?? '' };
  });
  return { optionen, korrekt: kennungen[position]!, falschIds };
}

/**
 * Ordnet die Begründungen den tatsächlichen Kennungen zu.
 *
 * Nötig, weil die richtige Antwort nicht mehr fest auf „a" liegt: Wer die
 * Begründungen wie früher mit festen Schlüsseln „b" und „c" angibt, schreibt
 * im Fall korrekt = „b" die richtige Begründung mit einer falschen überschrieben.
 */
function begruendungen(
  korrekt: string,
  richtigText: string,
  falschIds: string[],
  falschTexte: string[],
): Record<string, string> {
  const karte: Record<string, string> = { [korrekt]: richtigText };
  falschIds.forEach((id, i) => {
    karte[id] = falschTexte[i] ?? 'Dieser Wert passt nicht zum Rechenergebnis.';
  });
  return karte;
}

// ---------------------------------------------------------------------------
// Aufgaben aus der Abschaltbedingung (Stufe 4 – Rechnen)
// ---------------------------------------------------------------------------

export function aufgabeAbschaltbedingung(params: {
  u0FactId: string;
  idnFactId: string;
  examArea: ExamArea;
  topicIds: string[];
  idnStromA: number;
}): Task {
  const u0Fakt = holeFakt(params.u0FactId);
  const idnFakt = holeFakt(params.idnFactId);
  if (!u0Fakt?.wert || !idnFakt?.wert) {
    throw new Error('Für die Aufgabenbrauche wird ein Fakt mit Zahlenwert benötigt.');
  }

  const u0 = u0Fakt.wert;
  const ergebnis = abschaltbedingung({ u0, idnA: params.idnStromA });

  const { optionen, korrekt, falschIds } = baueOptionen(`${zahl(ergebnis.wert, 1)} Ω`, [
    `${zahl(u0 / (params.idnStromA * 10), 1)} Ω`,
    `${zahl(ergebnis.wert * 2, 1)} Ω`,
  ]);

  const proposal: TaskProposal = {
    proposalId: `abschalt-${u0}-${params.idnStromA}`,
    format: 'mc',
    stufe: 4 as Aufgabenstufe,
    estimatedSeconds: 180,
    examArea: params.examArea,
    topicIds: params.topicIds,
    prompt:
      `Wie groß darf der Wert von R_A höchstens sein, wenn U₀ = ${zahl(u0, 0)} V ` +
      `und I_Δn = ${zahl(idnFakt.wert * 1000, 0)} mA beträgt?`,
    options: optionen,
    factRefs: [
      { factId: params.u0FactId, value: u0 },
      { factId: params.idnFactId, value: idnFakt.wert },
      { factId: 'formel-abschaltbedingung' },
    ],
    learningGoal: 'Abschaltbedingung R_A ≤ U₀ / I_Δn sicher anwenden können.',
    hint: 'Erst den Strom in Ampere umrechnen, dann teilen.',
    origin: 'statisch',
  };

  return baueTask({
    proposal,
    paramsHash: parameterHash(['abschalt', u0, params.idnStromA]),
    correctOptionId: korrekt,
    optionRationale: begruendungen(
      korrekt,
      `R_A = ${zahl(u0, 0)} V / ${zahl(params.idnStromA, 2)} A = ${zahl(ergebnis.wert, 1)} Ω.`,
      falschIds,
      [
        'Hier wurde der Fehlerstrom um einen Faktor 10 falsch angesetzt.',
        'Das ist der doppelte Wert – U₀ wurde verdoppelt.',
      ],
    ),
    solutionSteps: ergebnis.steps,
    explanation:
      `R_A ≤ U₀ / I_Δn = ${zahl(u0, 0)} / ${zahl(params.idnStromA, 2)} = ${zahl(ergebnis.wert, 1)} Ω.`,
  });
}

// ---------------------------------------------------------------------------
// Aufgaben zur Strombelastbarkeit (Stufe 1/2 – schnelle Fragen)
// ---------------------------------------------------------------------------

export function aufgabeStrombelastbarkeit(params: {
  querschnittMm2: number;
  weg: 'referenz-iz' | 'schultabelle';
  examArea: ExamArea;
  topicIds: string[];
}): Task {
  const ergebnis = strombelastbarkeit({
    querschnittMm2: params.querschnittMm2,
    weg: params.weg,
  });

  const richtigeZahl = ergebnis.wert;
  const falsch = [richtigeZahl * 0.5, richtigeZahl * 1.5].map((w) => `${zahl(w, 0)} A`);

  const { optionen, korrekt, falschIds } = baueOptionen(`${zahl(richtigeZahl, 0)} A`, falsch);

  const quelle = params.weg === 'referenz-iz' ? 'iz-tabelle-verlegeart-c' : 'absicherung-schultabelle';
  const factRefs: TaskProposal['factRefs'] =
    params.weg === 'referenz-iz'
      ? [{ factId: quelle }, { factId: 'iz-temperatur-bezug' }]
      : [{ factId: quelle }];

  const proposal: TaskProposal = {
    proposalId: `iz-${params.querschnittMm2}-${params.weg}`,
    format: 'mc',
    stufe: 1 as Aufgabenstufe,
    estimatedSeconds: 25,
    examArea: params.examArea,
    topicIds: params.topicIds,
    prompt:
      `Welcher Strom darf eine Leitung mit ${zahl(params.querschnittMm2, 1)} mm² ` +
      `dauerhaft führen (${params.weg === 'referenz-iz' ? 'Verlegeart C, 30 °C' : 'Schultabelle'})?`,
    options: optionen,
    factRefs,
    learningGoal:
      'Strombelastbarkeit dem Querschnitt zuordnen und die beiden Rechenwege unterscheiden.',
    origin: 'statisch',
  };

  return baueTask({
    proposal,
    paramsHash: parameterHash(['iz', params.querschnittMm2, params.weg]),
    correctOptionId: korrekt,
    optionRationale: begruendungen(
      korrekt,
      `${zahl(richtigeZahl, 0)} A ist der hinterlegte Wert für diesen Querschnitt.`,
      falschIds,
      [
        'Das ist zu niedrig – der Wert gehört zu einem kleineren Querschnitt.',
        'Das ist zu hoch – der Wert gehört zu einem größeren Querschnitt.',
      ],
    ),
    solutionSteps: ergebnis.steps,
    explanation: `${zahl(params.querschnittMm2, 1)} mm² → ${zahl(richtigeZahl, 0)} A.`,
  });
}

// ---------------------------------------------------------------------------
// Aufgaben zu Kennwerten aus der Faktenbasis (Stufe 2)
// ---------------------------------------------------------------------------

export function aufgabeFaktwert(params: {
  factId: string;
  frage: string;
  einheitenAntwort: string;
  examArea: ExamArea;
  topicIds: string[];
  stufe?: Aufgabenstufe;
}): Task {
  const fakt = holeFakt(params.factId);
  if (!fakt) throw new Error(`Fakt ${params.factId} existiert nicht.`);
  if (fakt.wert === undefined) {
    throw new Error(`Fakt ${params.factId} hat keinen Zahlenwert und eignet sich nicht.`);
  }

  const richtig = `${zahl(fakt.wert, 2)} ${params.einheitenAntwort}`.trim();
  const { optionen, korrekt, falschIds } = baueOptionen(richtig, [
    `${zahl(fakt.wert * 2, 2)} ${params.einheitenAntwort}`.trim(),
    `${zahl(fakt.wert / 2, 2)} ${params.einheitenAntwort}`.trim(),
  ]);

  const proposal: TaskProposal = {
    proposalId: `fakt-${params.factId}`,
    format: 'mc',
    stufe: params.stufe ?? (1 as Aufgabenstufe),
    estimatedSeconds: 25,
    examArea: params.examArea,
    topicIds: params.topicIds,
    prompt: params.frage,
    options: optionen,
    factRefs: [{ factId: params.factId, value: fakt.wert }],
    learningGoal: `${fakt.bezeichnung} sicher beantworten.`,
    origin: 'statisch',
  };

  return baueTask({
    proposal,
    paramsHash: parameterHash(['fakt', params.factId, params.frage]),
    correctOptionId: korrekt,
    optionRationale: begruendungen(
      korrekt,
      `${fakt.bezeichnung}: ${fakt.bemerkung ?? richtig}`,
      falschIds,
      ['Doppelt so groß.', 'Halb so groß.'],
    ),
    solutionSteps: [
      {
        label: 'Wert aus der Faktenbasis',
        substitution: params.frage,
        result: richtig,
        factId: params.factId,
      },
    ],
    explanation: richtig,
  });
}

/**
 * Liefert den festen Aufgabenvorrat, mit dem die App startet.
 *
 * Vier Quellen, weil vier Arten von Wissen unterschiedlich abgesichert sind:
 *   - Rechen- und Kennwerte aus der Faktenbasis (`technischeGrundaufgaben`)
 *   - Fachwissen der übrigen Bereiche, kuratierter Bestand (`fachaufgaben.ts`)
 *   - Fall- und offene Aufgaben der schriftlichen Prüfung (`fallaufgaben.ts`)
 *   - Wirtschafts- und Sozialkunde, kuratierter Bestand (`wiso.ts`)
 */
export function statischeGrundaufgaben(): Task[] {
  // Letzte Netzstufe: Sollte eine ganze Sammlung ausfallen, bleiben die übrigen
  // erhalten. Die App zeigt dann weniger Aufgaben, aber nie eine leere Seite.
  const aufgaben: Task[] = [];
  const quellen: { name: string; liefere: () => Task[] }[] = [
    { name: 'technisch', liefere: technischeGrundaufgaben },
    { name: 'fach', liefere: fachAufgaben },
    { name: 'fall', liefere: fallAufgaben },
    { name: 'wiso', liefere: wisoAufgaben },
    { name: 'interaktiv', liefere: interaktiveAufgaben },
  ];
  for (const quelle of quellen) {
    const teil = ueberspringeFehlerhaft(quelle.name, 'sammlung', quelle.liefere);
    if (teil) aufgaben.push(...teil);
  }
  return aufgaben;
}

function technischeGrundaufgaben(): Task[] {
  return [
    aufgabeAbschaltbedingung({
      u0FactId: 'u0-230',
      idnFactId: 'idn-feuchteraum',
      idnStromA: 0.3,
      examArea: 'funktionsanalyse',
      topicIds: ['fsa-schutzbewertung-02', 'fsa-schutzbewertung-01'],
    }),
    aufgabeAbschaltbedingung({
      u0FactId: 'u0-50',
      idnFactId: 'idn-feuchteraum',
      idnStromA: 0.3,
      examArea: 'funktionsanalyse',
      topicIds: ['fsa-schutzbewertung-02'],
    }),
    aufgabeStrombelastbarkeit({
      querschnittMm2: 2.5,
      weg: 'referenz-iz',
      examArea: 'kundenauftrag',
      topicIds: ['ka-verteilung-04'],
    }),
    aufgabeStrombelastbarkeit({
      querschnittMm2: 4,
      weg: 'referenz-iz',
      examArea: 'kundenauftrag',
      topicIds: ['ka-verteilung-04'],
    }),
    aufgabeStrombelastbarkeit({
      querschnittMm2: 1.5,
      weg: 'schultabelle',
      examArea: 'systementwurf',
      topicIds: ['sys-spezifikation-03', 'sys-schutz-03'],
    }),
    aufgabeFaktwert({
      factId: 'idn-personenschutz',
      frage: 'Welchen Bemessungsfehlerstrom I_Δn hat ein RCD für den zusätzlichen Personenschutz?',
      einheitenAntwort: 'A',
      examArea: 'kundenauftrag',
      topicIds: ['ka-verteilung-05'],
    }),
    aufgabeFaktwert({
      factId: 'idn-feuchteraum',
      frage:
        'Welchen Bemessungsfehlerstrom I_Δn sieht die Norm für Feuchträume vor, ' +
        'in denen kein zusätzlicher Personenschutz gefordert ist?',
      einheitenAntwort: 'A',
      examArea: 'funktionsanalyse',
      topicIds: ['fsa-schutzbewertung-01'],
    }),
    aufgabeFaktwert({
      factId: 'abschaltzeit-0-3s',
      frage: 'Welche Auslösezeit ist bei I_Δn = 300 mA für den Anlagenteil zulässig?',
      einheitenAntwort: 's',
      examArea: 'funktionsanalyse',
      topicIds: ['fsa-schutzbewertung-02'],
    }),
    aufgabeFaktwert({
      factId: 'ls-kennlinie-c-magnetisch-min',
      frage: 'Ab welchem Vielfachen von I_n löst ein Leitungsschutzschalter der Kennlinie C magnetisch aus?',
      einheitenAntwort: '× I_n',
      examArea: 'systementwurf',
      topicIds: ['sys-spezifikation-03'],
    }),
    aufgabeFaktwert({
      factId: 'riso-grenzwert',
      frage: 'Welcher Mindestwert für den Isolationswiderstand gilt bei 500 V Prüfspannung?',
      einheitenAntwort: 'MΩ',
      examArea: 'kundenauftrag',
      topicIds: ['ka-messen-04'],
    }),
    aufgabeFaktwert({
      factId: 'rcd-typ-a',
      frage:
        'Für welchen Bemessungsfehlerstrom ist ein Fehlerstromschutz Typ A ' +
        'in der Faktenbasis hinterlegt?',
      einheitenAntwort: 'A',
      examArea: 'systementwurf',
      topicIds: ['sys-schutz-03'],
    }),
  ];
}
