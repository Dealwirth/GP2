import { describe, it, expect } from 'vitest';
import { THEMEN, GRUPPEN, formelnFuer } from '../src/content/nachschlagewerk.ts';
import { holeFakt } from '../src/content/facts/index.ts';

/**
 * Das Inhaltsverzeichnis verweist auf Formeln der Faktenbasis und auf
 * Seitenzahlen zweier Nachschlagewerke. Beides muss zusammenpassen: Ein
 * Verweis auf eine nicht existierende Formel wäre im Ernstfall ein leeres
 * Blatt, eine Seite ohne Angabe wäre wertlos.
 */
describe('Inhaltsverzeichnis', () => {
  it('löst jede Formel-ID gegen die Faktenbasis auf', () => {
    for (const thema of THEMEN) {
      const aufgeloest = formelnFuer(thema);
      expect(aufgeloest, `Thema ${thema.id}`).toHaveLength(thema.formeln.length);
      for (const f of aufgeloest) {
        expect(f.formel.length, `Formel ${f.id}`).toBeGreaterThan(0);
        expect(f.bezeichnung.length, `Formel ${f.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('verweist nur auf Fakten, die es gibt', () => {
    for (const thema of THEMEN) {
      for (const id of thema.formeln) {
        expect(holeFakt(id), `Fakt ${id} fehlt (Thema ${thema.id})`).toBeDefined();
      }
    }
  });

  it('gibt jedem Thema eine gültige Gruppe', () => {
    for (const thema of THEMEN) {
      expect(GRUPPEN as readonly string[], `Thema ${thema.id}`).toContain(thema.gruppe);
    }
  });

  it('nennt zu jedem Verweis eine Seite und eine Angabe', () => {
    for (const thema of THEMEN) {
      for (const v of [...thema.tabellenbuch, ...thema.formelsammlung]) {
        expect(v.seite.trim().length, `Thema ${thema.id}`).toBeGreaterThan(0);
        expect(v.was.trim().length, `Thema ${thema.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('hat keine doppelten Themen-IDs', () => {
    const ids = THEMEN.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deckt die prüfungsrelevanten Rechenthemen mit Formeln ab', () => {
    // Diese Themen tragen die Rechenaufgaben der Prüfung. Fehlt hier eine
    // Formel, findet der Prüfling sie nicht, wenn er sie am dringendsten
    // braucht.
    const erwartet = ['querschnitt', 'drehstrom', 'abschaltung', 'wechselstrom', 'netzsysteme'];
    for (const id of erwartet) {
      const thema = THEMEN.find((t) => t.id === id);
      expect(thema, `Thema ${id} fehlt`).toBeDefined();
      expect(formelnFuer(thema!).length, `Thema ${id} ohne Formel`).toBeGreaterThan(0);
    }
  });
});
