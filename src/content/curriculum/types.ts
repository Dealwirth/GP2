import type { Aufgabenstufe, ExamArea } from '../../domain/types.ts';

/**
 * Lernpfad-Baum.
 *
 * Das Gerüst sind die Berufsbildpositionen der Fachrichtung Energie- und
 * Gebäudetechnik (§ 4 Abs. 3 ElekAusbV) sowie die fachrichtungsübergreifenden
 * Positionen (§ 4 Abs. 2). Jedes Kapitel ist einer Position zugeordnet und
 * trägt die Verweisstelle, damit jederzeit nachvollziehbar ist, woher ein
 * Thema Prüfungsrelevanz hat.
 *
 * `gewicht` ist die erwartete Häufigkeit in der Prüfung (1 = sehr häufig).
 * Es steuert die adaptive Auswahl zusammen mit dem Prüfungsbereich.
 */

export interface AtomDef {
  /** Titel des Themas. */
  t: string;
  /** Was du nach dem Thema können musst. */
  l: string;
  /** Aufwandsstufen, die zu diesem Thema passen. */
  s?: Aufgabenstufe[];
  /** Fachlicher Zuschnitt, z. B. Rechnen, Norm, Praxis. */
  f?: 'rechnen' | 'norm' | 'praxis' | 'wissen';
}

export interface KapitelDef {
  id: string;
  titel: string;
  bereich: ExamArea;
  /** Verweis auf die Berufsbildposition. */
  position: string;
  /** Erwartete Häufigkeit, 1 bis 3. */
  gewicht: 1 | 2 | 3;
  atome: AtomDef[];
}

export interface Atom extends AtomDef {
  id: string;
  /** Ausgeschriebene Felder – die Kurzformen bleiben für die Definition erhalten. */
  titel: string;
  lernziel: string;
  fachlich: 'rechnen' | 'norm' | 'praxis' | 'wissen';
  kapitelId: string;
  kapitelTitel: string;
  bereich: ExamArea;
  position: string;
  gewicht: 1 | 2 | 3;
  /** Voraussetzbare Reihenfolge innerhalb des Kapitels. */
  nummer: number;
}

export function expandiere(defs: KapitelDef[]): Atom[] {
  const atome: Atom[] = [];
  for (const kapitel of defs) {
    kapitel.atome.forEach((atom, index) => {
      atome.push({
        ...atom,
        id: `${kapitel.id}-${String(index + 1).padStart(2, '0')}`,
        titel: atom.t,
        lernziel: atom.l,
        fachlich: atom.f ?? 'wissen',
        kapitelId: kapitel.id,
        kapitelTitel: kapitel.titel,
        bereich: kapitel.bereich,
        position: kapitel.position,
        gewicht: kapitel.gewicht,
        nummer: index + 1,
        s: atom.s ?? [1, 2],
        f: atom.f ?? 'wissen',
      });
    });
  }
  return atome;
}
