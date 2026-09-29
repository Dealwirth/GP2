import { describe, expect, it } from 'vitest';
import {
  abschaltbedingung,
  ENGINE_VERSION,
  kleinsterAusloesestrom,
  schleifenwiderstandGrenze,
  spannungsfall,
  strombelastbarkeit,
  stromDrehstrom,
  stromEinphasig,
  waehleAbsicherung,
} from '../src/engine/calc/index.ts';

describe('Strombelastbarkeit', () => {
  it('liefert den Referenzwert I_z für Verlegeart C', () => {
    const r = strombelastbarkeit({ querschnittMm2: 2.5, weg: 'referenz-iz' });
    expect(r.wert).toBe(21);
    expect(r.regel).toContain('Referenzwert');
  });

  it('nutzt den Schulwert nur, wenn er ausdrücklich gewählt wird', () => {
    const schul = strombelastbarkeit({ querschnittMm2: 2.5, weg: 'schultabelle' });
    expect(schul.wert).toBe(20);
    expect(schul.regel).toContain('Vereinfachter');
  });

  it('weist die beiden Rechenwege als unterschiedlich aus', () => {
    const iz = strombelastbarkeit({ querschnittMm2: 2.5, weg: 'referenz-iz' });
    const schul = strombelastbarkeit({ querschnittMm2: 2.5, weg: 'schultabelle' });
    expect(iz.wert).not.toBe(schul.wert);
    expect(iz.regel).not.toBe(schul.regel);
  });

  it('reduziert bei erhöhter Umgebungstemperatur', () => {
    const kalt = strombelastbarkeit({ querschnittMm2: 10, weg: 'referenz-iz' });
    const warm = strombelastbarkeit({
      querschnittMm2: 10,
      weg: 'referenz-iz',
      temperaturC: 50,
    });
    expect(warm.wert).toBeLessThan(kalt.wert);
    // 50 A · 0,71 = 35,5 A
    expect(warm.wert).toBe(35.5);
  });

  it('wirft bei unbekanntem Querschnitt', () => {
    expect(() =>
      strombelastbarkeit({ querschnittMm2: 12, weg: 'referenz-iz' }),
    ).toThrow(/kein Referenzwert/);
  });
});

describe('Absicherung', () => {
  it('wählt die größte passende Standardabsicherung', () => {
    // 16 A Verbraucher, 2,5 mm²: I_z = 21 A, 1,45·In ≤ 21 → In ≤ 14,48
    // Standardabsicherung mit In ≤ min(16, 21, 14,48) = 13
    const r = waehleAbsicherung({
      bemessungsstromA: 16,
      querschnittMm2: 2.5,
      weg: 'referenz-iz',
    });
    expect(r.standardwertA).toBe(10);
  });

  it('lehnt eine überlastete Leitung ab', () => {
    expect(() =>
      waehleAbsicherung({
        bemessungsstromA: 30,
        querschnittMm2: 2.5,
        weg: 'referenz-iz',
      }),
    ).toThrow(/übersteigt/);
  });

  it('respektiert den Schulwert, wenn er der Weg ist', () => {
    const r = waehleAbsicherung({
      bemessungsstromA: 16,
      querschnittMm2: 2.5,
      weg: 'schultabelle',
    });
    // Schulwert 20 A, 1,45·In ≤ 20 → In ≤ 13,79 → 10 A
    expect(r.standardwertA).toBe(10);
  });
});

describe('Abschaltbedingung', () => {
  it('berechnet R_A für 230 V und 300 mA', () => {
    const r = abschaltbedingung({ u0: 230, idnA: 0.3 });
    expect(r.wert).toBe(766.7);
  });

  it('berechnet R_A für 50 V und 300 mA', () => {
    const r = abschaltbedingung({ u0: 50, idnA: 0.3 });
    expect(r.wert).toBe(166.7);
  });

  it('berechnet R_A für 24 V und 30 mA', () => {
    const r = abschaltbedingung({ u0: 24, idnA: 0.03 });
    expect(r.wert).toBe(800);
  });
});

describe('Schleifenwiderstand', () => {
  it('nutzt den kleinsten Auslösestrom der Kennlinie C', () => {
    // Kennlinie C: 5 × In = 5 · 16 A = 80 A
    expect(kleinsterAusloesestrom(16, 'C')).toBe(80);
    const r = schleifenwiderstandGrenze({ u0: 230, inA: 16, kennlinie: 'C' });
    expect(r.wert).toBe(2.9);
  });

  it('nutzt bei Kennlinie B den Faktor 3', () => {
    // B: 3 · 16 A = 48 A → 230 / 48 = 4,79 Ω
    const r = schleifenwiderstandGrenze({ u0: 230, inA: 16, kennlinie: 'B' });
    expect(r.wert).toBe(4.8);
  });
});

describe('Strom und Leistung', () => {
  it('rechnet den einphasigen Strom', () => {
    // 4600 W / (230 V · 0,9) = 22,22 A
    const r = stromEinphasig({ leistungW: 4600, uV: 230, cosPhi: 0.9 });
    expect(r.wert).toBe(22.22);
  });

  it('rechnet den dreiphasigen Strom', () => {
    // 25000 W / (√3 · 400 V · 0,8) = 45,11 A
    const r = stromDrehstrom({ leistungW: 25000, uV: 400, cosPhi: 0.8 });
    expect(r.wert).toBe(45.11);
  });
});

describe('Spannungsfall', () => {
  it('rechnet den Spannungsfall einer 30-m-Strecke', () => {
    // ΔU% = 2 · 0,018 · 30 · 20 / (2,5 · 230) · 100 = 3,76 %
    const r = spannungsfall({ laengeM: 30, stromA: 20, querschnittMm2: 2.5 });
    expect(r.wert).toBe(3.76);
    expect(r.steps[1]?.result).toContain('5 %');
  });

  it('bewertet einen zu großen Spannungsfall', () => {
    const r = spannungsfall({ laengeM: 60, stromA: 25, querschnittMm2: 2.5 });
    expect(r.wert).toBeGreaterThan(5);
    expect(r.steps[1]?.result).toContain('nicht zulässig');
  });

  it('markiert Ergebnisse als ungesichert, solange ρ offen ist', () => {
    const r = spannungsfall({ laengeM: 30, stromA: 20, querschnittMm2: 2.5 });
    expect(r.gesichert).toBe(false);
  });
});

describe('Engine-Version', () => {
  it('ist gesetzt und formatiert', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
