import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteraktiveAntwort } from '../../src/ui/InteraktiveAntwort.tsx';
import { interaktiveAufgaben } from '../../src/tasks/interaktiv.ts';
import { leereDuplikatspeicher } from '../../src/validation/pipeline.ts';
import { leereFehlerliste } from '../../src/tasks/robust.ts';
import type { Antwort } from '../../src/domain/interaktiv.ts';
import type { Task } from '../../src/domain/types.ts';

/**
 * Die interaktiven Formate im Prüfungsbetrieb.
 *
 * In der Prüfung gibt es keinen Prüfknopf: Jede Eingabe geht sofort an
 * `onVerlauf`, sonst wäre die Antwort beim Abgeben – oder nach einem Neuladen –
 * verloren. Diese Tests halten den Unterschied zum Übungsbetrieb fest.
 */

leereDuplikatspeicher();
leereFehlerliste();
const aufgaben = interaktiveAufgaben();

function mitFormat(format: string): Task {
  const t = aufgaben.find((a) => a.interaktiv?.format === format);
  if (!t) throw new Error(`Kein Bestand für Format ${format}`);
  return t;
}

describe('Prüfungsbetrieb ohne Prüfknopf', () => {
  it('meldet eine wahr/falsch-Wahl sofort', () => {
    const verlauf = vi.fn();
    render(<InteraktiveAntwort task={mitFormat('wahr-falsch')} gesperrt={false} onVerlauf={verlauf} />);

    fireEvent.click(screen.getByRole('button', { name: 'falsch' }));
    expect(verlauf).toHaveBeenCalledWith({ art: 'wahr-falsch', wert: false });
    expect(screen.queryByRole('button', { name: /Antwort prüfen/i })).toBeNull();
  });

  it('meldet eine Reihenfolge erst, wenn sich etwas bewegt', () => {
    const verlauf = vi.fn();
    render(
      <InteraktiveAntwort task={mitFormat('reihenfolge')} gesperrt={false} onVerlauf={verlauf} />,
    );

    expect(verlauf).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: '↓' })[0]!);
    const aufruf = verlauf.mock.calls[0]?.[0] as Antwort;
    expect(aufruf.art).toBe('reihenfolge');
  });

  it('übernimmt eine gespeicherte Antwort nach dem Neuladen', () => {
    const t = mitFormat('zuordnung');
    const zuordnung: Record<string, string> = {};
    for (const p of t.interaktiv?.paare ?? []) zuordnung[p.links] = p.rechts;

    render(
      <InteraktiveAntwort
        task={t}
        gesperrt={false}
        initial={{ art: 'zuordnung', zuordnung }}
        onVerlauf={() => {}}
      />,
    );

    for (const p of t.interaktiv?.paare ?? []) {
      expect(screen.getByText(p.rechts)).toBeDefined();
    }
  });

  it('sperrt die Eingabe nach dem Abgeben', () => {
    render(<InteraktiveAntwort task={mitFormat('wahr-falsch')} gesperrt onVerlauf={() => {}} />);
    for (const knopf of screen.getAllByRole('button')) {
      expect((knopf as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
