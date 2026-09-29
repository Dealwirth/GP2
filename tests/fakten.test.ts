import { describe, expect, it } from 'vitest';
import {
  FAKTEN,
  FAKTEN_VERSION,
  faktBericht,
  gueltigAm,
  holeFakt,
  holePflichtFakt,
  offeneFakten,
} from '../src/content/facts/index.ts';
import { QUELLEN } from '../src/content/facts/quellen.ts';
import {
  GEWICHTE_SUMME,
  PRUEFUNGSBEREICHE,
  bewerteNachParagraf15,
  istAusreichendOderBesser,
  punkteZuNote,
} from '../src/content/syllabus/exam.ts';
import { leererZustand, wendeVersuchAn } from '../src/domain/stateMachine.ts';

describe('Faktenbasis', () => {
  it('enthält keine doppelten IDs', () => {
    const ids = FAKTEN.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('verweist für jeden Fakt auf eine bekannte Quelle', () => {
    for (const f of FAKTEN) {
      expect(QUELLEN[f.quelleId], `Quelle ${f.quelleId} fehlt`).toBeDefined();
    }
  });

  it('trägt bei jeder ID die aktive Version', () => {
    for (const f of FAKTEN) {
      expect(f.version).toBe(FAKTEN_VERSION);
    }
  });

  it('liefert bei unbekannter ID einen klaren Fehler', () => {
    expect(() => holePflichtFakt('gibt-es-nicht')).toThrow(/existiert nicht/);
    expect(holeFakt('gibt-es-nicht')).toBeUndefined();
  });

  it('weist offene Fakten aus, damit sie nie als gesichert erscheinen', () => {
    const bericht = faktBericht();
    expect(bericht.offen).toBe(offeneFakten().length);
    expect(bericht.offen).toBeGreaterThan(0);
    expect(bericht.gesamt).toBe(bericht.geprueft + bericht.offen);
  });

  it('behandelt abgelaufene Fakten als nicht gültig', () => {
    const f = holeFakt('u0-230');
    expect(f).toBeDefined();
    expect(gueltigAm(f!, new Date('2020-01-01'))).toBe(false);
    expect(gueltigAm(f!, new Date('2027-05-01'))).toBe(true);
  });
});

describe('Prüfungsrahmen', () => {
  it('ergibt zusammen 100 Prozent Gewichtung', () => {
    expect(GEWICHTE_SUMME).toBe(100);
  });

  it('trägt die Gewichte aus der ElekAusbV', () => {
    expect(PRUEFUNGSBEREICHE.kundenauftrag.weightPercent).toBe(36);
    expect(PRUEFUNGSBEREICHE.systementwurf.weightPercent).toBe(12);
    expect(PRUEFUNGSBEREICHE.funktionsanalyse.weightPercent).toBe(12);
    expect(PRUEFUNGSBEREICHE.wiso.weightPercent).toBe(10);
    expect(PRUEFUNGSBEREICHE.teil1.weightPercent).toBe(30);
  });

  it('rechnet die Prüfungszeiten korrekt um', () => {
    expect(PRUEFUNGSBEREICHE.systementwurf.minutes).toBe(120);
    expect(PRUEFUNGSBEREICHE.funktionsanalyse.minutes).toBe(120);
    expect(PRUEFUNGSBEREICHE.wiso.minutes).toBe(60);
    expect(PRUEFUNGSBEREICHE.kundenauftrag.minutes).toBe(960);
  });
});

describe('Notenskala', () => {
  it('ordnet Punktzahlen Notenstufen zu', () => {
    expect(punkteZuNote(95)).toBe(1.0);
    expect(punkteZuNote(85)).toBe(1.5);
    expect(punkteZuNote(70)).toBe(2.0);
    expect(punkteZuNote(55)).toBe(3.0);
    expect(punkteZuNote(35)).toBe(4.0);
    expect(punkteZuNote(10)).toBe(5.0);
    expect(punkteZuNote(0)).toBe(6.0);
  });

  it('bewertet "ausreichend" korrekt', () => {
    expect(istAusreichendOderBesser(4.0)).toBe(true);
    expect(istAusreichendOderBesser(4.5)).toBe(false);
  });
});

describe('Bestehensregelung § 15', () => {
  it('besteht bei durchgängig ausreichenden Noten', () => {
    const u = bewerteNachParagraf15({
      teil1: 3.0,
      kundenauftrag: 3.0,
      systementwurf: 3.5,
      funktionsanalyse: 3.0,
      wiso: 4.0,
    });
    expect(u.bestanden).toBe(true);
    expect(u.pruefpunkte.every((p) => p.erfuellt)).toBe(true);
  });

  it('besteht NICHT, wenn der Kundenauftrag schlecht ist', () => {
    const u = bewerteNachParagraf15({
      teil1: 2.0,
      kundenauftrag: 4.5,
      systementwurf: 2.0,
      funktionsanalyse: 2.0,
      wiso: 2.0,
    });
    expect(u.bestanden).toBe(false);
    const kunde = u.pruefpunkte.find((p) => p.label.startsWith('Kundenauftrag'));
    expect(kunde?.erfuellt).toBe(false);
  });

  it('besteht NICHT bei nur einem weiteren ausreichenden Bereich', () => {
    const u = bewerteNachParagraf15({
      teil1: 2.0,
      kundenauftrag: 3.0,
      systementwurf: 3.0,
      funktionsanalyse: 4.5,
      wiso: 4.5,
    });
    expect(u.bestanden).toBe(false);
  });

  it('besteht NICHT bei einem ungenügenden Bereich', () => {
    const u = bewerteNachParagraf15({
      teil1: 1.0,
      kundenauftrag: 1.0,
      systementwurf: 1.0,
      funktionsanalyse: 1.0,
      wiso: 6.0,
    });
    expect(u.bestanden).toBe(false);
  });
});

describe('Lernzustand', () => {
  const start = new Date('2027-01-10T08:00:00Z');
  const tage = (n: number) => new Date(start.getTime() + n * 86_400_000);

  it('befördert erst nach drei sicheren Antworten über mehrere Tage', () => {
    let z = leererZustand('t1');
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, start);
    expect(z.state).toBe('gesehen');
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, tage(1));
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, tage(2));
    // Dritter Treffer, aber erst zwei Tage Abstand – noch nicht gefestigt.
    expect(z.state).toBe('gesehen');
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, tage(4));
    expect(z.state).toBe('gefestigt');
    expect(z.correctStreak).toBe(4);
  });

  it('vergisst: nach Festigung widerlegt eine falsche Antwort', () => {
    let z = leererZustand('t1');
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, start);
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, tage(1));
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, tage(2));
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, tage(4));
    expect(z.state).toBe('gefestigt');

    z = wendeVersuchAn(z, { type: 'falsch', sicherheit: 'sicher' }, tage(6));
    expect(z.state).toBe('unsicher');
    expect(z.correctStreak).toBe(0);
  });

  it('zählt geraten nicht als Fortschritt', () => {
    let z = leererZustand('t1');
    for (let i = 0; i < 6; i += 1) {
      z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'geraten' }, tage(i));
    }
    expect(z.state).not.toBe('gefestigt');
    expect(z.correctStreak).toBe(0);
    expect(z.hitRate).toBe(1);
    expect(z.confidenceRate).toBe(0);
  });

  it('trennt Trefferquote von Selbstvertrauen', () => {
    let z = leererZustand('t1');
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, start);
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'geraten' }, tage(1));
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'unsicher' }, tage(2));
    expect(z.hitRate).toBe(1);
    expect(z.confidenceRate).toBeCloseTo(1 / 3, 5);
  });

  it('stuft einen Prüfungsreifen nach einem Fehler auf "gefestigt" ab', () => {
    let z = leererZustand('t1');
    z = { ...z, state: 'pruefungsreif', labSolved: true };
    z = wendeVersuchAn(z, { type: 'falsch', sicherheit: 'sicher' }, start);
    expect(z.state).toBe('gefestigt');
  });
});
