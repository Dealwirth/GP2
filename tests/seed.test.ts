import { describe, expect, it } from 'vitest';
import { seedAufgabenFuerAtom, seedAufgabenFuerAtome } from '../src/tasks/seed.ts';
import { ATOME, holeAtom } from '../src/content/curriculum/index.ts';
import { rechne, rezeptWerte } from '../src/tasks/resolve.ts';
import { pruefeFaktenbindung } from '../src/validation/pipeline.ts';
import type { Rezept } from '../src/domain/aufgaben.ts';

/**
 * Der feste Aufgabenbestand.
 *
 * Diese Tests halten fest, was den Betrieb ohne Netz sichert: Der Seed-Vorrat
 * muss Aufgaben liefern, die die Faktenbindung bestehen, und er muss breit
 * genug sein, um den Stoff über viele Sitzungen zu tragen.
 */
describe('Fester Aufgabenbestand', () => {
  it('liefert eine Aufgabe zum Rechen-Thema', () => {
    const atom = holeAtom('ka-verteilung-04')!;
    const aufgaben = seedAufgabenFuerAtom(atom);
    expect(aufgaben.length).toBeGreaterThan(3);
    for (const t of aufgaben) {
      expect(t.proposal.origin).toBe('statisch');
      expect(t.correctOptionId).toBeTruthy();
      expect(t.proposal.options?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('baut jede Aufgabe so, dass genau eine Option die richtige ist', () => {
    const aufgaben = seedAufgabenFuerAtome(ATOME);
    expect(aufgaben.length).toBeGreaterThan(500);
    for (const t of aufgaben) {
      const richtig = t.proposal.options?.filter((o) => o.id === t.correctOptionId) ?? [];
      expect(richtig).toHaveLength(1);
      expect(richtig[0]!.text.length).toBeGreaterThan(0);
    }
  });

  it('besteht die Faktenbindung – jede Zahl im Text ist belegt', () => {
    // Stichprobe über alle Themen: Die Bindung ist der Kern der Prüfung, sie
    // darf auch beim Seed-Vorrat nicht umgangen werden. Geprüft wird mit
    // denselben Eingaben wie beim Bau der Aufgabe – die Rezeptgrößen sind
    // belegt, weil die Engine mit ihnen gerechnet hat.
    //
    // Wissensaufgaben (Aussage- und Wertfragen aus der Faktenbasis) haben
    // kein Rezept. Ihre Zahlen stammen unmittelbar aus dem zitierten Fakt und
    // werden dort über `factRefs` gebunden; die Bindung prüft das bereits beim
    // Bau. Hier werden sie deshalb übersprungen.
    const aufgaben = seedAufgabenFuerAtome(ATOME);
    let geprueft = 0;
    for (const t of aufgaben) {
      const rezept = t.proposal.berechnung as Rezept | undefined;
      if (!rezept || !rezept.art) continue;
      const ergebnis = rechne(rezept);
      const pruefung = pruefeFaktenbindung(
        t.proposal,
        [String(ergebnis.wert)],
        t.correctOptionId,
        [],
        rezeptWerte(rezept),
      );
      expect(pruefung.passed, `${t.proposal.prompt}: ${pruefung.detail}`).toBe(true);
      geprueft += 1;
      if (geprueft >= 200) break;
    }
    expect(geprueft).toBeGreaterThan(0);
  });

  it('verteilt die Aufgaben über die Prüfungsbereiche', () => {
    const aufgaben = seedAufgabenFuerAtome(ATOME);
    const bereiche = new Set(aufgaben.map((t) => t.proposal.examArea));
    expect(bereiche.size).toBeGreaterThanOrEqual(3);
  });

  it('deckt die allermeisten Themen ab', () => {
    const mitAufgabe = ATOME.filter((a) => seedAufgabenFuerAtom(a).length > 0).length;
    expect(mitAufgabe / ATOME.length).toBeGreaterThan(0.9);
  });
});

/**
 * Aufgabenqualität – drei Zusicherungen, die aus Fehlern entstanden sind.
 *
 * Jede prüft eine Sache, die im Betrieb nachweislich falsch war: eine
 * Antwortmöglichkeit, die als null erscheint; ein Faktenwert, der unter jedem
 * Thema erneut gestellt wird; und eine Aufgabe mit weniger als drei
 * unterscheidbaren Optionen.
 */
describe('Aufgabenqualität', () => {
  const alle = seedAufgabenFuerAtome(ATOME);

  it('stellt keine Antwortmöglichkeit, die als null erscheint', () => {
    // Bei kleinen Ergebnissen – etwa 2 kWh – ergäbe der Distraktor „richtig
    // geteilt durch 1000" gerundet 0,00. Das ist keine Versuchung, sondern
    // eine Beleidigung, und verrät die Lösung.
    const nullen: string[] = [];
    for (const t of alle) {
      for (const o of t.proposal.options ?? []) {
        const m = o.text.match(/^([\d.,]+)/);
        if (m && Number(m[1]!.replace(',', '.')) === 0) {
          nullen.push(`${t.proposal.prompt} => ${o.text}`);
        }
      }
    }
    expect(nullen).toEqual([]);
  });

  it('stellt denselben Fragetext nur einmal über alle Themen', () => {
    const texte = alle.map((t) => t.proposal.prompt);
    expect(new Set(texte).size).toBe(texte.length);
  });

  it('gibt jeder Aufgabe genau drei unterscheidbare Optionen', () => {
    for (const t of alle) {
      const opt = t.proposal.options ?? [];
      expect(opt.length, t.proposal.prompt).toBe(3);
      const texte = opt.map((o) => o.text);
      expect(new Set(texte).size, t.proposal.prompt).toBe(3);
      expect(opt.filter((o) => o.id === t.correctOptionId).length, t.proposal.prompt).toBe(1);
    }
  });
});

