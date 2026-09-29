import type { ExamArea, Task } from '../../domain/types.ts';
import { PRUEFUNGSBEREICHE, TEIL2_BEREICHE } from '../../content/syllabus/exam.ts';
import { bewerteNachParagraf15, punkteZuNote, type BestehensUrteil } from '../../content/syllabus/exam.ts';
import { abdeckung, atomeVonBereich, reife, schwacheThemen } from '../../content/curriculum/index.ts';
import type { TopicStateRecord } from '../../domain/types.ts';

/**
 * Prüfungssimulation.
 *
 * Zwei Ziele gleichzeitig: den echten Prüfungseindruck erzeugen und eine
 * belastbare Prognose liefern. Der Prüfungsmodus schaltet die KI ab – keine
 * Hinweise, keine Sofortlösung, Auswertung erst nach Abgabe.
 */

export interface PruefungDefinition {
  id: string;
  bereich: ExamArea;
  titel: string;
  /** Prüfungszeit in Minuten laut Verordnung. */
  minuten: number;
  /** Aufgabenzahl in der Simulation. */
  aufgabenAnzahl: number;
  /** Punkte je Aufgabe. */
  punkteJeAufgabe: number;
}

export const PRUEFUNGEN: PruefungDefinition[] = [
  {
    id: 'systementwurf',
    bereich: 'systementwurf',
    titel: 'Systementwurf',
    minuten: PRUEFUNGSBEREICHE.systementwurf.minutes,
    aufgabenAnzahl: 12,
    punkteJeAufgabe: 1,
  },
  {
    id: 'funktionsanalyse',
    bereich: 'funktionsanalyse',
    titel: 'Funktions- und Systemanalyse',
    minuten: PRUEFUNGSBEREICHE.funktionsanalyse.minutes,
    aufgabenAnzahl: 12,
    punkteJeAufgabe: 1,
  },
  {
    id: 'wiso',
    bereich: 'wiso',
    titel: 'Wirtschafts- und Sozialkunde',
    minuten: PRUEFUNGSBEREICHE.wiso.minutes,
    aufgabenAnzahl: 18,
    punkteJeAufgabe: 1,
  },
];

/** Punkteverteilung einer abgeschlossenen Simulation. */
export interface Pruefungsergebnis {
  pruefungId: string;
  bereich: ExamArea;
  richtig: number;
  gesamt: number;
  punkte: number;
  maxPunkte: number;
  quote: number;
  note: number;
  dauerSekunden: number;
  imZeitbudget: boolean;
  beendetAm: string;
  /** Thema je Aufgabe, für die Fehleranalyse. */
  schwacheThemenIds: string[];
}

export function wertePruefung(params: {
  pruefung: PruefungDefinition;
  richtig: number;
  gesamt: number;
  dauerSekunden: number;
  themenIds: string[];
  falscheThemenIds: string[];
}): Pruefungsergebnis {
  const maxPunkte = params.gesamt * params.pruefung.punkteJeAufgabe;
  const punkte = params.richtig * params.pruefung.punkteJeAufgabe;
  const quote = params.gesamt > 0 ? (punkte / maxPunkte) * 100 : 0;
  return {
    pruefungId: params.pruefung.id,
    bereich: params.pruefung.bereich,
    richtig: params.richtig,
    gesamt: params.gesamt,
    punkte,
    maxPunkte,
    quote,
    note: punkteZuNote(quote),
    dauerSekunden: params.dauerSekunden,
    imZeitbudget: params.dauerSekunden <= params.pruefung.minuten * 60,
    beendetAm: new Date().toISOString(),
    schwacheThemenIds: params.falscheThemenIds,
  };
}

export interface Prognose {
  noten: Record<ExamArea, number>;
  gesamtNote: number;
  teil2Note: number;
  urteil: BestehensUrteil;
  reife: Record<ExamArea, number>;
  abgedeckt: Record<ExamArea, number>;
  /** Offene Lücken, gewichtet nach Prüfungsbedeutung. */
  dringendsteLuecken: { atomId: string; titel: string; bereich: ExamArea; reifegrad: number }[];
  hinweis: string;
}

const ALLE_BEREICHE: ExamArea[] = [...TEIL2_BEREICHE, 'teil1'];

/**
 * Reife-Prognose aus dem Lernstand.
 *
 * Bewusst vorsichtig formuliert: Das ist eine Hochrechnung aus bisherigen
 * Leistungen, keine Zusage. Ohne echte Simulation bleibt der Wert unsicher –
 * das wird im Text auch so gesagt.
 */
export function berechnePrognose(
  zustaende: Map<string, TopicStateRecord>,
  letzteErgebnisse: Pruefungsergebnis[] = [],
): Prognose {
  const reifeWerte = {} as Record<ExamArea, number>;
  const deckung = {} as Record<ExamArea, number>;

  for (const bereich of ALLE_BEREICHE) {
    const r = reife(zustaende, bereich);
    const abged = abdeckung(zustaende, bereich);
    reifeWerte[bereich] = r;
    deckung[bereich] = abged.quote;
  }

  // Wo eine echte Simulation vorliegt, hat sie Vorrang vor der Hochrechnung.
  const noten = {} as Record<ExamArea, number>;
  for (const bereich of ALLE_BEREICHE) {
    const simulation = letzteErgebnisse.filter((e) => e.bereich === bereich);
    if (simulation.length > 0) {
      noten[bereich] = simulation[simulation.length - 1]!.note;
    } else {
      // Hochrechnung: 100 % Reife entspricht Note 1,0; 0 % entspricht 6,0.
      noten[bereich] = 1.0 + (1 - reifeWerte[bereich]) * 5;
    }
  }

  const urteil = bewerteNachParagraf15(noten);

  const luecken = schwacheThemen(zustaende, 12).map((atom) => ({
    atomId: atom.id,
    titel: atom.titel,
    bereich: atom.bereich,
    reifegrad: reife(zustaende, atom.bereich),
  }));

  const ohneSimulation = letzteErgebnisse.length === 0;
  const hinweis = ohneSimulation
    ? 'Noch keine echte Simulation. Die Noten sind eine Hochrechnung aus deinem ' +
      'Lernstand und werden nach der ersten Simulation deutlich belastbarer.'
    : `Prognose auf Basis von ${letzteErgebnisse.length} Simulation(en). ` +
      'Sie beschreibt deine bisherige Leistung, nicht die Prüfung selbst.';

  const gesamtNote =
    (noten.teil1 * PRUEFUNGSBEREICHE.teil1.weightPercent +
      TEIL2_BEREICHE.reduce((s, b) => s + noten[b] * PRUEFUNGSBEREICHE[b].weightPercent, 0)) /
    100;

  const teil2Note =
    TEIL2_BEREICHE.reduce((s, b) => s + noten[b] * PRUEFUNGSBEREICHE[b].weightPercent, 0) /
    TEIL2_BEREICHE.reduce((s, b) => s + PRUEFUNGSBEREICHE[b].weightPercent, 0);

  return {
    noten,
    gesamtNote,
    teil2Note,
    urteil,
    reife: reifeWerte,
    abgedeckt: deckung,
    dringendsteLuecken: luecken,
    hinweis,
  };
}

/** Verteilt Aufgaben eines Bereichs möglichst gleichmäßig über die Kapitel. */
export function verteileAufgaben(
  bereich: ExamArea,
  verfuegbar: Task[],
  anzahl: number,
): Task[] {
  const atome = atomeVonBereich(bereich);
  const proKapitel = new Map<string, Task[]>();
  for (const task of verfuegbar.filter((t) => t.proposal.examArea === bereich)) {
    const id = task.proposal.topicIds[0] ?? task.proposal.examArea;
    proKapitel.set(id, [...(proKapitel.get(id) ?? []), task]);
  }

  const auswahl: Task[] = [];
  const eimer = [...proKapitel.entries()].map(([id, liste]) => ({ id, liste, index: 0 }));
  let fortgesetzt = true;
  while (auswahl.length < anzahl && fortgesetzt) {
    fortgesetzt = false;
    for (const eimerEintrag of eimer) {
      if (auswahl.length >= anzahl) break;
      const task = eimerEintrag.liste[eimerEintrag.index];
      if (!task) continue;
      eimerEintrag.index += 1;
      fortgesetzt = true;
      if (!auswahl.includes(task)) auswahl.push(task);
    }
  }
  void atome;
  return auswahl;
}
