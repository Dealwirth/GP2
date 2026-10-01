import type { Fact, Pruefungsrelevanz } from '../../../domain/types.ts';

/**
 * Kurzschreiber für die Faktenbasis.
 *
 * Die Faktenbasis ist auf mehrere hundert Einträge gewachsen. Ausgeschrieben
 * wäre jeder Eintrag fünfzehn Zeilen lang und zu zwei Dritteln aus immer
 * gleichen Feldern zusammengesetzt – unmöglich zu pflegen und unmöglich zu
 * prüfen. Diese beiden Helfer lassen nur noch stehen, was den Eintrag
 * ausmacht: Kennung, Bezeichnung, Wert oder Formel, Quelle, Tags.
 *
 * Beide Helfer setzen die wiederkehrenden Felder korrekt:
 *  - `version` kommt aus der aktiven Version (siehe `index.ts`).
 *  - `gueltigBis: null` heißt unbefristet, `ersetztDurch: null` heißt nicht ersetzt.
 *  - `region`/`jahrgang` bleiben leer (bundesweit, allgemein).
 *  - `verification` ist standardmäßig `'offen'`. Nur wer den Wert am Original
 *    geprüft hat, setzt `geprueft: true` – und die zugehörige Quelle muss
 *    ebenfalls als geprüft geführt sein, sonst weist `npm run facts:check`
 *    den Eintrag zurück.
 */
export const V = '1.0';
export const AB = '2021-08-01';
export const UNBEGRENZT = null;

export interface FaktOptionen {
  bemerkung?: string;
  geprueft?: boolean;
  relevanz?: Pruefungsrelevanz[];
  region?: string | null;
  jahrgang?: string | null;
  gueltigAb?: string;
  /** Formel als Text – auch bei einem Fakt, der zusätzlich einen Zahlenwert trägt. */
  formel?: string;
}

const STANDARD_RELEVANZ: Pruefungsrelevanz[] = ['Norm'];

/** Ein Fakt mit Zahlenwert. */
export function z(
  id: string,
  kategorie: string,
  bezeichnung: string,
  wert: number,
  einheit: string,
  quelleId: string,
  tags: string[],
  opt: FaktOptionen = {},
): Fact {
  return {
    id,
    version: V,
    kategorie,
    bezeichnung,
    formel: opt.formel,
    wert,
    einheit,
    quelleId,
    gueltigAb: opt.gueltigAb ?? AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: opt.relevanz ?? STANDARD_RELEVANZ,
    region: opt.region ?? null,
    jahrgang: opt.jahrgang ?? null,
    bemerkung: opt.bemerkung ?? null,
    verification: opt.geprueft ? 'geprueft' : 'offen',
    tags,
  };
}

/** Ein Fakt ohne Zahlenwert – eine Formel, ein Begriff, eine Aussage. */
export function t(
  id: string,
  kategorie: string,
  bezeichnung: string,
  quelleId: string,
  tags: string[],
  opt: FaktOptionen & { formel?: string } = {},
): Fact {
  return {
    id,
    version: V,
    kategorie,
    bezeichnung,
    formel: opt.formel,
    quelleId,
    gueltigAb: opt.gueltigAb ?? AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: opt.relevanz ?? STANDARD_RELEVANZ,
    region: opt.region ?? null,
    jahrgang: opt.jahrgang ?? null,
    bemerkung: opt.bemerkung ?? null,
    verification: opt.geprueft ? 'geprueft' : 'offen',
    tags,
  };
}
