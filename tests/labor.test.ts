import { describe, expect, it } from 'vitest';
import {
  anlageKennzahlen,
  leistungAusBezifferung,
  leereAnlage,
  musterAnlage,
  pruefeAnlage,
  type Anlage,
} from '../src/labor/stromlaufplan.ts';
import {
  PRUEFSCHRITTE,
  bewerteMesswert,
  bewerteProtokoll,
  formatiereZahl,
  grenzwert,
  leeresProtokoll,
  musterProtokoll,
} from '../src/labor/pruefprotokoll.ts';
import {
  starteStation,
  wendeAn,
  wendeFiAn,
  wendeTrafoAn,
  type StationsZustand,
} from '../src/labor/stationen.ts';
import { PHASEN, minuteAlsUhrzeit, phaseZurZeit, tagesUebersicht } from '../src/labor/ablauf.ts';
import { tageBis, naechsterTermin, bauePhasenplan, aktuellePhase, sortiereTermine } from '../src/domain/termine.ts';

describe('Stromlaufplan', () => {
  it('findet die fehlende Absicherung', () => {
    const anlage = leereAnlage();
    anlage.knoten = [
      { id: 'q', typ: 'quelle', bezeichnung: 'Netz', ueberspannung: 230 },
      { id: 'v', typ: 'verbraucher', bezeichnung: 'Lampe 100 W' },
    ];
    anlage.leitungen = [
      { id: 'l', von: 'q', nach: 'v', querschnitt: 1.5, verlegeart: 'A2', material: 'Cu', anzahlAdern: 3, laengeM: 5 },
    ];
    const befunde = pruefeAnlage(anlage);
    expect(befunde.some((b) => b.text.includes('nicht abgesichert'))).toBe(true);
    expect(befunde.some((b) => b.text.includes('Fehlerstromschutz'))).toBe(true);
  });

  it('meldet einen Leitungsschutzschalter, der größer ist als die Leitung', () => {
    const anlage: Anlage = musterAnlage();
    // 3000 W auf 1,5 mm² mit B16 – das kann nicht zulässig sein.
    anlage.leitungen = anlage.leitungen.map((l) =>
      l.id === 'w3' ? { ...l, querschnitt: 1.5 } : l,
    );
    const befunde = pruefeAnlage(anlage);
    expect(befunde.some((b) => b.text.includes('Belastbarkeit der Leitung'))).toBe(true);
  });

  it('erkennt einen unbekannten Knoten', () => {
    const anlage = leereAnlage();
    anlage.leitungen = [
      { id: 'l', von: 'q', nach: 'gibtsnicht', querschnitt: 1.5, verlegeart: 'A2', material: 'Cu', anzahlAdern: 3, laengeM: 1 },
    ];
    expect(pruefeAnlage(anlage).some((b) => b.schwere === 'fehler')).toBe(true);
  });

  it('liest Leistungen aus Bezifferungen', () => {
    expect(leistungAusBezifferung('Licht 1200 W')).toBe(1200);
    expect(leistungAusBezifferung('Heizung 2 kW')).toBe(2000);
    expect(leistungAusBezifferung('ohne Angabe')).toBeNull();
  });

  it('bewertet die Musteranlage', () => {
    const kennzahlen = anlageKennzahlen(musterAnlage());
    expect(kennzahlen.vollstaendig).toBe(true);
    expect(kennzahlen.fehler).toBe(0);
  });
});

describe('Prüfprotokoll', () => {
  it('kommt mit einer Grenze aus der Faktenbasis', () => {
    const schritt = PRUEFSCHRITTE.find((s) => s.id === 'isolationswiderstand')!;
    expect(schritt.grenze.art).toBe('fakt');
    expect(grenzwert(schritt)).toBe(1);
  });

  it('kommt beim Fehlerstrom mit mA statt A an', () => {
    const schritt = PRUEFSCHRITTE.find((s) => s.id === 'fehlerstrom')!;
    // Faktor liegt in Ampere (0,03), protokolliert wird in mA.
    expect(grenzwert(schritt)).toBe(30);
  });

  it('gibt bei Formelgrenzen kein erfundenes Urteil ab', () => {
    const schritt = PRUEFSCHRITTE.find((s) => s.id === 'durchgang-pe')!;
    expect(grenzwert(schritt)).toBeNull();
    expect(bewerteMesswert(schritt.id, 0.4, null, 'obergrenze').bestanden).toBeNull();
  });

  it('berechnet die Abschaltgrenze aus dem Kontext', () => {
    const eintraege = leeresProtokoll({ u0: 230, idnA: 0.03 });
    const pe = eintraege.find((e) => e.schrittId === 'durchgang-pe')!;
    // 230 V / 0,03 A = 7666,67 Ω
    expect(pe.grenze).toBeCloseTo(7666.67, 1);
  });

  it('bewertet Ober- und Untergrenzen in die richtige Richtung', () => {
    expect(bewerteMesswert('isolationswiderstand', 0.4, 1, 'untergrenze').bestanden).toBe(false);
    expect(bewerteMesswert('isolationswiderstand', 2, 1, 'untergrenze').bestanden).toBe(true);
    expect(bewerteMesswert('ausloesezeit', 0.28, 0.3, 'obergrenze').bestanden).toBe(true);
    expect(bewerteMesswert('ausloesezeit', 0.45, 0.3, 'obergrenze').bestanden).toBe(false);
  });

  it('findet die beiden eingebauten Fehler im Musterprotokoll', () => {
    const auswertung = bewerteProtokoll(musterProtokoll());
    expect(auswertung.bestanden).toBe(false);
    const ids = auswertung.fehlerhafte.map((s) => s.id);
    expect(ids).toContain('isolationswiderstand');
    expect(ids).toContain('spannungsfall');
  });

  it('rechnet Punkte nur für bestandene Schritte', () => {
    const leer = bewerteProtokoll(leeresProtokoll({ u0: 230, idnA: 0.03 }));
    expect(leer.offene).toHaveLength(PRUEFSCHRITTE.length);
    expect(leer.punkte).toBe(0);
    expect(leer.maxPunkte).toBeGreaterThan(0);
  });
});

describe('Laborstationen', () => {
  const start = (): StationsZustand => starteStation('ls').startZustand;

  it('meldet Überlast, wenn der Laststrom über der Absicherung liegt', () => {
    const { ereignisse } = wendeAn(start(), { art: 'lastAendern', nach: 6000 });
    expect(ereignisse.some((e) => e.art === 'fehler' && e.text.includes('überlastet'))).toBe(true);
  });

  it('meldet bei 1200 W auf 1,5 mm² keinen Überlastfehler des Leitungsschutzes', () => {
    const { ereignisse } = wendeAn(start(), { art: 'lastAendern', nach: 1200 });
    expect(ereignisse.some((e) => e.text.includes('überlastet'))).toBe(false);
  });

  it('löst den FI bei zu großem Fehlerstrom aus', () => {
    const station = starteStation('fi');
    let zustand: StationsZustand = { ...station.startZustand, fehlerstromMa: 45 };
    zustand = wendeFiAn(zustand, { art: 'fehlerstromAendern', nachMa: 45 }).zustand;
    const ergebnis = wendeFiAn(zustand, { art: 'fiAusloesen' });
    expect(ergebnis.zustand.fiAusgeloest).toBe(true);
    expect(ergebnis.ereignisse[0]?.effekt).toBe('ausloesen');
  });

  it('löst den FI bei zu kleinem Fehlerstrom nicht aus', () => {
    const zustand: StationsZustand = { ...starteStation('fi').startZustand, fehlerstromMa: 15 };
    const ergebnis = wendeFiAn(zustand, { art: 'fiAusloesen' });
    expect(ergebnis.zustand.fiAusgeloest).toBe(false);
    expect(ergebnis.ereignisse[0]?.effekt).toBe('keinSchutz');
  });

  it('verweigert die Auslösung bei dünnem PE und gekapptem Neutralleiter', () => {
    let zustand: StationsZustand = { ...starteStation('fi').startZustand, fehlerstromMa: 40, querschnittMm2: 1.5 };
    zustand = wendeFiAn(zustand, { art: 'neutralleiterTrennen' }).zustand;
    const ergebnis = wendeFiAn(zustand, { art: 'fiAusloesen' });
    expect(ergebnis.zustand.fiAusgeloest).toBe(false);
    expect(ergebnis.ereignisse[0]?.text).toContain('Schutzleiter');
  });

  it('meldet beim Trenntransformator die Überlast', () => {
    const zustand = starteStation('trafo').startZustand;
    const ergebnis = wendeTrafoAn(zustand, { art: 'lastAendern', nach: 6000 });
    expect(ergebnis.ereignisse[0]?.art).toBe('fehler');
  });

  it('schaltet die Sekundärseite spannungsfrei', () => {
    const ergebnis = wendeTrafoAn(starteStation('trafo').startZustand, { art: 'sekundaerAbschalten' });
    expect(ergebnis.zustand.sekundaerAus).toBe(true);
    expect(ergebnis.ereignisse[0]?.effekt).toBe('spannungAus');
  });

  it('ist deterministisch', () => {
    const a = wendeAn(start(), { art: 'kennlinieAendern', nach: 'B' });
    const b = wendeAn(start(), { art: 'kennlinieAendern', nach: 'B' });
    expect(a).toEqual(b);
  });
});

describe('Ablauf der praktischen Prüfung', () => {
  it('summiert 16 Stunden', () => {
    const tag1 = tagesUebersicht(1);
    const tag2 = tagesUebersicht(2);
    expect(tag1.dauerMinuten + tag2.dauerMinuten).toBe(16 * 60);
  });

  it('plant genau 20 Minuten Fachgespräch ein', () => {
    const gesamt = tagesUebersicht(1).gesprachsMinuten + tagesUebersicht(2).gesprachsMinuten;
    expect(gesamt).toBe(20);
  });

  it('übersetzt Prüfungsminuten in Uhrzeiten ab acht Uhr', () => {
    expect(minuteAlsUhrzeit(0)).toBe('08:00');
    expect(minuteAlsUhrzeit(60)).toBe('09:00');
  });

  it('findet die Phase zu einem Zeitpunkt', () => {
    expect(phaseZurZeit(0)?.id).toBe('p1-1');
    expect(phaseZurZeit(100)?.id).toBe('p1-2');
    expect(phaseZurZeit(100000)).toBeUndefined();
  });

  it('lässt die Phasen lückenlos aneinanderstoßen', () => {
    for (let i = 0; i < PHASEN.length - 1; i += 1) {
      expect(PHASEN[i]!.bisMin).toBe(PHASEN[i + 1]!.vonMin);
    }
  });
});

describe('Termine', () => {
  it('zählt die Tage bis zur schriftlichen Prüfung korrekt', () => {
    const tage = tageBis('2027-05-11', new Date('2026-09-28T12:00:00'));
    expect(tage).toBe(225);
  });

  it('liefert den nächsten anstehenden Termin', () => {
    const termin = naechsterTermin(new Date('2026-09-28T12:00:00'));
    expect(termin?.id).toBe('anmeldung-beginn');
  });

  it('sortiert chronologisch', () => {
    const sortiert = sortiereTermine();
    for (let i = 0; i < sortiert.length - 1; i += 1) {
      expect(sortiert[i]!.datum <= sortiert[i + 1]!.datum).toBe(true);
    }
  });

  it('baut einen Phasenplan, der die Prüfung nicht überschreitet', () => {
    const phasen = bauePhasenplan(new Date('2026-09-28T00:00:00'), '2027-06-07');
    expect(phasen).toHaveLength(5);
    expect(phasen[0]!.von).toBe('2026-09-28');
    expect(phasen[4]!.bis).toBe('2027-06-07');
  });

  it('findet die aktuelle Phase', () => {
    const phasen = bauePhasenplan(new Date('2026-09-28T00:00:00'), '2027-06-07');
    expect(aktuellePhase(phasen, new Date('2026-10-01T00:00:00'))?.id).toBe('grundlagen');
    expect(aktuellePhase(phasen, new Date('2030-01-01T00:00:00'))).toBeUndefined();
  });
});

describe('Zahlenformat', () => {
  it('schreibt deutsche Dezimalkomma ohne überflüssige Nullen', () => {
    expect(formatiereZahl(0.3, 2)).toBe('0,3');
    expect(formatiereZahl(1, 2)).toBe('1');
    expect(formatiereZahl(21, 0)).toBe('21');
    expect(formatiereZahl(2.5, 2)).toBe('2,5');
    expect(formatiereZahl(100, 2)).toBe('100');
  });

  it('kennt keinen Wert ohne Grenze', () => {
    expect(formatiereZahl(Number.NaN)).toBe('—');
  });
});

describe('Laborstationen – Zonierung', () => {
  it('übernimmt auch Parameteränderungen in der Fehlerstromstation', () => {
    // Ein Fehler hier hieße: Der Nutzer stellt den Fehlerstrom ein, es passiert
    // nichts, und der FI löst deshalb nie aus.
    const station = starteStation('fi');
    const ergebnis = wendeFiAn(station.startZustand, { art: 'fehlerstromAendern', nachMa: 45 });
    expect(ergebnis.zustand.fehlerstromMa).toBe(45);
  });

  it('übernimmt Parameteränderungen auch in der Trafostation', () => {
    const station = starteStation('trafo');
    const ergebnis = wendeTrafoAn(station.startZustand, { art: 'querschnittAendern', nach: 4 });
    expect(ergebnis.zustand.querschnittMm2).toBe(4);
  });

  it('führt nach dem Einstellen des Fehlerstroms zur Auslösung', () => {
    const station = starteStation('fi');
    const eingestellt = wendeFiAn(station.startZustand, { art: 'fehlerstromAendern', nachMa: 45 });
    const ausgeloest = wendeFiAn(eingestellt.zustand, { art: 'fiAusloesen' });
    expect(ausgeloest.zustand.fiAusgeloest).toBe(true);
  });

  it('löst bei exakt I_Δn nicht aus – die Grenze ist der Fehlerstrom', () => {
    const station = starteStation('fi');
    const eingestellt = wendeFiAn(station.startZustand, { art: 'fehlerstromAendern', nachMa: 30 });
    const ausgeloest = wendeFiAn(eingestellt.zustand, { art: 'fiAusloesen' });
    expect(ausgeloest.zustand.fiAusgeloest).toBe(false);
  });
});
