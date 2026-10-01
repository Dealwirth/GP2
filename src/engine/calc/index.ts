import type { SolutionStep } from '../../domain/types.ts';
import {
  ABSICHERUNG_SCHULTABELLE,
  IZ_VERLEGEART_C,
  TEMPERATURFAKTOREN,
} from '../../content/facts/v1.0/leitungen.ts';
import {
  HAEUFUNGSFAKTOREN,
  IZ_TABELLE,
  NENNQUERSCHNITTE,
  TEMPERATURFAKTOR_PVC,
} from '../../content/facts/v1.0/tabellen.ts';
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
  cosPhi?: number;
}): RechenErgebnis {
  const rho = 0.018;
  const u0 = params.u0 ?? 230;
  const cosPhi = params.cosPhi ?? 1;
  const wert =
    (2 * rho * params.laengeM * params.stromA * cosPhi * 100) / (params.querschnittMm2 * u0);
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
    regel: 'ΔU% = 2 · ρ · l · I · cos φ / (A · U₀) · 100',
    gesichert: false, // ρ-Fakt und Grenzwerte sind als "offen" markiert
    steps: [
      {
        label: 'Spannungsfall berechnen',
        formula: 'ΔU% = 2 · ρ · l · I · cos φ / (A · U₀) · 100',
        substitution:
          `2 · ${rho} · ${params.laengeM} m · ${params.stromA} A · ${cosPhi} / ` +
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

/**
 * Spannungsfall im Drehstromkreis.
 *
 * Hier wird nur der einfache Weg gerechnet – der Faktor 2 gilt für Hin- und
 * Rückleiter im Wechselstromkreis, im Drehstrom verteilt sich der Strom auf
 * drei Leiter. Deshalb steht die Wurzel aus drei im Nenner.
 */
export function spannungsfallDrehstrom(params: {
  laengeM: number;
  stromA: number;
  querschnittMm2: number;
  u0?: number;
  cosPhi?: number;
}): RechenErgebnis {
  const rho = 0.018;
  const u0 = params.u0 ?? 400;
  const cosPhi = params.cosPhi ?? 1;
  const wert = (rho * params.laengeM * params.stromA * cosPhi * 100) / (params.querschnittMm2 * u0);
  const gerundet = rund(wert, 2);
  return {
    wert: gerundet,
    einheit: '%',
    regel: 'ΔU% = ρ · l · I · cos φ / (A · U₀) · 100 (Drehstrom)',
    gesichert: false,
    steps: [
      {
        label: 'Spannungsfall im Drehstromkreis berechnen',
        formula: 'ΔU% = ρ · l · I · cos φ / (A · U₀) · 100',
        substitution:
          `${rho} · ${params.laengeM} m · ${params.stromA} A · ${cosPhi} / ` +
          `(${params.querschnittMm2} mm² · ${u0} V) · 100`,
        result: `ΔU% = ${gerundet} %`,
        factId: 'formel-spannungsfall-einphasig',
      },
    ],
  };
}

/**
 * Strombelastbarkeit mit Häufung und Temperaturkorrektur.
 *
 * Beide Reduktionsfaktoren wirken multiplikativ: Ein Kabel, das in einem
 * Bündel liegt und zusätzlich warmer Umgebung ausgesetzt ist, trägt beide
 * Abschläge. Ohne diese Rechnung entstünde eine Aufgabe, die es so nicht gibt.
 */
export function strombelastbarkeitKorrigiert(params: {
  querschnittMm2: number;
  verlegeart: string;
  stromkreise?: number;
  temperaturC?: number;
}): RechenErgebnis {
  const { querschnittMm2, verlegeart } = params;
  const stromkreise = params.stromkreise ?? 1;
  const temperaturC = params.temperaturC ?? 30;

  const iz = IZ_TABELLE[verlegeart]?.[querschnittMm2];
  if (iz === undefined) {
    throw new Error(`Für Verlegeart ${verlegeart} und ${querschnittMm2} mm² ist kein Wert hinterlegt.`);
  }
  const hFaktor = HAEUFUNGSFAKTOREN[stromkreise];
  if (hFaktor === undefined) {
    throw new Error(`Für ${stromkreise} Stromkreise ist kein Häufungsfaktor hinterlegt.`);
  }
  const tFaktor = TEMPERATURFAKTOR_PVC[temperaturC];
  if (tFaktor === undefined) {
    throw new Error(`Für ${temperaturC} °C ist kein Temperaturfaktor hinterlegt.`);
  }

  const wert = rund(iz * hFaktor * tFaktor, 2);
  return {
    wert,
    einheit: 'A',
    regel: `I_z(korrigiert) = I_z · f_Häufung · f_Temperatur (Verlegeart ${verlegeart}, PVC)`,
    gesichert: holeFakt('iz-tabelle-verlegeart-c')?.verification === 'geprueft',
    steps: [
      {
        label: 'Grundwert der Strombelastbarkeit ablesen',
        substitution: `Verlegeart ${verlegeart}, ${querschnittMm2} mm², 30 °C → ${iz} A`,
        result: `I_z = ${iz} A`,
        factId: `iz-verlegeart-${verlegeart.toLowerCase()}`,
      },
      {
        label: 'Häufungsfaktor ansetzen',
        substitution: `${stromkreise} Stromkreise → Faktor ${hFaktor}`,
        result: `I_z = ${iz} A · ${hFaktor} = ${rund(iz * hFaktor, 2)} A`,
        factId: 'haeufungsfaktoren',
      },
      {
        label: 'Temperaturfaktor ansetzen',
        substitution: `${temperaturC} °C → Faktor ${tFaktor}`,
        result: `I_z(korrigiert) = ${rund(iz * hFaktor, 2)} A · ${tFaktor} = ${wert} A`,
        factId: 'temperaturfaktor-pvc',
      },
    ],
  };
}

/**
 * Auswahl der Absicherung aus der Strombelastbarkeit.
 *
 * Wählt die größte genormte Absicherung, die den Betriebsstrom trägt und die
 * Leitung nicht überlastet (1,45 · I_n kleiner gleich I_z).
 */
export function absicherungWaehlen(params: {
  stromA: number;
  querschnittMm2: number;
  verlegeart: string;
}): RechenErgebnis {
  const grenzstrom = strombelastbarkeitKorrigiert({
    querschnittMm2: params.querschnittMm2,
    verlegeart: params.verlegeart,
  });
  const passend = STANDARD_ABSICHERUNGEN.filter(
    (inA) => inA >= params.stromA && 1.45 * inA <= grenzstrom.wert,
  );
  const best = passend[passend.length - 1];
  if (best === undefined) {
    throw new Error(
      `Keine passende Standardabsicherung für ${params.stromA} A bei ${grenzstrom.wert} A.`,
    );
  }
  return {
    wert: best,
    einheit: 'A',
    regel: 'I_b ≤ I_n ≤ I_z und 1,45 · I_n ≤ I_z',
    gesichert: grenzstrom.gesichert,
    steps: [
      ...grenzstrom.steps,
      {
        label: 'Größte passende Standardabsicherung wählen',
        substitution: `Betriebsstrom ${params.stromA} A, Belastbarkeit ${grenzstrom.wert} A`,
        result: `I_n = ${best} A`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Leistung, Strom und Widerstand
// ---------------------------------------------------------------------------

/** Wirkleistung aus Strom und Spannung im Drehstromnetz. */
export function leistungDrehstrom(params: {
  stromA: number;
  uV: number;
  cosPhi: number;
}): RechenErgebnis {
  const wert = Math.sqrt(3) * params.uV * params.stromA * params.cosPhi;
  return {
    wert: rund(wert, 1),
    einheit: 'W',
    regel: 'P = √3 · U · I · cos φ',
    gesichert: true,
    steps: [
      {
        label: 'Wirkleistung berechnen',
        formula: 'P = √3 · U · I · cos φ',
        substitution: `√3 · ${params.uV} V · ${params.stromA} A · ${params.cosPhi}`,
        result: `P = ${rund(wert, 1)} W`,
        factId: 'drehstrom-verketttung',
      },
    ],
  };
}

/** Scheinleistung aus Strom und Spannung. */
export function scheinleistung(params: { stromA: number; uV: number; drehstrom?: boolean }): RechenErgebnis {
  const faktor = params.drehstrom ? Math.sqrt(3) : 1;
  const wert = faktor * params.uV * params.stromA;
  return {
    wert: rund(wert, 1),
    einheit: 'VA',
    regel: params.drehstrom ? 'S = √3 · U · I' : 'S = U · I',
    gesichert: true,
    steps: [
      {
        label: 'Scheinleistung berechnen',
        formula: params.drehstrom ? 'S = √3 · U · I' : 'S = U · I',
        substitution: `${params.drehstrom ? '√3 · ' : ''}${params.uV} V · ${params.stromA} A`,
        result: `S = ${rund(wert, 1)} VA`,
      },
    ],
  };
}

/** Blindleistung aus Schein- und Wirkleistung. */
export function blindleistung(params: { scheinleistungVA: number; cosPhi: number }): RechenErgebnis {
  const wert = params.scheinleistungVA * Math.sin(Math.acos(params.cosPhi));
  return {
    wert: rund(wert, 1),
    einheit: 'var',
    regel: 'Q = S · sin φ',
    gesichert: true,
    steps: [
      {
        label: 'Blindleistung berechnen',
        formula: 'Q = S · sin φ',
        substitution: `${params.scheinleistungVA} VA · sin(arccos ${params.cosPhi})`,
        result: `Q = ${rund(wert, 1)} var`,
        factId: 'cosphi-bedeutung',
      },
    ],
  };
}

/** Leistungsfaktor aus Wirk- und Scheinleistung. */
export function leistungsfaktor(params: { wirkleistungW: number; scheinleistungVA: number }): RechenErgebnis {
  const wert = params.wirkleistungW / params.scheinleistungVA;
  return {
    wert: rund(wert, 3),
    einheit: '',
    regel: 'cos φ = P / S',
    gesichert: true,
    steps: [
      {
        label: 'Leistungsfaktor berechnen',
        formula: 'cos φ = P / S',
        substitution: `${params.wirkleistungW} W / ${params.scheinleistungVA} VA`,
        result: `cos φ = ${rund(wert, 3)}`,
        factId: 'cosphi-bedeutung',
      },
    ],
  };
}

/** Widerstand aus spezifischem Widerstand, Länge und Querschnitt. */
export function widerstandLeiter(params: {
  laengeM: number;
  querschnittMm2: number;
  rho?: number;
}): RechenErgebnis {
  const rho = params.rho ?? 0.018;
  const wert = (rho * params.laengeM) / params.querschnittMm2;
  return {
    wert: rund(wert, 4),
    einheit: 'Ω',
    regel: 'R = ρ · l / A',
    gesichert: true,
    steps: [
      {
        label: 'Leiterwiderstand berechnen',
        formula: 'R = ρ · l / A',
        substitution: `${rho} Ω·mm²/m · ${params.laengeM} m / ${params.querschnittMm2} mm²`,
        result: `R = ${rund(wert, 4)} Ω`,
        factId: 'rho-kupfer',
      },
    ],
  };
}

/** Widerstand bei abweichender Temperatur. */
export function widerstandTemperatur(params: {
  widerstand20: number;
  temperaturC: number;
  alpha?: number;
}): RechenErgebnis {
  const alpha = params.alpha ?? 0.00393;
  const wert = params.widerstand20 * (1 + alpha * (params.temperaturC - 20));
  return {
    wert: rund(wert, 4),
    einheit: 'Ω',
    regel: 'R(θ) = R₂₀ · (1 + α · (θ − 20 °C))',
    gesichert: true,
    steps: [
      {
        label: 'Widerstand bei Betriebstemperatur berechnen',
        formula: 'R(θ) = R₂₀ · (1 + α · (θ − 20 °C))',
        substitution: `${params.widerstand20} Ω · (1 + ${alpha} · (${params.temperaturC} − 20))`,
        result: `R = ${rund(wert, 4)} Ω`,
        factId: 'alpha-kupfer',
      },
    ],
  };
}

/** Scheinleistung des Drehstromnetzes aus der Wirkleistung. */
export function leistungEinphasig(params: { stromA: number; uV: number; cosPhi: number }): RechenErgebnis {
  const wert = params.uV * params.stromA * params.cosPhi;
  return {
    wert: rund(wert, 1),
    einheit: 'W',
    regel: 'P = U · I · cos φ',
    gesichert: true,
    steps: [
      {
        label: 'Wirkleistung berechnen',
        formula: 'P = U · I · cos φ',
        substitution: `${params.uV} V · ${params.stromA} A · ${params.cosPhi}`,
        result: `P = ${rund(wert, 1)} W`,
        factId: 'formel-strom-einphasig',
      },
    ],
  };
}

/** Leiterquerschnitt aus dem zulässigen Spannungsfall. */
export function querschnittAusSpannungsfall(params: {
  leistungW: number;
  laengeM: number;
  uV: number;
  cosPhi?: number;
  grenzProzent?: number;
  drehstrom?: boolean;
}): RechenErgebnis {
  const rho = 0.018;
  const cosPhi = params.cosPhi ?? 1;
  const grenze = params.grenzProzent ?? 3;
  const faktor = params.drehstrom ? 1 : 2;
  const spannungsfallV = (grenze / 100) * params.uV;
  const wert = (faktor * rho * params.laengeM * params.leistungW) / (params.uV * cosPhi * spannungsfallV);
  // Auf den nächsten genormten Querschnitt aufrunden.
  const genormt = NENNQUERSCHNITTE.find((q) => q >= wert) ?? wert;
  return {
    wert: genormt,
    einheit: 'mm²',
    regel: 'A = 2 · ρ · l · P / (U · cos φ · ΔU_zul)',
    gesichert: false,
    steps: [
      {
        label: 'Erforderlichen Querschnitt berechnen',
        formula: 'A = 2 · ρ · l · P / (U · cos φ · ΔU_zul)',
        substitution: `2 · ${rho} · ${params.laengeM} m · ${params.leistungW} W / (${params.uV} V · ${cosPhi} · ${spannungsfallV} V)`,
        result: `A_erf = ${rund(wert, 2)} mm²`,
      },
      {
        label: 'Nächsten genormten Querschnitt wählen',
        result: `A = ${genormt} mm² (aufgerundet)`,
        factId: 'nennquerschnitte',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Energie und Kosten
// ---------------------------------------------------------------------------

/** Elektrische Arbeit aus Leistung und Dauer. */
export function energiearbeit(params: { leistungW: number; stunden: number }): RechenErgebnis {
  const wert = (params.leistungW * params.stunden) / 1000;
  return {
    wert: rund(wert, 2),
    einheit: 'kWh',
    regel: 'W = P · t',
    gesichert: true,
    steps: [
      {
        label: 'Elektrische Arbeit berechnen',
        formula: 'W = P · t',
        substitution: `${params.leistungW} W · ${params.stunden} h / 1000`,
        result: `W = ${rund(wert, 2)} kWh`,
        factId: 'arbeit-formel',
      },
    ],
  };
}

/** Stromkosten aus Arbeit und Preis. */
export function stromkosten(params: { kWh: number; centProKwh: number }): RechenErgebnis {
  const wert = (params.kWh * params.centProKwh) / 100;
  return {
    wert: rund(wert, 2),
    einheit: '€',
    regel: 'Kosten = Arbeit · Preis',
    gesichert: true,
    steps: [
      {
        label: 'Stromkosten berechnen',
        formula: 'Kosten = W · Preis',
        substitution: `${params.kWh} kWh · ${params.centProKwh} ct/kWh`,
        result: `Kosten = ${rund(wert, 2)} €`,
      },
    ],
  };
}

/** Amortisationszeit einer Investition. */
export function amortisation(params: { investitionEuro: number; jahresersparnisEuro: number }): RechenErgebnis {
  const wert = params.investitionEuro / params.jahresersparnisEuro;
  return {
    wert: rund(wert, 1),
    einheit: 'Jahre',
    regel: 'Amortisation = Investition / jährliche Einsparung',
    gesichert: true,
    steps: [
      {
        label: 'Amortisationszeit berechnen',
        formula: 't = Investition / Einsparung',
        substitution: `${params.investitionEuro} € / ${params.jahresersparnisEuro} €/a`,
        result: `t = ${rund(wert, 1)} Jahre`,
        factId: 'amortisation',
      },
    ],
  };
}

/** Wärmemenge aus Heizlast, Betriebsstunden und Jahresarbeitszahl. */
export function waermepumpeStrombedarf(params: {
  heizlastKW: number;
  vollbenutzungsstunden: number;
  jaz: number;
}): RechenErgebnis {
  const waerme = params.heizlastKW * params.vollbenutzungsstunden;
  const wert = waerme / params.jaz;
  return {
    wert: rund(wert, 0),
    einheit: 'kWh',
    regel: 'W_el = Q_Heiz / JAZ',
    gesichert: true,
    steps: [
      {
        label: 'Jahreswärmebedarf berechnen',
        formula: 'Q = P_Heizlast · Vollbenutzungsstunden',
        substitution: `${params.heizlastKW} kW · ${params.vollbenutzungsstunden} h`,
        result: `Q = ${rund(waerme, 0)} kWh`,
      },
      {
        label: 'Strombedarf über die Jahresarbeitszahl',
        formula: 'W_el = Q / JAZ',
        substitution: `${rund(waerme, 0)} kWh / ${params.jaz}`,
        result: `W_el = ${rund(wert, 0)} kWh`,
        factId: 'waermepumpe-jaz-luft',
      },
    ],
  };
}

/** PV-Jahresertrag aus Nennleistung und spezifischem Ertrag. */
export function pvErtrag(params: { leistungKWp: number; ertragProKWp: number }): RechenErgebnis {
  const wert = params.leistungKWp * params.ertragProKWp;
  return {
    wert: rund(wert, 0),
    einheit: 'kWh',
    regel: 'Ertrag = P_peak · spezifischer Ertrag',
    gesichert: true,
    steps: [
      {
        label: 'Jahresertrag berechnen',
        substitution: `${params.leistungKWp} kWp · ${params.ertragProKWp} kWh/kWp`,
        result: `Ertrag = ${rund(wert, 0)} kWh/a`,
        factId: 'pv-modulwirkungsgrad',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Sonstige Größen
// ---------------------------------------------------------------------------

/**
 * Prozentwert einer Bezugsgröße.
 *
 * Für Aufgaben der Art „Wie viel Prozent beträgt der Spannungsfall?" oder
 * „Wie hoch ist die Auslastung der Leitung?". Ohne diese Rechnung müsste der
 * Prüfling die Prozentrechnung selbst ansetzen – was selten das Lernziel ist.
 */
export function prozentwert(params: { wert: number; bezug: number }): RechenErgebnis {
  const wert = (params.wert / params.bezug) * 100;
  return {
    wert: rund(wert, 1),
    einheit: '%',
    regel: 'p = (Wert / Bezug) · 100',
    gesichert: true,
    steps: [
      {
        label: 'Prozentwert berechnen',
        formula: 'p = (Wert / Bezug) · 100',
        substitution: `(${params.wert} / ${params.bezug}) · 100`,
        result: `p = ${rund(wert, 1)} %`,
      },
    ],
  };
}

/** Sicherungsauswahl aus dem Anlaufstrom (Motorschutz). */
export function motorstrom(params: { leistungKW: number; uV: number; cosPhi: number; wirkungsgrad: number }): RechenErgebnis {
  const wert = (params.leistungKW * 1000) / (Math.sqrt(3) * params.uV * params.cosPhi * params.wirkungsgrad);
  return {
    wert: rund(wert, 2),
    einheit: 'A',
    regel: 'I = P / (√3 · U · cos φ · η)',
    gesichert: true,
    steps: [
      {
        label: 'Bemessungsstrom des Motors berechnen',
        formula: 'I = P / (√3 · U · cos φ · η)',
        substitution: `${params.leistungKW * 1000} W / (√3 · ${params.uV} V · ${params.cosPhi} · ${params.wirkungsgrad})`,
        result: `I = ${rund(wert, 2)} A`,
      },
    ],
  };
}

/** Auslösestrom der Fehlerstrom-Schutzeinrichtung in Ampere aus Milliampere. */
export function rcdStromAusMilliampere(params: { milliampere: number }): RechenErgebnis {
  const wert = params.milliampere / 1000;
  return {
    wert: rund(wert, 3),
    einheit: 'A',
    regel: 'IΔn in Ampere = Milliampere / 1000',
    gesichert: true,
    steps: [
      {
        label: 'Fehlerstrom in Ampere umrechnen',
        substitution: `${params.milliampere} mA / 1000`,
        result: `IΔn = ${rund(wert, 3)} A`,
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
