import type { SolutionStep } from '../../domain/types.ts';
import {
  ABSICHERUNG_SCHULTABELLE,
  IZ_VERLEGEART_C,
  TEMPERATURFAKTOREN,
} from '../../content/facts/v1.0/leitungen.ts';
import { holeFakt } from '../../content/facts/index.ts';

/** Version des Rechenkerns. Wird mit jeder fachlichen Änderung angehoben. */
export const ENGINE_VERSION = '1.0.0';

export interface RechenErgebnis {
  wert: number;
  einheit: string;
  steps: SolutionStep[];
  /** Welches Rechenverfahren verwendet wurde – wird im UI ausgewiesen. */
  regel: string;
  /** false, wenn das Ergebnis auf einem noch nicht geprüften Fakt beruht. */
  gesichert: boolean;
}

// ---------------------------------------------------------------------------
// Strombelastbarkeit
// ---------------------------------------------------------------------------

export type Rechenweg = 'referenz-iz' | 'schultabelle';

/**
 * Strombelastbarkeit einer Leitung.
 *
 * Zwei Wege, die bewusst getrennt bleiben:
 *  - 'referenz-iz'   I_z aus der Referenztabelle, optional mit Temperaturfaktor
 *  - 'schultabelle'  vereinfachte Absicherungswerte der Berufsschule
 */
export function strombelastbarkeit(params: {
  querschnittMm2: number;
  weg: Rechenweg;
  temperaturC?: number;
}): RechenErgebnis {
  const { querschnittMm2, weg } = params;
  const temperaturC = params.temperaturC ?? 30;

  const iz = IZ_VERLEGEART_C[querschnittMm2];
  if (iz === undefined) {
    throw new Error(
      `Für ${querschnittMm2} mm² ist kein Referenzwert I_z hinterlegt.`,
    );
  }
  const schul = ABSICHERUNG_SCHULTABELLE[querschnittMm2];
  if (schul === undefined) {
    throw new Error(
      `Für ${querschnittMm2} mm² ist kein Schulwert hinterlegt.`,
    );
  }

  if (weg === 'schultabelle') {
    return {
      wert: schul,
      einheit: 'A',
      regel: 'Vereinfachter Absicherungswert (Berufsschultabelle/ZVEH-Systematik)',
      gesichert: holeFakt('absicherung-schultabelle')?.verification === 'geprueft',
      steps: [
        {
          label: 'Absicherungswert aus der Schultabelle ablesen',
          substitution: `${querschnittMm2} mm² → ${schul} A`,
          result: `I_b = ${schul} A`,
          factId: 'absicherung-schultabelle',
        },
        {
          label: 'Hinweis',
          result:
            'Dieses System ist eine vereinfachte Abstufung. Es ist nicht identisch ' +
            'mit der Referenzberechnung über I_z.',
        },
      ],
    };
  }

  const faktor = TEMPERATURFAKTOREN[temperaturC];
  if (faktor === undefined) {
    throw new Error(`Für ${temperaturC} °C ist kein Reduktionsfaktor hinterlegt.`);
  }
  const wert = iz * faktor;

  const steps: SolutionStep[] = [
    {
      label: 'I_z aus der Referenztabelle ablesen',
      substitution: `Verlegeart C, Cu, ${querschnittMm2} mm², ${temperaturC} °C → ${iz} A`,
      result: `I_z = ${iz} A`,
      factId: 'iz-tabelle-verlegeart-c',
    },
  ];

  if (temperaturC !== 30) {
    steps.push({
      label: 'Reduktionsfaktor für erhöhte Umgebungstemperatur',
      substitution: `Bezugstemperatur 30 °C, Umgebung ${temperaturC} °C → Faktor ${faktor}`,
      result: `I_z(korrigiert) = ${iz} A · ${faktor} = ${rund(wert, 2)} A`,
      factId: 'iz-temperatur-bezug',
    });
  }

  return {
    wert: rund(wert, 2),
    einheit: 'A',
    regel: 'Referenzwert I_z nach Verlegeart C, Cu, PVC, 30 °C',
    gesichert:
      holeFakt('iz-tabelle-verlegeart-c')?.verification === 'geprueft' &&
      holeFakt('iz-temperatur-bezug')?.verification === 'geprueft',
    steps,
  };
}

// ---------------------------------------------------------------------------
// Absicherung
// ---------------------------------------------------------------------------

export const STANDARD_ABSICHERUNGEN = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400] as const;

export type Kennlinie = 'B' | 'C' | 'D';

/**
 * Auswahl der Absicherung.
 *
 * Es wird die größte Standardabsicherung gewählt, die
 *   1. den Bemessungsstrom nicht überschreitet und
 *   2. den thermischen Auslösebereich (1,45 · In) der Leitung einhält.
 *
 * `weg` bestimmt, ob gegen I_z (Referenz) oder gegen den Schulwert gerechnet wird.
 */
export function waehleAbsicherung(params: {
  bemessungsstromA: number;
  querschnittMm2: number;
  weg: Rechenweg;
  kennlinie?: Kennlinie;
}): RechenErgebnis & { anlagentyp: Kennlinie; standardwertA: number } {
  const { bemessungsstromA, querschnittMm2, weg } = params;
  const kennlinie: Kennlinie = params.kennlinie ?? 'C';

  const grenzstrom = strombelastbarkeit({ querschnittMm2, weg });
  if (bemessungsstromA > grenzstrom.wert) {
    throw new Error(
      `Unzulässig: Bemessungsstrom ${bemessungsstromA} A übersteigt ` +
        `die Strombelastbarkeit ${grenzstrom.wert} A (${querschnittMm2} mm²).`,
    );
  }

  const thermischeGrenze = 1.45 * bemessungsstromA;

  const passend = STANDARD_ABSICHERUNGEN.filter(
    (inA) => inA <= grenzstrom.wert && 1.45 * inA <= grenzstrom.wert && inA <= thermischeGrenze,
  );
  const best = passend[passend.length - 1];
  if (best === undefined) {
    throw new Error(
      `Keine passende Standardabsicherung für ${querschnittMm2} mm² bei ` +
        `${bemessungsstromA} A gefunden.`,
    );
  }

  const magnetisch = holeFakt(`ls-kennlinie-${kennlinie.toLowerCase()}-magnetisch`);

  return {
    wert: best,
    einheit: 'A',
    anlagentyp: kennlinie,
    standardwertA: best,
    regel: grenzstrom.regel,
    gesichert: grenzstrom.gesichert,
    steps: [
      ...grenzstrom.steps,
      {
        label: 'Thermische Auslösegrenze der Leitung beachten',
        substitution: `1,45 · ${querschnittMm2} mm² → Grenze ${rund(1.45 * grenzstrom.wert, 2)} A`,
        result: `Absicherung darf ${grenzstrom.wert} A nicht überschreiten`,
      },
      {
        label: 'Größte passende Standardabsicherung wählen',
        substitution: `Bemessungsstrom ${bemessungsstromA} A`,
        result: `In = ${best} A, Kennlinie ${kennlinie}`,
      },
      {
        label: 'Magnetisches Auslösen der Kennlinie',
        substitution: `Kennlinie ${kennlinie}`,
        result: magnetisch?.bemerkung ?? '',
        factId: magnetisch?.id,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Abschaltbedingung und Schleifenwiderstand
// ---------------------------------------------------------------------------

/** R_A ≤ U₀ / I_Δn – der Wert wird immer hergeleitet, nie gemerkt. */
export function abschaltbedingung(params: { u0: number; idnA: number }): RechenErgebnis {
  const { u0, idnA } = params;
  const wert = u0 / idnA;
  return {
    wert: rund(wert, 1),
    einheit: 'Ω',
    regel: 'R_A ≤ U₀ / I_Δn',
    gesichert: true,
    steps: [
      {
        label: 'Zulässigen Wert für R_A berechnen',
        formula: 'R_A = U₀ / I_Δn',
        substitution: `${u0} V / ${idnA} A`,
        result: `R_A ≤ ${rund(wert, 1)} Ω`,
        factId: 'formel-abschaltbedingung',
      },
    ],
  };
}

/**
 * Kleinster Auslösestrom der Schutzmaßnahme.
 *
 * Maßgeblich für R_L ≤ U₀/I_a ist die UNTERE Grenze des magnetischen
 * Auslösebereichs, nicht die obere. Für Kennlinie C sind das 5 · In
 * (Bereich 5–10 · In).
 */
export function kleinsterAusloesestrom(inA: number, kennlinie: Kennlinie): number {
  const fakt = holeFakt(`ls-kennlinie-${kennlinie.toLowerCase()}-magnetisch-min`);
  const faktor = fakt?.wert;
  if (faktor === undefined) {
    throw new Error(`Für Kennlinie ${kennlinie} ist kein unterer Auslösefaktor hinterlegt.`);
  }
  return inA * faktor;
}

export function schleifenwiderstandGrenze(params: {
  u0: number;
  inA: number;
  kennlinie: Kennlinie;
}): RechenErgebnis {
  const ia = kleinsterAusloesestrom(params.inA, params.kennlinie);
  const wert = params.u0 / ia;
  return {
    wert: rund(wert, 1),
    einheit: 'Ω',
    regel: 'R_L ≤ U₀ / I_a',
    gesichert: true,
    steps: [
      {
        label: 'Kleinsten Auslösestrom ansetzen',
        substitution: `Kennlinie ${params.kennlinie}: I_a = ${ia / params.inA} · In = ${ia} A`,
        result: `I_a = ${ia} A`,
        factId: `ls-kennlinie-${params.kennlinie.toLowerCase()}-magnetisch-min`,
      },
      {
        label: 'Grenzwert des Schleifenwiderstands',
        formula: 'R_L = U₀ / I_a',
        substitution: `${params.u0} V / ${ia} A`,
        result: `R_L ≤ ${rund(wert, 1)} Ω`,
        factId: 'formel-schleifenwiderstand',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Strom und Leistung
// ---------------------------------------------------------------------------

export function stromEinphasig(p: {
  leistungW: number;
  uV: number;
  cosPhi: number;
}): RechenErgebnis {
  const wert = p.leistungW / (p.uV * p.cosPhi);
  return {
    wert: rund(wert, 2),
    einheit: 'A',
    regel: 'I = P / (U · cos φ)',
    gesichert: true,
    steps: [
      {
        label: 'Strom berechnen',
        formula: 'I = P / (U · cos φ)',
        substitution: `${p.leistungW} W / (${p.uV} V · ${p.cosPhi})`,
        result: `I = ${rund(wert, 2)} A`,
        factId: 'formel-strom-einphasig',
      },
    ],
  };
}

export function stromDrehstrom(p: {
  leistungW: number;
  uV: number;
  cosPhi: number;
}): RechenErgebnis {
  const wert = p.leistungW / (Math.sqrt(3) * p.uV * p.cosPhi);
  return {
    wert: rund(wert, 2),
    einheit: 'A',
    regel: 'I = P / (√3 · U · cos φ)',
    gesichert: true,
    steps: [
      {
        label: 'Strom berechnen',
        formula: 'I = P / (√3 · U · cos φ)',
        substitution: `${p.leistungW} W / (√3 · ${p.uV} V · ${p.cosPhi})`,
        result: `I = ${rund(wert, 2)} A`,
        factId: 'formel-strom-drehstrom',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Spannungsfall
// ---------------------------------------------------------------------------

export const SPANNUNGSFALL_GANZWERT = 3;
export const SPANNUNGSFALL_MAX = 5;

export function spannungsfall(params: {
  laengeM: number;
  stromA: number;
  querschnittMm2: number;
  u0?: number;
}): RechenErgebnis {
  const rho = 0.018;
  const u0 = params.u0 ?? 230;
  const wert = (2 * rho * params.laengeM * params.stromA * 100) / (params.querschnittMm2 * u0);
  const gerundet = rund(wert, 2);
  const bewertung =
    gerundet <= SPANNUNGSFALL_GANZWERT
      ? 'zulässig (≤ 3 %)'
      : gerundet <= SPANNUNGSFALL_MAX
        ? 'zulässig im Grenzbereich (≤ 5 %)'
        : 'nicht zulässig (> 5 %)';

  return {
    wert: gerundet,
    einheit: '%',
    regel: 'ΔU% = 2 · ρ · l · I / (A · U₀) · 100',
    gesichert: false, // ρ-Fakt und Grenzwerte sind als "offen" markiert
    steps: [
      {
        label: 'Spannungsfall berechnen',
        formula: 'ΔU% = 2 · ρ · l · I / (A · U₀) · 100',
        substitution:
          `2 · ${rho} · ${params.laengeM} m · ${params.stromA} A / ` +
          `(${params.querschnittMm2} mm² · ${u0} V) · 100`,
        result: `ΔU% = ${gerundet} %`,
        factId: 'formel-spannungsfall-einphasig',
      },
      {
        label: 'Bewertung',
        result: `Bewertung: ${bewertung}`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

export function rund(wert: number, stellen: number): number {
  const f = 10 ** stellen;
  return Math.round(wert * f) / f;
}

export function formatiereZahl(wert: number, stellen = 2): string {
  return wert.toFixed(stellen).replace('.', ',');
}
