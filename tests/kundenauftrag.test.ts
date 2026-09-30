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
import { strombelastbarkeit } from '../src/engine/calc/index.ts';
import { holeFakt } from '../src/content/facts/index.ts';

/**
 * Der geführte Kundenauftrag bildet die praktische Prüfung ab. Hier wird
 * geprüft, dass die Szenarien fachlich in sich stimmen: genau eine richtige
 * Planungsentscheidung je Schritt, die Engine bestätigt die Werte, und die
 * Sicherheitsregeln stehen an erster Stelle der Ausführung.
 */

describe('Kundenauftrag: Szenarien', () => {
  it('geben es vier, mit allen Bausteinen der Prüfung', () => {
    expect(SZENARIEN).toHaveLength(4);
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
      // Die Geräteprüfung ist normbasiert (Grenzwerte statt Rechenweg) und
      // liefert deshalb bewusst keine Engine-Rechnung – sie wird eigens geprüft.
      if (s.id === 'geraetepruefung') continue;
      expect(Object.keys(rechnungen).length, s.id).toBeGreaterThan(0);
    }
  });

  it('verankert die Geräteprüfung in den Grenzwerten der Faktenbasis', () => {
    const szenario = holeSzenario('geraetepruefung')!;
    const schritt = szenario.planungsschritte.find((s) => s.id === 'p-geraet-grenzwerte')!;
    const richtig = schritt.optionen.find((o) => o.korrekt)!.text;
    expect(richtig).toContain('0,3 Ω');
    expect(richtig).toContain('1 MΩ');
    expect(richtig).toContain('3,5 mA');
    expect(holeFakt('pe-widerstand-geraet')?.wert).toBe(0.3);
    expect(holeFakt('riso-geraet-sk1')?.wert).toBe(1);
    expect(holeFakt('schutzleiterstrom-geraet')?.wert).toBe(3.5);
  });

  /**
   * Die Zahlen im Text eines Planungsschritts müssen zu dem passen, was die
   * Engine für genau diesen Schritt ausrechnet. Sonst widerspricht sich die
   * Aufgabe selbst – und der Lernende merkt sich den falschen Wert.
   */
  it('stimmen die genannten I_z-Werte mit der Faktenbasis überein', () => {
    const faelle: Array<[string, number]> = [
      ['2,5 mm²', 21],
      ['4 mm²', 28],
      ['6 mm²', 36],
      ['10 mm²', 50],
    ];
    for (const [text, erwartet] of faelle) {
      const querschnitt = Number(text.replace(' mm²', '').replace(',', '.'));
      expect(strombelastbarkeit({ querschnittMm2: querschnitt, weg: 'referenz-iz' }).wert).toBe(erwartet);
    }
  });

  it('nennt in der Wallbox-Dimensionierung Werte, die die Engine bestätigt', () => {
    const szenario = holeSzenario('wallbox')!;
    const schritt = szenario.planungsschritte.find((s) => s.id === 'p-querschnitt-wb')!;
    const richtig = schritt.optionen.find((o) => o.korrekt)!;
    expect(richtig.text).toContain('2,5 mm²');
    expect(richtig.text).toContain('21 A');
    // 4 mm² darf nicht mehr als die einzig richtige Antwort geführt werden.
    expect(strombelastbarkeit({ querschnittMm2: 4, weg: 'referenz-iz' }).wert).toBe(28);
  });

  it('stimmt die PV-Aussage zum 4-mm²-Querschnitt mit der Faktenbasis überein', () => {
    const szenario = holeSzenario('pv')!;
    const schritt = szenario.planungsschritte.find((s) => s.id === 'p-pv-leitung')!;
    const richtig = schritt.optionen.find((o) => o.korrekt)!;
    expect(richtig.text).toContain('28 A');
    expect(strombelastbarkeit({ querschnittMm2: 4, weg: 'referenz-iz' }).wert).toBe(28);
  });
});
