import { describe, expect, it } from 'vitest';
import { bilanzieren, leseAntwort, schreibeAntwort, verteileAufgaben } from '../src/domain/exam/simulation.ts';
import { bewerte } from '../src/domain/interaktiv.ts';
import { statischeGrundaufgaben } from '../src/tasks/generator.ts';
import { leereDuplikatspeicher } from '../src/validation/pipeline.ts';
import { leereFehlerliste } from '../src/tasks/robust.ts';
import type { Antwort } from '../src/domain/interaktiv.ts';
import type { Task } from '../src/domain/types.ts';

/**
 * Die Prüfungsauswertung.
 *
 * Vorher verglich die Seite die gewählte Optionskennung mit `correctOptionId`.
 * Für die interaktiven Formate gibt es keine Kennung – jede wahr/falsch-,
 * Zuordnungs-, Reihenfolge- und Lückentext-Aufgabe galt damit als falsch, ganz
 * gleich was der Lernende eingetragen hatte. Diese Tests halten fest, dass die
 * Bewertung an einer Stelle liegt und alle Formate trägt.
 */

leereDuplikatspeicher();
leereFehlerliste();
const alle = statischeGrundaufgaben();

function ersteMitFormat(format: string): Task {
  const t = alle.find((a) => (format === 'mc' ? !a.interaktiv : a.interaktiv?.format === format));
  if (!t) throw new Error(`Kein Bestand für Format ${format}`);
  return t;
}

/** Die richtige Antwort auf eine Aufgabe – aus der hinterlegten Lösung. */
function richtigeAntwort(task: Task): Antwort {
  const iv = task.interaktiv;
  if (!iv) return { art: 'mc', optionId: task.correctOptionId ?? 'a' };
  switch (iv.format) {
    case 'wahr-falsch':
      return { art: 'wahr-falsch', wert: iv.richtigWahr! };
    case 'zuordnung': {
      const zuordnung: Record<string, string> = {};
      for (const p of iv.paare ?? []) zuordnung[p.links] = p.rechts;
      return { art: 'zuordnung', zuordnung };
    }
    case 'reihenfolge':
      return { art: 'reihenfolge', reihenfolge: (iv.schritte ?? []).map((_, i) => i) };
    case 'luecke':
      return { art: 'luecke', luecken: (iv.luecken ?? []).map((l) => l.loesung) };
    default:
      return { art: 'mc', optionId: task.correctOptionId ?? 'a' };
  }
}

describe('Antworten speichern und lesen', () => {
  it('übersteht den Weg durch den Speicher', () => {
    const a: Antwort = { art: 'zuordnung', zuordnung: { a: 'x' } };
    expect(leseAntwort(schreibeAntwort(a))).toEqual(a);
  });

  it('wertet beschädigten Inhalt als leere Antwort', () => {
    expect(leseAntwort('{kaputt')).toBeNull();
    expect(leseAntwort(undefined)).toBeNull();
  });
});

describe('Bilanz einer Prüfung', () => {
  it('zählt eine richtige Multiple-Choice-Antwort', () => {
    const t = ersteMitFormat('mc');
    const antworten = { [t.taskId]: schreibeAntwort(richtigeAntwort(t)) };
    const b = bilanzieren([t], antworten);
    expect(b.richtig).toBe(1);
    expect(b.falsch).toHaveLength(0);
    expect(b.offen).toHaveLength(0);
  });

  for (const format of ['wahr-falsch', 'zuordnung', 'reihenfolge', 'luecke']) {
    it(`zählt eine richtige Antwort im Format ${format}`, () => {
      const t = ersteMitFormat(format);
      const antworten = { [t.taskId]: schreibeAntwort(richtigeAntwort(t)) };
      const b = bilanzieren([t], antworten);
      expect(b.richtig).toBe(1);
      expect(b.falsch).toHaveLength(0);
    });
  }

  it('zählt eine teilweise richtige Zuordnung nicht als richtig', () => {
    const t = ersteMitFormat('zuordnung');
    const iv = t.interaktiv!;
    const zuordnung: Record<string, string> = {};
    for (const p of iv.paare ?? []) zuordnung[p.links] = p.rechts;
    // Die letzte Zuordnung verdrehen – eine volle Antwort ist das nicht.
    const letzte = (iv.paare ?? []).at(-1)!;
    zuordnung[letzte.links] = `${letzte.rechts} (falsch)`;
    const b = bilanzieren([t], { [t.taskId]: schreibeAntwort({ art: 'zuordnung', zuordnung }) });
    expect(b.richtig).toBe(0);
    expect(b.falsch).toEqual([t]);
  });

  it('trennt falsch beantwortet von offen gelassen', () => {
    const t = ersteMitFormat('wahr-falsch');
    const b = bilanzieren([t], {});
    expect(b.offen).toEqual([t]);
    expect(b.falsch).toHaveLength(0);
    // Offen gelassene Aufgaben zählen zur Wiederholungsliste.
    expect(b.schwacheThemenIds).toEqual(t.proposal.topicIds);
  });

  it('übergeht eine unlesbare Antwort statt zu stürzen', () => {
    const t = ersteMitFormat('wahr-falsch');
    const b = bilanzieren([t], { [t.taskId]: 'kein json' });
    expect(b.richtig).toBe(0);
    expect(b.falsch).toEqual([t]);
  });
});

describe('Verteilung der Prüfungsaufgaben', () => {
  it('mischt die Formate, statt nur Ankreuzfragen zu ziehen', () => {
    const gesehen = new Set<string>();
    for (const bereich of ['systementwurf', 'funktionsanalyse', 'wiso'] as const) {
      const g = verteileAufgaben(bereich, alle, 12);
      expect(g.length).toBeGreaterThan(0);
      for (const t of g) gesehen.add(t.proposal.format);
    }
    // Mindestens ein interaktives Format muss vorkommen; sonst fällt die
    // Auswertung auf die reine Optionsprüfung zurück.
    const interaktiv = [...gesehen].filter((f) => f !== 'mc' && f !== 'fall');
    expect(interaktiv.length).toBeGreaterThan(0);
  });

  it('liefert keine Aufgabe zweimal', () => {
    const g = verteileAufgaben('wiso', alle, 18);
    expect(new Set(g.map((t) => t.taskId)).size).toBe(g.length);
  });

  it('nimmt jede gelieferte Aufgabe aus dem geforderten Bereich', () => {
    for (const t of verteileAufgaben('funktionsanalyse', alle, 12)) {
      expect(t.proposal.examArea).toBe('funktionsanalyse');
    }
  });

  it('bewertet die gelieferten Aufgaben mit demselben Maßstab', () => {
    for (const t of verteileAufgaben('wiso', alle, 18)) {
      const a = richtigeAntwort(t);
      expect(bewerte(t, a).korrekt).toBe(true);
    }
  });
});
