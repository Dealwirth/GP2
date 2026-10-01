import type { Fact } from '../../domain/types.ts';
import { FAKTEN_FORMELN } from './v1.0/formeln.ts';
import { FAKTEN_LEITUNGEN } from './v1.0/leitungen.ts';
import { FAKTEN_SCHUTZ } from './v1.0/schutz.ts';
import { FAKTEN_TABELLEN } from './v1.0/tabellen.ts';
import { FAKTEN_WISSEN_TECHNIK } from './v1.0/wissen-technik.ts';
import { FAKTEN_WISSEN_GEBAEUDE } from './v1.0/wissen-gebaeude.ts';
import { FAKTEN_WISSEN_WISO } from './v1.0/wissen-wiso.ts';

/**
 * Aktive Version der Faktenbasis.
 *
 * Jede erzeugte Aufgabe speichert diese Version mit. Wenn sich ein Wert ändert,
 * entsteht ein neuer Ordner (v1.1), `changelog.json` wird ergänzt und die
 * Version hier angehoben. Alte Antworten bleiben dadurch rückverfolgbar.
 */
export const FAKTEN_VERSION = '1.0';

export const FAKTEN: Fact[] = [
  ...FAKTEN_SCHUTZ,
  ...FAKTEN_LEITUNGEN,
  ...FAKTEN_FORMELN,
  ...FAKTEN_TABELLEN,
  ...FAKTEN_WISSEN_TECHNIK,
  ...FAKTEN_WISSEN_GEBAEUDE,
  ...FAKTEN_WISSEN_WISO,
];

const NACH_ID = new Map<string, Fact>(FAKTEN.map((f) => [f.id, f]));

export function holeFakt(id: string): Fact | undefined {
  return NACH_ID.get(id);
}

export function holePflichtFakt(id: string): Fact {
  const f = NACH_ID.get(id);
  if (!f) {
    throw new Error(
      `Fakt "${id}" existiert nicht. Aufgaben dürfen nur auf existierende ` +
        `Fakten verweisen – das ist der Kern der Faktenbindung.`,
    );
  }
  return f;
}

export function faktNachTag(tag: string): Fact[] {
  return FAKTEN.filter((f) => f.tags.includes(tag));
}

/**
 * Gültigkeitsprüfung.
 *
 * `offen` heißt: Wert eingetragen, aber am Original noch nicht abgeglichen.
 * Offene Fakten dürfen Lernstoff tragen, werden im UI aber gekennzeichnet und
 * fließen nicht in "gesichert"-Kennzahlen ein.
 */
export function offeneFakten(): Fact[] {
  return FAKTEN.filter((f) => f.verification === 'offen');
}

export function gepruefteFakten(): Fact[] {
  return FAKTEN.filter((f) => f.verification === 'geprueft');
}

export function gueltigAm(
  fact: Fact,
  datum: Date,
  region: string | null = null,
  jahrgang: string | null = null,
): boolean {
  const ab = new Date(fact.gueltigAb);
  if (datum < ab) return false;
  if (fact.gueltigBis) {
    const bis = new Date(fact.gueltigBis);
    if (datum > bis) return false;
  }
  // Regions- und Jahrgangsbindung: leer bedeutet bundesweit/allgemein gültig.
  if (fact.region !== null && region !== null && fact.region !== region) return false;
  if (fact.jahrgang !== null && jahrgang !== null && fact.jahrgang !== jahrgang) {
    return false;
  }
  return true;
}

export interface FaktBericht {
  version: string;
  gesamt: number;
  geprueft: number;
  offen: number;
  offeneIds: string[];
}

/** Kennzahlen für den Lehrerbericht und für `npm run facts:check`. */
export function faktBericht(): FaktBericht {
  const offen = offeneFakten();
  return {
    version: FAKTEN_VERSION,
    gesamt: FAKTEN.length,
    geprueft: FAKTEN.length - offen.length,
    offen: offen.length,
    offeneIds: offen.map((f) => f.id),
  };
}
