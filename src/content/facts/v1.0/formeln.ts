import type { Fact } from '../../../domain/types.ts';

const V = '1.0';
const AB = '2021-08-01';
const UNBEGRENZT = null;

/**
 * Formeln des Prüfungsrechnens.
 *
 * Gespeichert werden nur die Formeln als Text. Gerechnet wird ausschließlich
 * in `src/engine/calc` – niemals in einer Aufgabe.
 * Jede Rechenaufgabe zeigt die Formel, die eingesetzten Tabellenwerte und das
 * Ergebnis, damit der Weg nachprüfbar bleibt.
 */
export const FAKTEN_FORMELN: Fact[] = [
  {
    id: 'formel-strom-einphasig',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Wirkstrom (einphasig, Wechselstrom)',
    formel: 'I = P / (U · cos φ)',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule', 'ZVEH'],
    region: null,
    jahrgang: null,
    bemerkung:
      'P in W, U in V, I in A. cos φ = Wirkleistungsgrad, wird häufig mit 0,9 ' +
      'oder aus dem Blindstromfaktor berechnet.',
    verification: 'geprueft',
    tags: ['formel', 'leistung', 'einphasig'],
  },
  {
    id: 'formel-strom-drehstrom',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Wirkstrom (Drehstrom, verkettet)',
    formel: 'I = P / (√3 · U · cos φ)',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule', 'ZVEH'],
    region: null,
    jahrgang: null,
    bemerkung:
      'P in W, U = verkettete Spannung (400 V) in V, I in A. Bei Bezug auf ' +
      '230 V muss der Faktor 3 zusätzlich berücksichtigt werden.',
    verification: 'geprueft',
    tags: ['formel', 'leistung', 'drehstrom'],
  },
  {
    id: 'formel-spannungsfall-einphasig',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Spannungsfall (einphasig)',
    formel: 'ΔU% = 2 · ρ · l · I / (A · U) · 100',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule', 'Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      'ρ in Ω·mm²/m, l = Leitungslänge einfach in m, I in A, A in mm², U in V. ' +
      'Der Faktor 2 berücksichtigt Hin- und Rückleiter. Der Spannungsfall wird ' +
      'gegenüber U0 (230 V) angegeben.',
    verification: 'geprueft',
    tags: ['formel', 'spannungsfall'],
  },
  {
    id: 'formel-spannungsfall-mit-cosphi',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Spannungsfall mit Wirkleistungsgrad (einphasig)',
    formel: 'ΔU% = 2 · ρ · l · I / (A · U) · (cos φ + tan φ · sin φ) · 100',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule', 'Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      'Genaueres Verfahren für Verbraucher mit nicht cos φ = 1. ' +
      'In der Berufsschule häufig in vereinfachter Form gefragt.',
    verification: 'offen',
    tags: ['formel', 'spannungsfall', 'cos-phi'],
  },
  {
    id: 'formel-abschaltbedingung',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Abschaltbedingung – zulässiger Wert von R_A',
    formel: 'R_A ≤ U₀ / I_Δn',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      'U₀ in V, I_Δn in A, R_A in Ω. Das Ergebnis wird immer aus U₀ und I_Δn ' +
      'hergeleitet, nie aus einer Merkzahl.',
    verification: 'geprueft',
    tags: ['formel', 'rcd', 'abschaltbedingung'],
  },
  {
    id: 'formel-schleifenwiderstand',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Schleifenwiderstand – Grenzwert',
    formel: 'R_L ≤ U₀ / I_a',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      'I_a = Auslösestrom der Schutzmaßnahme. Bei Leitungenschutzschalter ' +
      'Kennlinie C ist I_a = 5–10 × In, bei Kennlinie B 3–5 × In. ' +
      'Geprüft wird in der Praxis mit dem kleinsten Auslösestrom.',
    verification: 'geprueft',
    tags: ['formel', 'schleifenwiderstand', 'ausloesestrom'],
  },
  {
    id: 'formel-cos-phi',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Wirkleistungsgrad aus Blindleistung',
    formel: 'cos φ = P / S   bzw.   cos φ = P / √(P² + Q²)',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule'],
    region: null,
    jahrgang: null,
    bemerkung:
      'P = Wirkleistung, Q = Blindleistung, S = Scheinleistung. ' +
      'Aus dem Blindstromfaktor tan φ folgt sin φ = tan φ / √(1 + tan² φ).',
    verification: 'geprueft',
    tags: ['formel', 'cos-phi', 'blindleistung'],
  },
  {
    id: 'formel-leistungsfaktor-wr',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Ausnutzungsgrad einer Wärmepumpe',
    formel: 'COP = Q_0 / P_el   bzw.   JAZ = Q_ges / E_ges',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule', 'ZVEH'],
    region: null,
    jahrgang: null,
    bemerkung:
      'COP = Kälteleistung / elektrische Leistungsaufnahme. JAZ = Jahresarbeitszahl, ' +
      'also das Verhältnis der im Jahr erzeugten Wärme zur im Jahr verbrauchten Energie.',
    verification: 'geprueft',
    tags: ['formel', 'waermepumpe', 'cop', 'jaz'],
  },
  {
    id: 'formel-pv-strom',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Gleichstrom einer PV-Strangteilung',
    formel: 'I_dc = P_total / U_dc',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Norm', 'Berufsschule'],
    region: null,
    jahrgang: null,
    bemerkung:
      'Die Gleichspannung eines Strangs ergibt sich aus der Modulanzahl mal der ' +
      'Modul-Überspannung am MPP. Die Systemspannung am Wechselrichtereingang ' +
      'darf die zulässige Höchstspannung nicht überschreiten.',
    verification: 'offen',
    tags: ['formel', 'photovoltaik'],
  },
  {
    id: 'formel-physikalisch',
    version: V,
    kategorie: 'Formel',
    bezeichnung: 'Grundlegende physikalische Größen',
    formel: 'I = Q/t · R = U/I · P = U · I = R · I² = I² · R',
    quelleId: 'vde0100',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule'],
    region: null,
    jahrgang: null,
    bemerkung: 'Grundlagen für Funktions- und Systemanalyse.',
    verification: 'geprueft',
    tags: ['formel', 'grundlagen'],
  },
];
