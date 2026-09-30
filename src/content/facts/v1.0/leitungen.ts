import type { Fact } from '../../../domain/types.ts';

const V = '1.0';
const AB = '2021-08-01';
const UNBEGRENZT = null;

/**
 * Leitungsmitteldaten.
 *
 * Hier liegt die häufigste Falle der Elektroausbildung: Für die Auswahl von
 * Leiterquerschnitt und Absicherung konkurrieren zwei Rechenwege –
 *   1. die Referenzwerte I_z (Verlegeart, Material, Gruppierung, Temperatur)
 *   2. die vereinfachten Absicherungswerte der Berufsschultabelle
 * Beide liefern für kleine Querschnitte unterschiedliche Ergebnisse.
 *
 * Deshalb: beide Tabellen werden gepflegt, die Rechen-Engine wählt die Regel
 * ausdrücklich und weist am Ergebnis aus, MIT WELCHER REGEL gerechnet wurde.
 * Ein stilles Mischen der beiden Systeme findet nicht statt.
 */

/** Referenzwerte I_z für Verlegeart C, Kupfer, PVC-Isolierung, 30 °C Raumtemperatur. */
export const IZ_VERLEGEART_C: Record<number, number> = {
  1.5: 15.5,
  2.5: 21,
  4: 28,
  6: 36,
  10: 50,
  16: 68,
  25: 89,
  35: 111,
  50: 134,
  70: 171,
  95: 207,
};

/**
 * Vereinfachte Absicherungswerte (Schultabelle/ZVEH-Systematik).
 * Diese Werte sind selbst gewählte Abstufungen – sie sind KEINE I_z-Werte.
 */
export const ABSICHERUNG_SCHULTABELLE: Record<number, number> = {
  1.5: 16,
  2.5: 20,
  4: 25,
  6: 32,
  10: 40,
  16: 50,
  25: 63,
  35: 80,
  50: 100,
  70: 125,
  95: 160,
};

/** Reduktionsfaktoren für erhöhte Umgebungstemperatur, Bezug 30 °C. */
export const TEMPERATURFAKTOREN: Record<number, number> = {
  20: 1.12,
  25: 1.08,
  30: 1.0,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
  55: 0.61,
  60: 0.5,
};

export const FAKTEN_LEITUNGEN: Fact[] = [
  {
    id: 'leiter-werkstoff-kupfer',
    version: V,
    kategorie: 'Leitung',
    bezeichnung: 'Werkstoff der Leiter (Referenzrechnung)',
    wert: 1,
    einheit: 'Kupfer',
    quelleId: 'vde0298',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      'Der Widerstandsbelag ρ für Kupfer wird für Spannungsfall- und ' +
      'Widerstandsberechnungen mit 0,018 Ω·mm²/m angesetzt.',
    verification: 'geprueft',
    tags: ['leitung', 'kupfer', 'rho'],
  },
  {
    id: 'rho-kupfer',
    version: V,
    kategorie: 'Leitung',
    bezeichnung: 'Widerstandsbelag Kupfer (Rechenwert)',
    wert: 0.018,
    einheit: 'Ω·mm²/m',
    quelleId: 'vde0298',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      'In der Ausbildung üblich ist 0,0175 Ω·mm²/m bei 20 °C. 0,018 ist der ' +
      'konservative Rechenwert. Beide Werte unterscheiden die Ergebnisse nur ' +
      'geringfügig – der verwendete Wert wird in jeder Lösung mit ausgewiesen.',
    verification: 'offen',
    tags: ['spannungsfall', 'rho'],
  },
  {
    id: 'iz-temperatur-bezug',
    version: V,
    kategorie: 'Leitung',
    bezeichnung: 'Bezugstemperatur der Referenzwerte I_z',
    wert: 30,
    einheit: '°C',
    quelleId: 'vde0298',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      'Die I_z-Werte gelten für 30 °C Raumtemperatur bei Verlegeart C. ' +
      'Abweichende Temperaturen werden über Reduktionsfaktoren berücksichtigt.',
    verification: 'geprueft',
    tags: ['strombelastbarkeit', 'temperatur'],
  },
  {
    id: 'iz-tabelle-verlegeart-c',
    version: V,
    kategorie: 'Leitung',
    bezeichnung: 'Referenzwerte I_z, Verlegeart C, Cu, 30 °C',
    wert: 0,
    einheit: 'A (siehe Werttabelle)',
    quelleId: 'vde0298',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Norm'],
    region: null,
    jahrgang: null,
    bemerkung:
      `1,5 mm² = ${IZ_VERLEGEART_C[1.5]} A · 2,5 mm² = ${IZ_VERLEGEART_C[2.5]} A · ` +
      `4 mm² = ${IZ_VERLEGEART_C[4]} A · 6 mm² = ${IZ_VERLEGEART_C[6]} A · ` +
      `10 mm² = ${IZ_VERLEGEART_C[10]} A · 16 mm² = ${IZ_VERLEGEART_C[16]} A · ` +
      `25 mm² = ${IZ_VERLEGEART_C[25]} A · 35 mm² = ${IZ_VERLEGEART_C[35]} A`,
    verification: 'offen',
    tags: ['strombelastbarkeit', 'querschnitt', 'verlegeart-c'],
  },
  {
    id: 'absicherung-schultabelle',
    version: V,
    kategorie: 'Leitung',
    bezeichnung: 'Vereinfachte Absicherungswerte (Schultabelle/ZVEH-Systematik)',
    wert: 0,
    einheit: 'A (siehe Werttabelle)',
    quelleId: 'schultabelle',
    gueltigAb: AB,
    gueltigBis: UNBEGRENZT,
    ersetztDurch: null,
    pruefungsrelevanz: ['Berufsschule', 'ZVEH'],
    region: null,
    jahrgang: null,
    bemerkung:
      `1,5 mm² = ${ABSICHERUNG_SCHULTABELLE[1.5]} A · 2,5 mm² = ${ABSICHERUNG_SCHULTABELLE[2.5]} A · ` +
      `4 mm² = ${ABSICHERUNG_SCHULTABELLE[4]} A · 6 mm² = ${ABSICHERUNG_SCHULTABELLE[6]} A · ` +
      `10 mm² = ${ABSICHERUNG_SCHULTABELLE[10]} A · 16 mm² = ${ABSICHERUNG_SCHULTABELLE[16]} A · ` +
      `25 mm² = ${ABSICHERUNG_SCHULTABELLE[25]} A · 35 mm² = ${ABSICHERUNG_SCHULTABELLE[35]} A. ` +
      'Dieses System wird in vielen Übungen erwartet, ist aber nicht identisch ' +
      'mit der Referenzberechnung nach I_z.',
    verification: 'offen',
    tags: ['absicherung', 'schultabelle', 'querschnitt'],
  },
];
