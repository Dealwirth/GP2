import { beforeEach, describe, expect, it } from 'vitest';
import {
  bekannteSeedTexte,
  merkeSeedTexte,
  neueSeedRunde,
  seedAufgabenFuerAtom,
  seedAufgabenFuerAtomNeu,
  seedRunde,
} from '../src/tasks/seed.ts';
import { ATOME, holeAtom } from '../src/content/curriculum/index.ts';

/**
 * Abwechslung im Seed-Vorrat.
 *
 * Der Anlass: Der Lernende klagte, es kämen „immer die gleichen Fragen". Die
 * Messung gab ihm recht – 1 135 Seed-Aufgaben, aber nur 78 verschiedene
 * Fragetexte, weil dieselbe Faktenfrage zu jedem Thema erneut entstand.
 *
 * Diese Tests halten den Umbau fest: Frageformen, Textgedächtnis und
 * Rundenzähler müssen zusammenwirken, sonst schleicht sich die Wiederholung
 * wieder ein.
 */

// Das Gedächtnis liegt in `localStorage`; im Testlauf (Node) gibt es keinen.
const speicher = new Map<string, string>();
beforeEach(() => {
  speicher.clear();
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => speicher.get(k) ?? null,
    setItem: (k: string, v: string) => void speicher.set(k, v),
    removeItem: (k: string) => void speicher.delete(k),
  };
});

describe('Frageformen', () => {
  it('erzeugt zu einem Faktenwert mehrere Fragetexte', () => {
    const atom = holeAtom('ka-verteilung-01')!;
    const formen = new Set<string>();
    for (let versatz = 0; versatz < 6; versatz += 1) {
      for (const t of seedAufgabenFuerAtom(atom, versatz)) formen.add(t.proposal.prompt);
    }
    expect(formen.size).toBeGreaterThan(1);
  });

  it('baut innerhalb eines Themas keinen Fragetext doppelt', () => {
    // Zwei Fakten können denselben Wert tragen (`idn-personenschutz` und
    // `idn-baustelle-30ma` sind beide 0,03 A). Ohne Filter entstünden daraus
    // textgleiche Aufgaben.
    for (const atom of ATOME) {
      const texte = seedAufgabenFuerAtom(atom).map((t) => t.proposal.prompt);
      expect(new Set(texte).size, `Doppelt in ${atom.id}`).toBe(texte.length);
    }
  });

  it('erzeugt über den ganzen Lehrplan deutlich mehr Texte als Themen', () => {
    const texte = new Set<string>();
    for (const atom of ATOME) for (const t of seedAufgabenFuerAtom(atom)) texte.add(t.proposal.prompt);
    expect(texte.size).toBeGreaterThan(300);
  });
});

describe('Textgedächtnis', () => {
  it('liefert beim zweiten Aufruf nichts, was schon gestellt wurde', () => {
    const atom = holeAtom('ka-messen-06')!;
    const bekannt = bekannteSeedTexte();
    const erste = seedAufgabenFuerAtomNeu(atom, bekannt, 0);
    expect(erste.length).toBeGreaterThan(0);
    for (const t of erste) bekannt.add(t.proposal.prompt);

    const zweite = seedAufgabenFuerAtomNeu(atom, bekannt, 0);
    expect(zweite).toHaveLength(0);
  });

  it('merkt Texte dauerhaft', () => {
    merkeSeedTexte(['Beispielfrage?']);
    expect(bekannteSeedTexte().has('Beispielfrage?')).toBe(true);
  });

  it('leert das Gedächtnis mit einer neuen Runde und zählt sie', () => {
    merkeSeedTexte(['Beispielfrage?']);
    expect(seedRunde()).toBe(0);
    neueSeedRunde();
    expect(bekannteSeedTexte().size).toBe(0);
    expect(seedRunde()).toBe(1);
  });

  it('stellt in der neuen Runde dieselben Werte anders formuliert', () => {
    // Runde 0 und Runde 1 fragen denselben Fakt mit unterschiedlichem Versatz.
    const atom = holeAtom('ka-messen-06')!;
    const r0 = seedAufgabenFuerAtomNeu(atom, new Set(), 0).map((t) => t.proposal.prompt);
    const r1 = seedAufgabenFuerAtomNeu(atom, new Set(), 1).map((t) => t.proposal.prompt);
    const gemeinsam = r0.filter((p) => r1.includes(p));
    expect(gemeinsam.length).toBeLessThan(r0.length);
  });
});
