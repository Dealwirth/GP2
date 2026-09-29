import { describe, expect, it } from 'vitest';
import {
  SZENARIEN,
  holeSzenario,
  bewertePlanung,
  bewerteReihenfolge,
  szenarioRechnung,
  FUENF_SICHERHEITSREGELN,
} from '../src/labor/kundenauftrag.ts';
import { rechne } from '../src/tasks/resolve.ts';

/**
 * Der geführte Kundenauftrag bildet die praktische Prüfung ab. Hier wird
 * geprüft, dass die Szenarien fachlich in sich stimmen: genau eine richtige
 * Planungsentscheidung je Schritt, die Engine bestätigt die Werte, und die
 * Sicherheitsregeln stehen an erster Stelle der Ausführung.
 */

describe('Kundenauftrag: Szenarien', () => {
  it('geben es drei, mit allen Bausteinen der Prüfung', () => {
    expect(SZENARIEN).toHaveLength(3);
    for (const s of SZENARIEN) {
      expect(s.planungsschritte.length, s.id).toBeGreaterThanOrEqual(4);
      expect(s.ausfuehrung.length, s.id).toBeGreaterThanOrEqual(4);
      expect(s.fachgespraech.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.bestand.length, s.id).toBeGreaterThan(0);
    }
  });

  it('haben je Planungsschritt genau eine richtige Option', () => {
    for (const s of SZENARIEN) {
      for (const schritt of s.planungsschritte) {
        const richtige = schritt.optionen.filter((o) => o.korrekt);
        expect(richtige, `${s.id}/${schritt.id}`).toHaveLength(1);
        expect(schritt.optionen.length, `${s.id}/${schritt.id}`).toBe(3);
      }
    }
  });

  it('beginnen die Ausführung immer mit dem Freischalten', () => {
    for (const s of SZENARIEN) {
      expect(s.ausfuehrung[0]?.id.startsWith('a-freischalten'), s.id).toBe(true);
    }
  });

  it('nennen die fünf Sicherheitsregeln vollständig', () => {
    expect(FUENF_SICHERHEITSREGELN).toHaveLength(5);
  });
});

describe('Kundenauftrag: Planungsbewertung', () => {
  const szenario = holeSzenario('waermepumpe')!;

  it('zählt nur die richtigen Entscheidungen', () => {
    const antworten: Record<string, number> = {};
    for (const schritt of szenario.planungsschritte) {
      antworten[schritt.id] = schritt.optionen.findIndex((o) => o.korrekt);
    }
    const ergebnis = bewertePlanung(szenario, antworten);
    expect(ergebnis.richtig).toBe(ergebnis.gesamt);
  });

  it('erkennt eine falsche Entscheidung', () => {
    const antworten: Record<string, number> = {};
    for (const schritt of szenario.planungsschritte) {
      const falschIndex = schritt.optionen.findIndex((o) => !o.korrekt);
      antworten[schritt.id] = falschIndex;
    }
    const ergebnis = bewertePlanung(szenario, antworten);
    expect(ergebnis.richtig).toBe(0);
  });
});

describe('Kundenauftrag: Ausführungsbewertung', () => {
  const szenario = holeSzenario('waermepumpe')!;

  it('nimmt die Musterreihenfolge an', () => {
    const reihenfolge = szenario.ausfuehrung.map((s) => s.id);
    expect(bewerteReihenfolge(szenario, reihenfolge).korrekt).toBe(true);
  });

  it('wirft eine Reihenfolge ohne Freischalten heraus', () => {
    const reihenfolge = szenario.ausfuehrung.slice(1).map((s) => s.id);
    const ergebnis = bewerteReihenfolge(szenario, reihenfolge);
    expect(ergebnis.korrekt).toBe(false);
    expect(ergebnis.begruendung).toMatch(/Freischalten|Sicherheitsregeln/);
  });

  it('nennt die Folge eines übersprungenen Schritts', () => {
    const reihenfolge = szenario.ausfuehrung.filter((s) => s.id !== 'a-pruefen').map((s) => s.id);
    const ergebnis = bewerteReihenfolge(szenario, reihenfolge);
    expect(ergebnis.korrekt).toBe(false);
    expect(ergebnis.begruendung).toMatch(/Protokoll|übersprungen/i);
  });
});

describe('Kundenauftrag: Engine-Rechnung', () => {
  it('bestätigt den Betriebsstrom der Wärmepumpe mit der echten Formel', () => {
    const r = rechne({
      art: 'strom-drehstrom',
      leistungW: 16000,
      u0FactId: 'u0-400',
      cosPhi: 0.92,
    });
    expect(r.wert).toBeCloseTo(25.1, 0);
  });

  it('liefert für jedes Szenario die Planungsrechnungen', () => {
    for (const s of SZENARIEN) {
      const rechnungen = szenarioRechnung(s.id);
      expect(Object.keys(rechnungen).length, s.id).toBeGreaterThan(0);
    }
  });
});
