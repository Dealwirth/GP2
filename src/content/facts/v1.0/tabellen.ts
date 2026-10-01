import type { Fact } from '../../../domain/types.ts';
import { z } from './hilfe.ts';

/**
 * Tabellenwerte der Gebäudetechnik.
 *
 * Das ist der Bestand, der in der Prüfung tatsächlich nachgeschlagen wird:
 * Verlegearten, Häufungs- und Temperaturfaktoren, Schutzarten, Leitungs- und
 * Kabelkenngrößen, Netzformen.
 *
 * Aufbau: Jede Tabelle liegt zuerst als TypeScript-Konstante vor, damit die
 * Rechen-Engine dieselben Zahlen benutzt wie die Faktenbasis. Der Fakt trägt
 * die Zeilen dann als Text in `bemerkung`. Das ist kein Schönheitsfehler,
 * sondern notwendig: Die Faktenbindung erkennt Zahlen in Bezeichnung und
 * Bemerkung als belegt (siehe `validation/pipeline.ts`). Stünde die Zeile nur
 * in einer Konstante, dürfte kein Aufgabentext sie nennen.
 *
 * Ein Tabellenfakt hat `wert: 0` und die Einheit „A (siehe Werttabelle)".
 * Die Engine lehnt ihn als Einzelwert ab – er ist nur Bezugsgröße.
 */

// ---------------------------------------------------------------------------
// Verlegearten und Strombelastbarkeit
// ---------------------------------------------------------------------------

/**
 * Referenzwerte I_z in Ampere, Kupfer, PVC, 30 °C.
 *
 * A1/A2: Leitungen in wärmegedämmten Wänden bzw. in Rohr in Wärmedämmung
 * B1/B2: Leitungen in Rohr oder Kanal auf/in der Wand
 * C:     Leitungen direkt an der Wand, Kabel auf Wand oder Pritsche
 * D:     Erdkabel im Erdreich
 * E:     Kabel in Wasser
 * F:     mehradrige Kabel in Luft, frei verlegt
 */
export const IZ_TABELLE: Record<string, Record<number, number>> = {
  A1: { 1.5: 13.5, 2.5: 18, 4: 24, 6: 31, 10: 42, 16: 56, 25: 73, 35: 89, 50: 108, 70: 136, 95: 164 },
  A2: { 1.5: 14, 2.5: 18.5, 4: 25, 6: 32, 10: 43, 16: 57, 25: 75, 35: 92, 50: 110, 70: 139, 95: 167 },
  B1: { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232 },
  B2: { 1.5: 16.5, 2.5: 23, 4: 30, 6: 38, 10: 52, 16: 69, 25: 90, 35: 111, 50: 133, 70: 168, 95: 201 },
  C: { 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213, 95: 258 },
  D: { 1.5: 22, 2.5: 29, 4: 37, 6: 46, 10: 60, 16: 78, 25: 99, 35: 119, 50: 140, 70: 173, 95: 204 },
  E: { 1.5: 26, 2.5: 34, 4: 44, 6: 56, 10: 73, 16: 95, 25: 121, 35: 146, 50: 173, 70: 213, 95: 252 },
  F: { 1.5: 19.5, 2.5: 26, 4: 35, 6: 44, 10: 60, 16: 80, 25: 105, 35: 128, 50: 154, 70: 194, 95: 233 },
};

/** Die Zeile einer Verlegeart als Text – Grundlage der Faktenbindung. */
function izZeile(art: string): string {
  return Object.entries(IZ_TABELLE[art]!)
    .map(([q, a]) => `${q} mm² = ${a} A`)
    .join(' · ');
}

/** Häufungsfaktoren für gebündelte Stromkreise (Bezug 30 °C, Verlegeart C). */
export const HAEUFUNGSFAKTOREN: Record<number, number> = {
  1: 1.0,
  2: 0.8,
  3: 0.7,
  4: 0.65,
  5: 0.6,
  6: 0.57,
  7: 0.54,
  8: 0.52,
  9: 0.5,
  12: 0.45,
  16: 0.41,
  20: 0.38,
};

/** Temperaturfaktoren PVC, Bezug 30 °C. */
export const TEMPERATURFAKTOR_PVC: Record<number, number> = {
  10: 1.22,
  15: 1.17,
  20: 1.12,
  25: 1.06,
  30: 1.0,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
  55: 0.61,
  60: 0.5,
};

/** Temperaturfaktoren XLPE, Bezug 30 °C. */
export const TEMPERATURFAKTOR_XLPE: Record<number, number> = {
  10: 1.15,
  15: 1.12,
  20: 1.08,
  25: 1.04,
  30: 1.0,
  35: 0.96,
  40: 0.91,
  45: 0.87,
  50: 0.82,
  55: 0.76,
  60: 0.71,
  65: 0.65,
  70: 0.58,
  80: 0.5,
};

/** Vereinfachte Absicherungswerte bis 120 mm² (Schultabelle, kein Normwert). */
export const ABSICHERUNG_SCHULTABELLE_ERWEITERT: Record<number, number> = {
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
  120: 200,
};

/** Genormte Leiterquerschnitte. */
export const NENNQUERSCHNITTE = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

/** Leiterwerkstoffe: Widerstandsbelag, Temperaturkoeffizient, Dichte, κ. */
export const WERKSTOFFE: Record<
  string,
  { rho: number; alpha: number; dichte: number; kappa: number }
> = {
  Kupfer: { rho: 0.0175, alpha: 0.00393, dichte: 8.9, kappa: 56 },
  Aluminium: { rho: 0.028, alpha: 0.00403, dichte: 2.7, kappa: 35 },
};

// ---------------------------------------------------------------------------
// Schutzarten
// ---------------------------------------------------------------------------

export const IP_WASSER: Record<number, string> = {
  0: 'kein Schutz',
  1: 'Tropfwasser (senkrecht)',
  2: 'Tropfwasser bis 15° Neigung',
  3: 'Sprühwasser bis 60° Neigung',
  4: 'Spritzwasser aus allen Richtungen',
  5: 'Strahlwasser',
  6: 'starkes Strahlwasser',
  7: 'zeitweiliges Untertauchen (30 min, 1 m)',
  8: 'dauerndes Untertauchen',
  9: 'Wasserstrahl mit hohem Druck und hoher Temperatur',
};

export const IP_FREMDBERUEHRUNG: Record<number, string> = {
  0: 'kein Schutz',
  1: 'Handrücken, Fremdkörper größer 50 mm',
  2: 'Finger, Fremdkörper größer 12,5 mm',
  3: 'Werkzeug, Fremdkörper größer 2,5 mm',
  4: 'Draht, Fremdkörper größer 1 mm',
  5: 'staubgeschützt',
  6: 'staubdicht',
};

export const IK_SCHLAGFESTIGKEIT: Record<number, string> = {
  0: 'kein Schutz',
  2: '0,2 J',
  3: '0,35 J',
  4: '0,5 J',
  5: '0,7 J',
  6: '1 J',
  7: '2 J',
  8: '5 J',
  9: '10 J',
  10: '20 J',
};

// ---------------------------------------------------------------------------
// Netzformen und Schutzleiter
// ---------------------------------------------------------------------------

export const NETZFORMEN: Record<string, string> = {
  TN_S: 'TN-S: Neutralleiter und Schutzleiter durchgehend getrennt geführt',
  TN_C: 'TN-C: Neutralleiter und Schutzleiter als PEN in einer Ader geführt',
  TN_C_S: 'TN-C-S: PEN bis zum Trennpunkt, danach N und PE getrennt',
  TT: 'TT: Körper der Betriebsmittel örtlich geerdet, Sternpunkt geerdet, kein PE vom Netz',
  IT: 'IT: Sternpunkt nicht geerdet oder über hohen Widerstand geerdet, Isolationsüberwachung',
};

// ---------------------------------------------------------------------------
// Fakten
// ---------------------------------------------------------------------------

export const FAKTEN_TABELLEN: Fact[] = [
  ...Object.keys(IZ_TABELLE).map((art) =>
    z(
      `iz-verlegeart-${art.toLowerCase()}`,
      'Leitung',
      `Referenzwerte I_z, Verlegeart ${art}, Kupfer, PVC, 30 °C`,
      0,
      'A (siehe Werttabelle)',
      'vde0298_4',
      ['strombelastbarkeit', 'querschnitt', `verlegeart-${art.toLowerCase()}`],
      { bemerkung: izZeile(art) },
    ),
  ),

  z(
    'haeufungsfaktoren',
    'Leitung',
    'Häufungsfaktoren für gebündelte Stromkreise',
    0,
    'Faktor (siehe Werttabelle)',
    'vde0298_4',
    ['strombelastbarkeit', 'haeufung'],
    {
      bemerkung:
        Object.entries(HAEUFUNGSFAKTOREN)
          .map(([n, f]) => `${n} Stromkreise = ${f}`)
          .join(' · ') + ' · Bezug 30 °C, Verlegeart C',
    },
  ),
  z(
    'temperaturfaktor-pvc',
    'Leitung',
    'Reduktionsfaktoren PVC-Isolierung, Bezug 30 °C',
    0,
    'Faktor (siehe Werttabelle)',
    'vde0298_4',
    ['strombelastbarkeit', 'temperatur'],
    {
      bemerkung: Object.entries(TEMPERATURFAKTOR_PVC)
        .map(([c, f]) => `${c} °C = ${f}`)
        .join(' · '),
    },
  ),
  z(
    'temperaturfaktor-xlpe',
    'Leitung',
    'Reduktionsfaktoren XLPE-Isolierung, Bezug 30 °C',
    0,
    'Faktor (siehe Werttabelle)',
    'vde0298_4',
    ['strombelastbarkeit', 'temperatur'],
    {
      bemerkung: Object.entries(TEMPERATURFAKTOR_XLPE)
        .map(([c, f]) => `${c} °C = ${f}`)
        .join(' · '),
    },
  ),
  z(
    'absicherung-schultabelle-erweitert',
    'Leitung',
    'Vereinfachte Absicherungswerte bis 120 mm² (Schultabelle)',
    0,
    'A (siehe Werttabelle)',
    'schultabelle',
    ['absicherung', 'schultabelle', 'querschnitt'],
    {
      bemerkung:
        Object.entries(ABSICHERUNG_SCHULTABELLE_ERWEITERT)
          .map(([q, a]) => `${q} mm² = ${a} A`)
          .join(' · ') + ' · kein Normwert, sondern vereinfachte Abstufung',
      relevanz: ['Berufsschule', 'ZVEH'],
    },
  ),
  z(
    'nennquerschnitte',
    'Leitung',
    'Genormte Leiterquerschnitte (Reihe)',
    0,
    'mm² (siehe Werttabelle)',
    'vde0298_4',
    ['querschnitt', 'normreihe'],
    {
      bemerkung: `${NENNQUERSCHNITTE.join(' · ')} mm² – Zwischengrößen sind nicht genormt.`,
    },
  ),

  // --- Leiterwerkstoffe ----------------------------------------------------
  z(
    'rho-aluminium',
    'Leitung',
    'Widerstandsbelag Aluminium (20 °C)',
    WERKSTOFFE.Aluminium!.rho,
    'Ω·mm²/m',
    'vde0298_4',
    ['spannungsfall', 'aluminium', 'rho'],
    {
      bemerkung:
        'Aluminium leitet rund 60 % so gut wie Kupfer. Für dieselbe Stromtragfähigkeit ' +
        'ist deshalb der nächstgrößere Querschnitt zu wählen.',
    },
  ),
  z(
    'alpha-kupfer',
    'Leitung',
    'Temperaturkoeffizient Kupfer',
    WERKSTOFFE.Kupfer!.alpha,
    '1/K',
    'vde0298_4',
    ['widerstand', 'temperatur', 'kupfer'],
    {
      bemerkung:
        'Der Widerstand steigt mit der Temperatur: R(θ) = R₂₀ · (1 + α · (θ − 20 °C)). ' +
        'Kupfer 0,00393 1/K, Aluminium 0,00403 1/K.',
    },
  ),

  // --- Schutzarten ---------------------------------------------------------
  z(
    'ip-zweite-kennziffer',
    'Schutzart',
    'IP-Code – zweite Kennziffer (Wasserschutz)',
    0,
    'Kennziffer (siehe Werttabelle)',
    'vde0100_410',
    ['schutzart', 'ip', 'feuchtraum'],
    {
      bemerkung: Object.entries(IP_WASSER)
        .map(([k, v]) => `IP x${k}: ${v}`)
        .join(' · '),
    },
  ),
  z(
    'ip-erste-kennziffer',
    'Schutzart',
    'IP-Code – erste Kennziffer (Berührungs- und Fremdkörperschutz)',
    0,
    'Kennziffer (siehe Werttabelle)',
    'vde0100_410',
    ['schutzart', 'ip'],
    {
      bemerkung: Object.entries(IP_FREMDBERUEHRUNG)
        .map(([k, v]) => `IP ${k}x: ${v}`)
        .join(' · '),
    },
  ),
  z(
    'ik-schlagfestigkeit',
    'Schutzart',
    'IK-Code – Schlagfestigkeit',
    0,
    'Joule (siehe Werttabelle)',
    'din_en_61439',
    ['schutzart', 'ik', 'mechanisch'],
    {
      bemerkung: Object.entries(IK_SCHLAGFESTIGKEIT)
        .map(([k, v]) => `IK ${k}: ${v}`)
        .join(' · '),
    },
  ),
  z(
    'ip-badezimmer',
    'Schutzart',
    'Mindestschutzart in Badezimmern (Bereiche 0 bis 2)',
    0,
    'IP-Code',
    'vde0100_701',
    ['schutzart', 'badezimmer', 'feuchtraum'],
    {
      bemerkung:
        'Bereich 0 (Wanne/Dusche): IP X7, nur SELV mit höchstens 12 V AC. ' +
        'Bereich 1: IP X4, Schutz durch SELV (12 V AC) oder RCD 30 mA. ' +
        'Bereich 2: IP X4, RCD 30 mA für alle Stromkreise.',
    },
  ),
  z(
    'ip-aussenbereich',
    'Schutzart',
    'Mindestschutzart im Außenbereich',
    4,
    'IP-Code (zweite Kennziffer)',
    'vde0100_410',
    ['schutzart', 'aussenbereich', 'feuchtraum'],
    {
      bemerkung:
        'Im Freien mindestens IP X4 (Spritzwasser). Für Steckdosen im Freien ' +
        'wird IP 44 mit Klappdeckel verwendet, für Strahler IP 65.',
    },
  ),

  // --- Netzformen ----------------------------------------------------------
  z(
    'netzformen',
    'Netzsystem',
    'Netzformen der Niederspannung (TN, TT, IT)',
    0,
    'Bezeichnung (siehe Bemerkung)',
    'vde0100_410',
    ['netzform', 'tn-system', 'schutz'],
    {
      bemerkung: Object.values(NETZFORMEN).join(' · '),
    },
  ),
  z(
    'tn-c-verbot',
    'Netzsystem',
    'PEN-Leiter – Verbot in bestimmten Bereichen',
    0,
    'Aussage',
    'vde0100_540',
    ['netzform', 'pen', 'schutz'],
    {
      bemerkung:
        'Der PEN darf nicht verwendet werden: hinter Fehlerstrom-Schutzeinrichtungen, ' +
        'in explosionsgefährdeten Bereichen, für Steckdosen bis 32 A und in ' +
        'Räumen mit erhöhter Gefährdung. Dort ist der Schutzleiter getrennt zu führen.',
    },
  ),
  z(
    'pe-querschnitt-regel',
    'Netzsystem',
    'Querschnitt des Schutzleiters',
    0,
    'mm² (Regel)',
    'vde0100_540',
    ['schutzleiter', 'querschnitt'],
    {
      bemerkung:
        'Schutzleiter gleicher Querschnitt wie der Außenleiter bis 16 mm². ' +
        'Über 16 bis 35 mm²: 16 mm². Über 35 mm²: halber Außenleiterquerschnitt.',
    },
  ),
];
