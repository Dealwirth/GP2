import { describe, expect, it } from 'vitest';
import {
  LUECK_FRAGEN,
  REIHENFOLGE_FRAGEN,
  WF_FRAGEN,
  ZUORD_FRAGEN,
} from '../src/content/curriculum/interaktivfragen.ts';
import { holeAtom } from '../src/content/curriculum/index.ts';
import { interaktiveAufgaben } from '../src/tasks/interaktiv.ts';
import { leereDuplikatspeicher } from '../src/validation/pipeline.ts';
import { leereFehlerliste, sammlungfehler } from '../src/tasks/robust.ts';
import { bewerte } from '../src/domain/interaktiv.ts';
import type { Antwort } from '../src/domain/interaktiv.ts';
import type { Task } from '../src/domain/types.ts';

/**
 * Der interaktive Bestand trägt die Lösung im Aufgabenobjekt. Genau deshalb
 * wird er strenger geprüft als jede andere Quelle: Ein falsch hinterlegter
 * Schlüssel wird nicht in der Validierung sichtbar – er bewertet nur die
 * Antwort des Lernenden falsch.
 */
const alle = [...WF_FRAGEN, ...ZUORD_FRAGEN, ...REIHENFOLGE_FRAGEN, ...LUECK_FRAGEN];

function aufgabeMitFormat(format: string): Task[] {
  return aufgaben.filter((a) => a.interaktiv?.format === format);
}

leereDuplikatspeicher();
leereFehlerliste();
const aufgaben = interaktiveAufgaben();

describe('Interaktiver Fragenbestand', () => {
  it('hat eindeutige Kennungen über alle Formate hinweg', () => {
    const ids = alle.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('verweist nur auf existierende Themen des Lernpfads', () => {
    for (const frage of alle) {
      const atom = holeAtom(frage.thema);
      expect(atom, `Thema ${frage.thema} existiert nicht`).toBeDefined();
      expect(atom!.bereich, `Thema ${frage.thema} liegt in einem anderen Bereich`).toBe(
        frage.bereich,
      );
    }
  });

  it('deckt jedes Kapitel des Lernpfads mindestens einmal ab', () => {
    const kapitel = new Set(alle.map((f) => holeAtom(f.thema)!.kapitelId));
    // Die Kapitel sind bewusst breit: Der Bestand soll den Lernpfad spiegeln,
    // nicht nur die rechnernahen Themen.
    expect(kapitel.size).toBeGreaterThanOrEqual(30);
  });

  it('baut jede kuratierte Frage fehlerfrei durch die Pipeline', () => {
    expect(sammlungfehler().map((f) => `${f.quelle}/${f.id}: ${f.grund}`)).toEqual([]);
    expect(aufgaben.length).toBe(alle.length);
  });

  it('erzeugt zu jeder Frage genau eine Aufgabe mit passendem Format', () => {
    for (const a of aufgaben) {
      expect(a.interaktiv, a.taskId).toBeDefined();
      expect(a.interaktiv!.format, a.taskId).toBe(a.proposal.format);
      expect(a.approved, a.taskId).toBe(true);
      expect(a.validation.checks.every((c) => c.passed), a.taskId).toBe(true);
    }
  });

  it('gibt jeder Aufgabe einen Lösungsweg und eine Erklärung', () => {
    for (const a of aufgaben) {
      expect(a.solutionSteps.length, a.taskId).toBeGreaterThan(0);
      expect(a.explanation.length, a.taskId).toBeGreaterThan(0);
    }
  });
});

describe('Bewertung interaktiver Antworten', () => {
  it('bewertet eine wahre Aussage richtig und eine falsche nicht', () => {
    const wahr = aufgabeMitFormat('wahr-falsch').find((a) => a.interaktiv?.richtigWahr === true)!;
    const falsch = aufgabeMitFormat('wahr-falsch').find((a) => a.interaktiv?.richtigWahr === false)!;
    expect(bewerte(wahr, { art: 'wahr-falsch', wert: true }).korrekt).toBe(true);
    expect(bewerte(wahr, { art: 'wahr-falsch', wert: false }).korrekt).toBe(false);
    expect(bewerte(falsch, { art: 'wahr-falsch', wert: false }).korrekt).toBe(true);
  });

  it('bewertet die richtige Reihenfolge als korrekt und eine Vertauschung nicht', () => {
    const aufgabe = aufgabeMitFormat('reihenfolge')[0]!;
    const n = aufgabe.interaktiv!.schritte!.length;
    const richtig: Antwort = { art: 'reihenfolge', reihenfolge: [...Array(n).keys()] };
    expect(bewerte(aufgabe, richtig).korrekt).toBe(true);

    const vertauscht: Antwort = {
      art: 'reihenfolge',
      reihenfolge: [1, 0, ...Array.from({ length: n - 2 }, (_, i) => i + 2)],
    };
    const urteil = bewerte(aufgabe, vertauscht);
    expect(urteil.korrekt).toBe(false);
    // Zwei von n sind vertauscht – der Anteil muss das zeigen, sonst taugt
    // die Rückmeldung nicht für den Lernfortschritt.
    expect(urteil.anteil).toBeGreaterThan(0);
    expect(urteil.anteil).toBeLessThan(1);
  });

  it('bewertet eine vollständige Zuordnung richtig und eine unvollständige nicht', () => {
    const aufgabe = aufgabeMitFormat('zuordnung')[0]!;
    const paare = aufgabe.interaktiv!.paare!;
    const richtig: Antwort = {
      art: 'zuordnung',
      zuordnung: Object.fromEntries(paare.map((p) => [p.links, p.rechts])),
    };
    expect(bewerte(aufgabe, richtig).korrekt).toBe(true);

    const halb: Antwort = {
      art: 'zuordnung',
      zuordnung: Object.fromEntries(paare.slice(0, paare.length - 1).map((p) => [p.links, p.rechts])),
    };
    const urteil = bewerte(aufgabe, halb);
    expect(urteil.korrekt).toBe(false);
    expect(urteil.hinweise.length).toBeGreaterThan(0);
  });

  it('nimmt beim Lückentext die hinterlegten Alternativschreibweisen an', () => {
    const aufgabe = aufgabeMitFormat('luecke').find((a) =>
      a.interaktiv!.luecken!.some((l) => (l.alternativen ?? []).length > 0),
    )!;
    const luecken = aufgabe.interaktiv!.luecken!;
    const ersteAlternative = luecken.map((l) => l.alternativen?.[0] ?? l.loesung);
    expect(bewerte(aufgabe, { art: 'luecke', luecken: ersteAlternative }).korrekt).toBe(true);
  });

  it('weist eine Antwort zurück, die nicht zum Aufgabenformat passt', () => {
    const aufgabe = aufgabeMitFormat('wahr-falsch')[0]!;
    const urteil = bewerte(aufgabe, { art: 'zahl', wert: 1 });
    expect(urteil.korrekt).toBe(false);
    expect(urteil.hinweise[0]).toContain('Aufgabenformat');
  });
});
