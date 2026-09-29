import { describe, expect, it } from 'vitest';
import {
  ATOME,
  KAPITEL,
  abdeckung,
  atomeVonBereich,
  curriculumKennzahlen,
  faelligeThemen,
  fehlerkorbThemen,
  holeAtom,
  reife,
  schwacheThemen,
} from '../src/content/curriculum/index.ts';
import { leererZustand, wendeVersuchAn } from '../src/domain/stateMachine.ts';
import type { TopicStateRecord } from '../src/domain/types.ts';
import { PRUEFUNGSBEREICHE, TEIL2_BEREICHE } from '../src/content/syllabus/exam.ts';

describe('Lernpfad', () => {
  it('deckt jeden Prüfungsbereich von Teil 2 ab', () => {
    for (const bereich of TEIL2_BEREICHE) {
      expect(atomeVonBereich(bereich).length, `${bereich} ohne Atome`).toBeGreaterThan(0);
    }
  });

  it('hat eindeutige IDs ohne Sonderzeichen', () => {
    const ids = ATOME.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('gibt jedem Atom Prüfungsbereich, Position und Lernziel', () => {
    for (const atom of ATOME) {
      expect(atom.titel.length).toBeGreaterThan(2);
      expect(atom.l.length).toBeGreaterThan(10);
      expect(atom.position).toMatch(/§/);
      expect(atom.gewicht).toBeGreaterThanOrEqual(1);
    }
  });

  it('verweist auf eine bestehende Berufsbildposition', () => {
    const positionen = new Set(KAPITEL.map((k) => k.position));
    for (const atom of ATOME) {
      expect(positionen.has(atom.position)).toBe(true);
    }
  });

  it('meldet eine Kennzahl für jeden Bereich', () => {
    const k = curriculumKennzahlen();
    expect(k.atome).toBe(ATOME.length);
    expect(k.kapitel).toBe(KAPITEL.length);
    for (const bereich of TEIL2_BEREICHE) {
      expect(k.jeBereich[bereich]).toBeGreaterThan(0);
    }
  });

  it('findet Atome über ihre ID', () => {
    const erstes = ATOME[0];
    expect(erstes).toBeDefined();
    expect(holeAtom(erstes!.id)?.id).toBe(erstes!.id);
    expect(holeAtom('gibt-es-nicht')).toBeUndefined();
  });
});

describe('Fortschritt', () => {
  function zustaendeFuer(ids: string[], treffer = 1): Map<string, TopicStateRecord> {
    const map = new Map<string, TopicStateRecord>();
    const start = new Date('2027-01-01T08:00:00Z');
    for (const id of ids) {
      let z = leererZustand(id);
      for (let i = 0; i < 4; i += 1) {
        z = wendeVersuchAn(
          z,
          { type: treffer > 0.5 ? 'richtig' : 'falsch', sicherheit: 'sicher' },
          new Date(start.getTime() + i * 86_400_000),
        );
      }
      map.set(id, z);
    }
    return map;
  }

  it('misst eine leere Abdeckung ohne Lernstand', () => {
    const a = abdeckung(new Map(), 'kundenauftrag');
    expect(a.quote).toBe(0);
    expect(a.begonnen).toBe(0);
  });

  it('zählt gefestigte Atome als Abdeckung', () => {
    const ids = atomeVonBereich('wiso')
      .slice(0, 5)
      .map((a) => a.id);
    const map = zustaendeFuer(ids);
    const a = abdeckung(map, 'wiso');
    expect(a.begonnen).toBe(5);
    expect(a.quote).toBeGreaterThan(0);
  });

  it('liefert bei Null Fortschritt den Reifegrad 0', () => {
    expect(reife(new Map(), 'kundenauftrag')).toBe(0);
  });

  it('stellt verfallene Themen zur Wiederholung bereit', () => {
    const zustand: TopicStateRecord = {
      ...leererZustand('ka-verteilung-01'),
      state: 'ueberfaellig',
      answered: 3,
      nextDue: '2020-01-01T00:00:00.000Z',
    };
    const faellig = faelligeThemen(new Map([[zustand.topicId, zustand]]));
    expect(faellig.map((a) => a.id)).toContain('ka-verteilung-01');
  });

  it('sammelt unsichere Themen im Fehlerkorb', () => {
    const zustand: TopicStateRecord = {
      ...leererZustand('ka-messen-01'),
      state: 'unsicher',
      answered: 4,
      hitRate: 0.25,
      lastSeen: '2026-09-01T00:00:00.000Z',
    };
    const korb = fehlerkorbThemen(new Map([[zustand.topicId, zustand]]));
    expect(korb.map((a) => a.id)).toContain('ka-messen-01');
  });

  it('schlägt bei gleichem Stand das gewichtigere Thema vor', () => {
    const ohneFortschritt = schwacheThemen(new Map(), 5);
    expect(ohneFortschritt.length).toBe(5);
    const erstes = ohneFortschritt[0];
    expect(erstes).toBeDefined();
    // Nach dem Start sollen zuerst die schwer gewichteten Themen kommen.
    expect(erstes!.gewicht).toBeGreaterThanOrEqual(1);
  });

  it('bevorzugt tatsächlich schwächere Themen', () => {
    const starker = holeAtom('wiso-umwelt-01')!;
    const map = new Map<string, TopicStateRecord>();
    // Ein starkes Thema aus dem WiSo, ein schwaches aus dem Kundenauftrag.
    let z = leererZustand(starker.id);
    for (let i = 0; i < 5; i += 1) {
      z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' });
    }
    map.set(starker.id, z);
    const vorschlaege = schwacheThemen(map, 3);
    expect(vorschlaege.map((a) => a.id)).not.toContain(starker.id);
  });
});

describe('Vollständigkeit gegen die Verordnung', () => {
  it('bildet jede Berufsbildposition des § 4 Abs. 5 ab', () => {
    // Die vier fachrichtungsübergreifend integrativ zu vermittelnden
    // Berufsbildpositionen. Fehlt eine, fehlt ein ganzes Prüfungsthema.
    const gefordert = [
      '§ 4 Abs. 5 Nr. 1',
      '§ 4 Abs. 5 Nr. 3',
      '§ 4 Abs. 5 Nr. 4',
    ];
    const alle = KAPITEL.map((k) => k.position).join(' | ');
    for (const position of gefordert) {
      expect(alle, `Berufsbildposition ${position} ist keinem Kapitel zugeordnet`).toContain(
        position,
      );
    }
  });

  it('deckt jeden Prüfungsbereich von Teil 2 mit Kapiteln ab', () => {
    for (const bereich of TEIL2_BEREICHE) {
      const kapitel = KAPITEL.filter((k) => k.bereich === bereich);
      expect(kapitel.length, `Kein Kapitel für ${PRUEFUNGSBEREICHE[bereich].label}`).toBeGreaterThan(
        0,
      );
    }
  });

  it('verweist für jeden Prüfungsbereich auf den Paragrafen der Verordnung', () => {
    // Die Paragrafen der Prüfungsbereiche aus § 10 bis § 14 ElekAusbV.
    const erwartet: Record<string, string> = {
      kundenauftrag: '§ 11',
      systementwurf: '§ 12',
      funktionsanalyse: '§ 13',
      wiso: '§ 14',
    };
    for (const [bereich, paragraph] of Object.entries(erwartet)) {
      const alle = KAPITEL.filter((k) => k.bereich === bereich)
        .map((k) => k.position)
        .join(' | ');
      expect(alle, `${bereich} verweist nicht auf ${paragraph}`).toContain(paragraph);
    }
  });

  it('gibt jedem Kapitel eine Verweisstelle und ein Gewicht', () => {
    for (const kapitel of KAPITEL) {
      expect(kapitel.position, kapitel.id).toMatch(/§\s?\d/);
      expect([1, 2, 3], kapitel.id).toContain(kapitel.gewicht);
      expect(kapitel.atome.length, kapitel.id).toBeGreaterThan(0);
    }
  });
});
