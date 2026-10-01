import { describe, expect, it } from 'vitest';
import { waehleThemenAus } from '../src/tasks/session.ts';
import { leererZustand, wendeVersuchAn } from '../src/domain/stateMachine.ts';
import { ATOME } from '../src/content/curriculum/index.ts';
import type { TopicStateRecord } from '../src/domain/types.ts';

/**
 * Der Stoff muss bis zur Prüfung reichen.
 *
 * Der Trainer darf nicht in wenigen Sitzungen alle Themen durchziehen – sonst
 * bleibt bis zum Termin nur noch trockene Wiederholung. Diese Tests halten den
 * Deckel auf frische Themen fest, ohne die dringende Wiederholung zu blockieren.
 */

const JETZT = new Date('2026-06-01T09:00:00.000Z');

describe('Themenauswahl mit Stoffdeckel', () => {
  it('deckelt frische Themen, wenn die Prüfung fern ist', () => {
    const kandidaten = ATOME.slice(0, 240);
    // 240 offene Themen, 400 Tage bis zur Prüfung: höchstens ein neues Thema
    // pro Auswahl – der Stoff reicht so bis zum Termin.
    const gewaehlt = waehleThemenAus(kandidaten, new Map(), new Set(), 6, JETZT, 400);
    expect(gewaehlt).toHaveLength(1);
  });

  it('lässt kurz vor der Prüfung mehr Neues zu', () => {
    const kandidaten = ATOME.slice(0, 60);
    // 60 offene Themen, 10 Tage: bis zu sechs neue Themen – die Breite muss
    // vor dem Termin noch durchgearbeitet werden.
    const gewaehlt = waehleThemenAus(kandidaten, new Map(), new Set(), 6, JETZT, 10);
    expect(gewaehlt).toHaveLength(6);
  });

  it('nimmt ohne Termin höchstens ein Achtel der offenen Themen neu', () => {
    const kandidaten = ATOME.slice(0, 80);
    const gewaehlt = waehleThemenAus(kandidaten, new Map(), new Set(), 20, JETZT, null);
    // ceil(80/8) = 10 neue Themen, auch wenn 20 Plätze frei wären.
    expect(gewaehlt).toHaveLength(10);
  });

  it('lässt Wiederholung vorgehen und füllt erst dann Neues auf', () => {
    const kandidaten = ATOME.slice(0, 40);
    const bekannt = new Set(kandidaten.slice(0, 2).map((a) => a.id));
    const zustaende = new Map<string, TopicStateRecord>();
    for (const a of kandidaten.slice(0, 2)) {
      const z = { ...leererZustand(a.id), nextDue: JETZT.toISOString() };
      zustaende.set(a.id, wendeVersuchAn(z, { type: 'richtig', sicherheit: 'sicher' }, JETZT));
    }

    const gewaehlt = waehleThemenAus(kandidaten, zustaende, bekannt, 4, JETZT, 5);
    expect(gewaehlt).toHaveLength(4);
    // Die beiden bekannten Themen stehen vorn, der Rest ist neu.
    expect(bekannt.has(gewaehlt[0]!)).toBe(true);
    expect(bekannt.has(gewaehlt[1]!)).toBe(true);
    expect(bekannt.has(gewaehlt[3]!)).toBe(false);
  });

  it('bringt auch bei wenigen offenen Themen mindestens ein neues unter', () => {
    const kandidaten = ATOME.slice(0, 30);
    const bekannt = new Set([kandidaten[0]!.id]);
    // Ein Achtel von 29 wäre 4, die Restzeit von 300 Tagen ergäbe 0 – der
    // Boden von einem Thema greift, mehr als eines kommt aber nicht dazu.
    const gewaehlt = waehleThemenAus(kandidaten, new Map(), bekannt, 3, JETZT, 300);
    expect(gewaehlt).toHaveLength(2);
    expect(gewaehlt.some((id) => !bekannt.has(id))).toBe(true);
  });

  it('liefert nie mehr als gefordert', () => {
    const gewaehlt = waehleThemenAus(ATOME, new Map(), new Set(), 2, JETZT, 5);
    expect(gewaehlt).toHaveLength(2);
  });
});
