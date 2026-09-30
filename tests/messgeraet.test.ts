import { describe, expect, it } from 'vitest';
import {
  MESSAUFGABEN,
  bewerteMessung,
  formatZahl,
  messAnlage,
  messaufgabe,
  messartInfo,
  messen,
  punkteMitHinweisen,
  startGeraet,
  type Geraet,
} from '../src/labor/messgeraet.ts';
import { leeresProtokoll, trageMesswertEin } from '../src/labor/pruefprotokoll.ts';

/**
 * Ein Messgerät muss falsch messen können.
 *
 * Der Kern dieser Tests: Bei einer Fehlbedienung darf nicht „falsch" erscheinen,
 * sondern genau das, was ein echtes Gerät anzeigt. Ein Modell, das bei jedem
 * Fehler einen Fehlertext ausgibt, bringt für die Prüfung nichts – dort muss
 * man an der Anzeige erkennen, dass etwas nicht stimmt.
 */

const anlageUnterSpannung = messAnlage(true);
const anlageFrei = messAnlage(false);
const punkt = (id: string): { id: string; bezeichnung: string; potential: never; hinweis: string } =>
  anlageUnterSpannung.punkte.find((p) => p.id === id) as never;

const geraet = (patch: Partial<Geraet>): Geraet => ({ ...startGeraet(), ...patch });

describe('Richtige Messungen', () => {
  it('zeigt 230 V zwischen Außenleiter und Neutralleiter', () => {
    const anzeige = messen(
      geraet({ messart: 'spannung-ac', roteBuchse: 'VΩ' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('n'),
    );
    expect(anzeige.text).toBe('230,0');
    expect(anzeige.einheit).toBe('V');
    expect(anzeige.sinnvoll).toBe(true);
  });

  it('zeigt 400 V zwischen zwei Außenleitern', () => {
    const l2 = { id: 'l2', bezeichnung: 'Außenleiter L2', potential: 'L2' as const, hinweis: '' };
    const anzeige = messen(
      geraet({ messart: 'spannung-ac' }),
      anlageUnterSpannung,
      punkt('l1'),
      l2,
    );
    expect(anzeige.text).toBe('400,0');
  });

  it('zeigt 0 V zwischen N und PE', () => {
    const anzeige = messen(
      geraet({ messart: 'spannung-ac' }),
      anlageUnterSpannung,
      punkt('n'),
      punkt('pe'),
    );
    expect(anzeige.text).toBe('0,0');
    expect(anzeige.sinnvoll).toBe(true);
  });

  it('piept beim Durchgang zwischen PE-Klemme und Potentialausgleich', () => {
    const anzeige = messen(
      geraet({ messart: 'durchgang', roteBuchse: 'VΩ' }),
      anlageFrei,
      punkt('pe-klemme'),
      punkt('pas'),
    );
    expect(anzeige.text).toBe('0,4');
    expect(anzeige.warnung).toBeUndefined();
  });

  it('zeigt keinen Durchgang, wo keine Verbindung besteht', () => {
    const anzeige = messen(
      geraet({ messart: 'durchgang', roteBuchse: 'VΩ' }),
      anlageFrei,
      punkt('l1'),
      punkt('erder'),
    );
    expect(anzeige.text).toBe('O.L');
    expect(anzeige.wert).toBeNull();
  });
});

describe('Fehlbedienungen ergeben die echte Anzeige, keinen Fehlertext', () => {
  it('zeigt bei Widerstandsmessung an unter Spannung stehender Anlage O.L und warnt vor Geräteschaden', () => {
    const anzeige = messen(
      geraet({ messart: 'widerstand', roteBuchse: 'VΩ' }),
      anlageUnterSpannung,
      punkt('pe-klemme'),
      punkt('erder'),
    );
    expect(anzeige.text).toBe('O.L');
    expect(anzeige.gefahr).toBe('gerät');
    expect(anzeige.sinnvoll).toBe(false);
  });

  it('verbietet die Isolationsmessung an unter Spannung stehender Anlage', () => {
    const anzeige = messen(
      geraet({ messart: 'isolation', roteBuchse: 'VΩ' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('pe'),
    );
    expect(anzeige.gefahr).toBe('person');
    expect(anzeige.warnung).toContain('verboten');
  });

  it('liefert bei Gleichspannungsmessung an Wechselspannung keine verwertbare Zahl', () => {
    const anzeige = messen(
      geraet({ messart: 'spannung-dc', roteBuchse: 'VΩ' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('n'),
    );
    expect(anzeige.sinnvoll).toBe(false);
    expect(anzeige.warnung).toContain('Wechselspannung');
  });

  it('zeigt null, wenn die rote Leitung in der falschen Buchse steckt', () => {
    // Spannung messen wollen, Leitung aber in der Strom-Buchse.
    const anzeige = messen(
      geraet({ messart: 'spannung-ac', roteBuchse: 'mA' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('n'),
    );
    expect(anzeige.text).toBe('0,0');
    expect(anzeige.sinnvoll).toBe(false);
    expect(anzeige.warnung).toContain('VΩ');
  });

  it('erkennt die Strommessung parallel zur Spannung als Kurzschluss', () => {
    const anzeige = messen(
      geraet({ messart: 'strom-a', roteBuchse: 'A' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('n'),
    );
    expect(anzeige.gefahr).toBe('gerät');
    expect(anzeige.warnung).toContain('Reihe');
  });

  it('misst nichts, wenn das Gerät aus ist', () => {
    const anzeige = messen(
      geraet({ messart: 'aus' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('n'),
    );
    expect(anzeige.wert).toBeNull();
    expect(anzeige.sinnvoll).toBe(false);
  });

  it('zeigt 0 V, wenn beide Spitzen am selben Punkt liegen', () => {
    const anzeige = messen(
      geraet({ messart: 'spannung-ac' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('l1'),
    );
    expect(anzeige.text).toBe('0,0');
    expect(anzeige.sinnvoll).toBe(false);
  });

  it('zeigt 0 V, wenn die Anlage abgeschaltet ist', () => {
    const anzeige = messen(
      geraet({ messart: 'spannung-ac' }),
      anlageFrei,
      punkt('l1'),
      punkt('n'),
    );
    expect(anzeige.text).toBe('0,0');
    expect(anzeige.warnung).toContain('abgeschaltet');
  });
});

describe('Bewertung', () => {
  it('gibt die volle Punktzahl bei richtiger Einstellung, Buchse und Messort', () => {
    const aufgabe = messaufgabe('netzspannung');
    const g = geraet({ messart: 'spannung-ac', roteBuchse: 'VΩ' });
    const anzeige = messen(g, anlageUnterSpannung, punkt('l1'), punkt('n'));
    const befund = bewerteMessung(aufgabe, g, anlageUnterSpannung, 'l1', 'n', anzeige);

    expect(befund.richtig).toBe(true);
    expect(befund.punkte).toBe(aufgabe.punkte);
    expect(befund.maengel).toEqual([]);
  });

  it('nennt jede Fehlerart einzeln', () => {
    const aufgabe = messaufgabe('netzspannung');
    const g = geraet({ messart: 'spannung-dc', roteBuchse: 'mA' });
    const anzeige = messen(g, anlageUnterSpannung, punkt('n'), punkt('pe'));
    const befund = bewerteMessung(aufgabe, g, anlageUnterSpannung, 'n', 'pe', anzeige);

    expect(befund.richtig).toBe(false);
    expect(befund.punkte).toBe(0);
    expect(befund.maengel.join(' ')).toContain('Falsche Messart');
    expect(befund.maengel.join(' ')).toContain('Falsche Buchse');
    expect(befund.maengel.join(' ')).toContain('Falscher Messort');
  });

  it('wertet eine Messung an unter Spannung stehender Anlage als Mangel', () => {
    const aufgabe = messaufgabe('isolation');
    const g = geraet({ messart: 'isolation', roteBuchse: 'VΩ' });
    const anzeige = messen(g, anlageUnterSpannung, punkt('l1'), punkt('pe'));
    const befund = bewerteMessung(aufgabe, g, anlageUnterSpannung, 'l1', 'pe', anzeige);

    expect(befund.richtig).toBe(false);
    expect(befund.maengel.join(' ')).toContain('spannungsfrei');
  });

  it('akzeptiert vertauschte Messspitzen', () => {
    const aufgabe = messaufgabe('netzspannung');
    const g = geraet({ messart: 'spannung-ac', roteBuchse: 'VΩ' });
    const anzeige = messen(g, anlageUnterSpannung, punkt('l1'), punkt('n'));
    const befund = bewerteMessung(aufgabe, g, anlageUnterSpannung, 'n', 'l1', anzeige);
    expect(befund.richtig).toBe(true);
  });

  it('zieht für Hinweise Punkte ab, aber nur bis zu einer Grenze', () => {
    const aufgabe = messaufgabe('isolation');
    expect(punkteMitHinweisen(aufgabe, 0)).toBe(aufgabe.punkte);
    expect(punkteMitHinweisen(aufgabe, 1)).toBeLessThan(aufgabe.punkte);
    expect(punkteMitHinweisen(aufgabe, 3)).toBeGreaterThan(0);
    // Mehr als drei Hinweise kosten nicht mehr als drei.
    expect(punkteMitHinweisen(aufgabe, 9)).toBe(punkteMitHinweisen(aufgabe, 3));
  });
});

describe('Aufgabenbestand', () => {
  it('hat für jede Aufgabe eine gültige Messart und bekannte Messpunkte', () => {
    const vorhanden = new Set(anlageUnterSpannung.punkte.map((p) => p.id));
    for (const aufgabe of MESSAUFGABEN) {
      expect(messartInfo(aufgabe.messart).id, aufgabe.id).toBe(aufgabe.messart);
      expect(vorhanden.has(aufgabe.punktA), `${aufgabe.id}: ${aufgabe.punktA}`).toBe(true);
      expect(vorhanden.has(aufgabe.punktB), `${aufgabe.id}: ${aufgabe.punktB}`).toBe(true);
      expect(aufgabe.punkte).toBeGreaterThan(0);
    }
  });

  it('lässt jede Aufgabe mit der passenden Einstellung bestehen', () => {
    for (const aufgabe of MESSAUFGABEN) {
      const g = geraet({ messart: aufgabe.messart, roteBuchse: aufgabe.buchse });
      const anlage = aufgabe.spannungsfrei ? anlageFrei : anlageUnterSpannung;
      const a = anlage.punkte.find((p) => p.id === aufgabe.punktA)!;
      const b = anlage.punkte.find((p) => p.id === aufgabe.punktB)!;
      const anzeige = messen(g, anlage, a, b);
      const befund = bewerteMessung(aufgabe, g, anlage, aufgabe.punktA, aufgabe.punktB, anzeige);

      expect(befund.maengel, `${aufgabe.id} ließ sich nicht korrekt lösen`).toEqual([]);
      expect(anzeige.wert, `${aufgabe.id} zeigt keinen Wert`).not.toBeNull();
    }
  });
});

describe('Zahlendarstellung', () => {
  it('schreibt mit Komma, nicht mit Punkt', () => {
    expect(formatZahl(0.4)).toBe('0,4');
    expect(formatZahl(230, 1)).toBe('230,0');
  });
});

describe('Ableitstrom', () => {
  const aufgabe = MESSAUFGABEN.find((a) => a.id === 'ableitstrom-pe')!;

  it('zeigt im Betrieb den kleinen Schutzleiterstrom', () => {
    const anzeige = messen(
      geraet({ messart: 'ableitstrom', roteBuchse: 'mA' }),
      anlageUnterSpannung,
      punkt('pe'),
      punkt('pas'),
    );
    expect(anzeige.text).toBe('1,2');
    expect(anzeige.einheit).toBe('mA');
    expect(anzeige.sinnvoll).toBe(true);
    expect(anzeige.warnung).toBeUndefined();
  });

  it('zeigt am abgeschalteten Gerät null und weist darauf hin', () => {
    const anzeige = messen(
      geraet({ messart: 'ableitstrom', roteBuchse: 'mA' }),
      anlageFrei,
      punkt('pe'),
      punkt('pas'),
    );
    expect(anzeige.wert).toBe(0);
    expect(anzeige.sinnvoll).toBe(false);
    expect(anzeige.warnung).toContain('abgeschaltet');
  });

  it('verlangt den Schutzleiter als Messpunkt', () => {
    const anzeige = messen(
      geraet({ messart: 'ableitstrom', roteBuchse: 'mA' }),
      anlageUnterSpannung,
      punkt('l1'),
      punkt('n'),
    );
    expect(anzeige.sinnvoll).toBe(false);
    expect(anzeige.warnung).toContain('Schutzleiter');
  });

  it('verlangt die mA-Buchse', () => {
    const anzeige = messen(
      geraet({ messart: 'ableitstrom', roteBuchse: 'A' }),
      anlageUnterSpannung,
      punkt('pe'),
      punkt('pas'),
    );
    expect(anzeige.sinnvoll).toBe(false);
    expect(anzeige.warnung).toContain('mA');
  });

  it('erkennt eine richtige Ableitstrommessung als richtig', () => {
    const anzeige = messen(
      geraet({ messart: 'ableitstrom', roteBuchse: 'mA' }),
      anlageUnterSpannung,
      punkt('pe'),
      punkt('pas'),
    );
    const befund = bewerteMessung(aufgabe, geraet({ messart: 'ableitstrom', roteBuchse: 'mA' }), anlageUnterSpannung, 'pe', 'pas', anzeige);
    expect(befund.richtig).toBe(true);
    expect(befund.maengel).toEqual([]);
  });

  it('wertet eine Ableitstrommessung am abgeschalteten Gerät als Mangel', () => {
    const g = geraet({ messart: 'ableitstrom', roteBuchse: 'mA' });
    const anzeige = messen(g, anlageFrei, punkt('pe'), punkt('pas'));
    const befund = bewerteMessung(aufgabe, g, anlageFrei, 'pe', 'pas', anzeige);
    expect(befund.richtig).toBe(false);
    expect(befund.maengel.some((m) => m.includes('abgeschaltet'))).toBe(true);
  });
});

describe('Übernahme ins Prüfprotokoll', () => {
  it('trägt einen Wert in der passenden Einheit ein', () => {
    const eintraege = leeresProtokoll({ u0: 230, idnA: 0.03 });
    const ergebnis = trageMesswertEin(eintraege, 'durchgang-pe', 0.4, 'Ω', '2026-06-01T10:00:00.000Z');

    expect(ergebnis.uebernommen).toBe(true);
    const schritt = ergebnis.eintraege.find((e) => e.schrittId === 'durchgang-pe')!;
    expect(schritt.messwert).toBe(0.4);
    expect(schritt.durchgefuehrt).toBe(true);
    expect(schritt.zeitpunkt).toBe('2026-06-01T10:00:00.000Z');
  });

  it('weist eine falsche Einheit zurück, statt sie stillschweigend zu übernehmen', () => {
    const eintraege = leeresProtokoll({ u0: 230, idnA: 0.03 });
    const ergebnis = trageMesswertEin(eintraege, 'isolationswiderstand', 40, 'Ω');

    expect(ergebnis.uebernommen).toBe(false);
    expect(ergebnis.grund).toContain('MΩ');
    expect(ergebnis.eintraege).toBe(eintraege);
  });

  it('meldet einen unbekannten Schritt', () => {
    const eintraege = leeresProtokoll({ u0: 230, idnA: 0.03 });
    const ergebnis = trageMesswertEin(eintraege, 'gibt-es-nicht', 1, 'Ω');
    expect(ergebnis.uebernommen).toBe(false);
  });

  it('lässt die übrigen Einträge unberührt', () => {
    const eintraege = leeresProtokoll({ u0: 230, idnA: 0.03 });
    const ergebnis = trageMesswertEin(eintraege, 'schleifenwiderstand', 0.8, 'Ω');
    const andereVorher = eintraege.filter((e) => e.schrittId !== 'schleifenwiderstand');
    const andereNachher = ergebnis.eintraege.filter((e) => e.schrittId !== 'schleifenwiderstand');
    expect(andereNachher).toEqual(andereVorher);
  });
});
