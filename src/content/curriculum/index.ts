import type { ExamArea } from '../../domain/types.ts';
import type { Atom, KapitelDef } from './types.ts';
import { expandiere } from './types.ts';
import { ALLE_KAPITEL } from './schriftlich.ts';
import { reifegrad, istVerfallen, effektiverZustand } from '../../domain/stateMachine.ts';
import type { TopicStateRecord } from '../../domain/types.ts';

/**
 * Lernpfad.
 *
 * Das Ziel ist vollständige Prüfungsabdeckung, nicht eine bestimmte Anzahl
 * von Atomen. Die Zahl ist ein Ergebnis – sobald die Abdeckung vollständig
 * ist, ist die Aufgabe erfüllt.
 */
export const KAPITEL: KapitelDef[] = ALLE_KAPITEL;
export const ATOME: Atom[] = expandiere(KAPITEL);

const NACH_ID = new Map(ATOME.map((a) => [a.id, a]));
const NACH_KAPITEL = new Map<string, Atom[]>();
for (const atom of ATOME) {
  const liste = NACH_KAPITEL.get(atom.kapitelId) ?? [];
  liste.push(atom);
  NACH_KAPITEL.set(atom.kapitelId, liste);
}

export function holeAtom(id: string): Atom | undefined {
  return NACH_ID.get(id);
}

export function atomeVonKapitel(kapitelId: string): Atom[] {
  return NACH_KAPITEL.get(kapitelId) ?? [];
}

export function atomeVonBereich(bereich: ExamArea): Atom[] {
  return ATOME.filter((a) => a.bereich === bereich);
}

export function kapitelVonBereich(bereich: ExamArea): KapitelDef[] {
  return KAPITEL.filter((k) => k.bereich === bereich);
}

export function curriculumKennzahlen(): {
  atome: number;
  kapitel: number;
  jeBereich: Record<ExamArea, number>;
} {
  const jeBereich = {} as Record<ExamArea, number>;
  for (const bereich of [
    'kundenauftrag',
    'systementwurf',
    'funktionsanalyse',
    'wiso',
    'teil1',
  ] as ExamArea[]) {
    jeBereich[bereich] = atomeVonBereich(bereich).length;
  }
  return { atome: ATOME.length, kapitel: KAPITEL.length, jeBereich };
}

// ---------------------------------------------------------------------------
// Fortschritt
// ---------------------------------------------------------------------------

export interface Abdeckung {
  /** Anteil der Atome mit gefestigtem Zustand, 0..1. */
  quote: number;
  begonnen: number;
  gefestigt: number;
  verfallen: number;
}

/**
 * Abdeckung je Prüfungsbereich.
 *
 * Gewichtet nach Atomgewicht, damit seltene Themen den Fortschritt nicht
 * dominieren und häufige nicht untergehen.
 */
export function abdeckung(
  zustaende: Map<string, TopicStateRecord>,
  bereich?: ExamArea,
  jetzt: Date = new Date(),
): Abdeckung {
  const atome = bereich ? atomeVonBereich(bereich) : ATOME;
  let summeGewicht = 0;
  let gewichtetGefestigt = 0;
  let begonnen = 0;
  let gefestigt = 0;
  let verfallen = 0;

  for (const atom of atome) {
    summeGewicht += atom.gewicht;
    const zustand = zustaende.get(atom.id);
    if (!zustand || zustand.answered === 0) continue;
    begonnen += 1;
    // Verfallen zählt nicht mehr als gefestigt. Sonst behauptete die
    // Abdeckung ein Wissen, das nach Wochen Pause nicht mehr abrufbar ist.
    if (istVerfallen(zustand, jetzt)) {
      verfallen += 1;
      continue;
    }
    const state = effektiverZustand(zustand, jetzt);
    if (state === 'gefestigt' || state === 'pruefungsreif') {
      gefestigt += 1;
      gewichtetGefestigt += atom.gewicht;
    }
  }

  return {
    quote: summeGewicht > 0 ? gewichtetGefestigt / summeGewicht : 0,
    begonnen,
    gefestigt,
    verfallen,
  };
}

/** Reifegrad eines Prüfungsbereichs: Mittelwert der Atom-Reifegrade. */
export function reife(
  zustaende: Map<string, TopicStateRecord>,
  bereich: ExamArea,
  jetzt: Date = new Date(),
): number {
  const atome = atomeVonBereich(bereich);
  if (atome.length === 0) return 0;
  const summe = atome.reduce((s, atom) => {
    const zustand = zustaende.get(atom.id);
    return s + (zustand ? reifegrad(zustand, jetzt) : 0);
  }, 0);
  return summe / atome.length;
}

/** Themen, die jetzt wiederholt werden sollten. */
export function faelligeThemen(
  zustaende: Map<string, TopicStateRecord>,
  jetzt = new Date(),
): Atom[] {
  return ATOME.filter((atom) => {
    const zustand = zustaende.get(atom.id);
    if (!zustand) return false;
    if (effektiverZustand(zustand, jetzt) === 'ueberfaellig') return true;
    if (!zustand.nextDue) return false;
    return new Date(zustand.nextDue) <= jetzt;
  });
}

/** Fehlerkorb: zuletzt falsch beantwortete Aufgaben. */
export function fehlerkorbThemen(
  zustaende: Map<string, TopicStateRecord>,
  grenze = 50,
): Atom[] {
  return ATOME.filter((atom) => {
    const zustand = zustaende.get(atom.id);
    if (!zustand || zustand.answered === 0) return false;
    return zustand.hitRate < 0.8 || zustand.state === 'unsicher';
  })
    .sort((a, b) => {
      const za = zustaende.get(a.id);
      const zb = zustaende.get(b.id);
      return (za?.hitRate ?? 0) - (zb?.hitRate ?? 0);
    })
    .slice(0, grenze);
}

/**
 * Adaptive Auswahl: die schwächsten Themen zuerst, gewichtet nach
 * Prüfungsgewicht. So fließt Lernzeit dorthin, wo die meisten Punkte liegen.
 */
export function schwacheThemen(
  zustaende: Map<string, TopicStateRecord>,
  anzahl = 10,
  bereich?: ExamArea,
  bezug: Date = new Date(),
): Atom[] {
  const atome = bereich ? atomeVonBereich(bereich) : ATOME;
  return atome
    .map((atom) => {
      const zustand = zustaende.get(atom.id);
      const r = zustand ? reifegrad(zustand, bezug) : 0;
      // Verfallenes Wissen ist eine dringendere Lücke als nie Gesehenes:
      // es war schon da und ist wieder weg. Deshalb der Abschlag.
      const verfallAbschlag = zustand && istVerfallen(zustand, bezug) ? 2 : 0;
      // Ungesehen zählt als 0, aber nicht ganz so schlecht wie falsch beantwortet.
      return { atom, score: r * 10 - atom.gewicht - verfallAbschlag };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, anzahl)
    .map((e) => e.atom);
}

export { SYSTEMENTWURF, FUNKTIONSANALYSE, WISO, TEIL1 } from './schriftlich.ts';
export { KUNDENAUFTRAG } from './kundenauftrag.ts';
export type { Atom, KapitelDef } from './types.ts';
