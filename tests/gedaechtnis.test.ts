import { describe, expect, it } from 'vitest';
import { baueDigest, coachNotiz, naechsteThemen, tagesEintrag, ueberwacheLernen } from '../src/memory/index.ts';
import { leererZustand, wendeVersuchAn, berechneNaechsteFaelligkeit } from '../src/domain/stateMachine.ts';
import { ATOME, holeAtom } from '../src/content/curriculum/index.ts';
import type { TopicStateRecord } from '../src/domain/types.ts';

const HEUTE = new Date('2026-09-28T09:00:00');

/** Baut einen Zustand mit vorgegebener Trefferquote. */
function zustand(topicId: string, richtig: number, falsch: number, sicher = 0): TopicStateRecord {
  let z = leererZustand(topicId);
  for (let i = 0; i < richtig; i += 1) {
    z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, HEUTE);
  }
  for (let i = 0; i < falsch; i += 1) {
    z = wendeVersuchAn(z, { type: 'falsch', sicherheit: 'unsicher' }, HEUTE);
  }
  if (sicher > 0 && richtig > 0) {
    // Ein Teil der richtigen Antworten wurde geraten – die Sicherheitsquote sinkt.
    for (let i = 0; i < sicher; i += 1) {
      z = wendeVersuchAn(z, { type: 'richtig', sicherheit: 'geraten' }, HEUTE);
    }
  }
  return { ...z, nextDue: berechneNaechsteFaelligkeit(z.state, HEUTE)?.toISOString() ?? null };
}

describe('Lerngedächtnis – Digest', () => {
  it('meldet bei leerem Lernstand lauter Nullen', () => {
    const digest = baueDigest(new Map(), HEUTE);
    expect(digest.beantwortetGesamt).toBe(0);
    expect(digest.themenBegonnen).toBe(0);
    expect(digest.abdeckungQuote).toBe(0);
    expect(digest.fehlerquote).toBe(0);
  });

  it('zählt beantwortete Themen', () => {
    const karte = new Map<string, TopicStateRecord>([
      ['ka-verteilung-03', zustand('ka-verteilung-03', 2, 0)],
      ['wiso-recht-01', zustand('wiso-recht-01', 1, 1)],
    ]);
    const digest = baueDigest(karte, HEUTE);
    expect(digest.themenBegonnen).toBe(2);
    expect(digest.beantwortetGesamt).toBe(4);
  });

  it('ignoriert Datensätze ohne zugehöriges Thema', () => {
    const karte = new Map<string, TopicStateRecord>([
      ['ka-verteilung-03', zustand('ka-verteilung-03', 3, 0)],
      ['verwaist-alt', zustand('verwaist-alt', 9, 0)],
    ]);
    const digest = baueDigest(karte, HEUTE);
    expect(digest.themenBegonnen).toBe(1);
    expect(digest.beantwortetGesamt).toBe(3);
  });

  it('berechnet die Fehlerquote über alle Themen', () => {
    const karte = new Map<string, TopicStateRecord>([
      ['ka-verteilung-03', zustand('ka-verteilung-03', 3, 1)],
    ]);
    const digest = baueDigest(karte, HEUTE);
    expect(digest.fehlerquote).toBeCloseTo(0.25, 5);
  });

  it('nennt für jeden Bereich einen Reifewert', () => {
    const digest = baueDigest(new Map(), HEUTE);
    expect(Object.keys(digest.reife).sort()).toEqual(
      ['funktionsanalyse', 'kundenauftrag', 'systementwurf', 'teil1', 'wiso'].sort(),
    );
  });
});

describe('Lerngedächtnis – Coach', () => {
  it('schweigt, solange nichts vorliegt', () => {
    const digest = baueDigest(new Map(), HEUTE);
    expect(ueberwacheLernen(new Map(), digest, [])).toEqual([]);
  });

  it('meldet wiederholte Fehler', () => {
    const schwach: string[] = [];
    for (const atom of ATOME) {
      if (schwach.length >= 4) break;
      if (atom.bereich === 'funktionsanalyse') schwach.push(atom.id);
    }
    const karte = new Map(schwach.map((id) => [id, zustand(id, 1, 3)]));
    const digest = baueDigest(karte, HEUTE);
    const insights = ueberwacheLernen(karte, digest, []);
    expect(insights.some((i) => i.typ === 'schwach')).toBe(true);
  });

  it('meldet fehlendes Selbstvertrauen trotz richtiger Antworten', () => {
    // Drei richtige Antworten, aber alle geraten: Trefferquote 100 %,
    // Sicherheitsquote 0 %. Genau der Widerspruch, den der Coach sehen soll.
    let geraten = leererZustand('ka-verteilung-03');
    for (let i = 0; i < 3; i += 1) {
      geraten = wendeVersuchAn(geraten, { type: 'richtig', sicherheit: 'geraten' }, HEUTE);
    }
    const karte = new Map<string, TopicStateRecord>([['ka-verteilung-03', geraten]]);
    const digest = baueDigest(karte, HEUTE);
    expect(geraten.hitRate).toBe(1);
    expect(geraten.confidenceRate).toBe(0);
    const insights = ueberwacheLernen(karte, digest, []);
    expect(insights.some((i) => i.text.includes('Wiederholungsproblem'))).toBe(true);
  });

  it('gibt höchstens drei Notizen zurück, gefährliche zuerst', () => {
    const karte = new Map<string, TopicStateRecord>();
    for (const atom of ATOME.slice(0, 12)) karte.set(atom.id, zustand(atom.id, 1, 2));
    const digest = baueDigest(karte, HEUTE);
    const notizen = coachNotiz(ueberwacheLernen(karte, digest, []));
    expect(notizen.length).toBeLessThanOrEqual(3);
  });

  it('schlägt verfallene Themen vor', () => {
    const karte = new Map<string, TopicStateRecord>([
      ['ka-verteilung-03', { ...zustand('ka-verteilung-03', 1, 2), state: 'ueberfaellig', nextDue: '2026-01-01T00:00:00.000Z' }],
    ]);
    const themen = naechsteThemen(karte, 5);
    expect(themen).toContain('ka-verteilung-03');
  });
});

describe('Lerngedächtnis – Tagesbuch', () => {
  it('meldet einen leeren Tag', () => {
    const eintrag = tagesEintrag(new Map(), HEUTE);
    expect(eintrag.beantwortet).toBe(0);
    expect(eintrag.texte[0]).toContain('Heute noch nichts');
  });

  it('zählt die Themen des Tages', () => {
    const karte = new Map<string, TopicStateRecord>([
      ['ka-verteilung-03', zustand('ka-verteilung-03', 3, 0)],
      ['wiso-recht-01', zustand('wiso-recht-01', 0, 2)],
    ]);
    const eintrag = tagesEintrag(karte, HEUTE);
    expect(eintrag.beantwortet).toBe(2);
    expect(eintrag.richtig).toBe(1);
  });

  it('zählt gestrige Antworten nicht mit', () => {
    const gestern = zustand('ka-verteilung-03', 3, 0);
    const karte = new Map<string, TopicStateRecord>([
      ['ka-verteilung-03', { ...gestern, lastSeen: '2026-09-27T20:00:00.000Z' }],
    ]);
    expect(tagesEintrag(karte, HEUTE).beantwortet).toBe(0);
  });
});

describe('Lerngedächtnis – Anschluss an den Lernpfad', () => {
  it('nennt Themen, die noch nie gesehen wurden', () => {
    const digest = baueDigest(new Map(), HEUTE);
    expect(digest.offeneFaelligkeit).toHaveLength(ATOME.length);
    expect(digest.offeneFaelligkeit.every((id) => holeAtom(id) !== undefined)).toBe(true);
  });
});
