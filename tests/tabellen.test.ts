import { describe, expect, it } from 'vitest';
import {
  ABSICHERUNG_SCHULTABELLE,
  IZ_VERLEGEART_C,
  TEMPERATURFAKTOREN,
} from '../src/content/facts/v1.0/leitungen.ts';

/**
 * Die Nachschlage-Tabellen sind im Prüfungszimmer die eine Wahrheit. Ein
 * Tippfehler in einem Wert würde hier niemand bemerken – deshalb wird die
 * Form der Tabellen selbst geprüft: vollständige Abstufung, monoton steigend,
 * Faktoren im physikalisch möglichen Bereich.
 */

const ABSTUFUNG = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95];

describe('Tabellen der Leitungsberechnung', () => {
  it('führen alle Abstufungen in beiden Tabellen', () => {
    for (const qs of ABSTUFUNG) {
      expect(IZ_VERLEGEART_C[qs], `I_z fehlt bei ${qs} mm²`).toBeDefined();
      expect(ABSICHERUNG_SCHULTABELLE[qs], `Schultabelle fehlt bei ${qs} mm²`).toBeDefined();
    }
  });

  it('steigen monoton mit dem Querschnitt', () => {
    const izz = ABSTUFUNG.map((qs) => IZ_VERLEGEART_C[qs]!);
    const schule = ABSTUFUNG.map((qs) => ABSICHERUNG_SCHULTABELLE[qs]!);
    for (let i = 1; i < izz.length; i++) {
      expect(izz[i], `I_z bei ${ABSTUFUNG[i]} mm²`).toBeGreaterThan(izz[i - 1]!);
      expect(schule[i], `Schultabelle bei ${ABSTUFUNG[i]} mm²`).toBeGreaterThan(schule[i - 1]!);
    }
  });

  it('halten die Temperaturfaktoren im plausiblen Bereich', () => {
    for (const [grad, faktor] of Object.entries(TEMPERATURFAKTOREN)) {
      expect(faktor, `Faktor bei ${grad} °C`).toBeGreaterThan(0);
      expect(faktor, `Faktor bei ${grad} °C`).toBeLessThanOrEqual(1.5);
    }
    // Bezugspunkt: Bei 30 °C ist der Faktor definitionsgemäß 1.
    expect(TEMPERATURFAKTOREN[30]).toBe(1);
  });

  it('lassen die beiden Rechenwege getrennt – Schultabelle ist keine I_z-Kopie', () => {
    for (const qs of ABSTUFUNG) {
      expect(ABSICHERUNG_SCHULTABELLE[qs]).not.toBe(IZ_VERLEGEART_C[qs]);
    }
  });
});
