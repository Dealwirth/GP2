/**
 * Oberflächentests für die interaktiven Antwortformate.
 *
 * Die Komponente entscheidet, was der Lernende sieht und was er anklicken
 * kann. Genau dort ist ein Fehler teuer: Ein nicht gesperrter Knopf nach dem
 * Abgeben verändert die Antwort, ein fehlender Prüfknopf blockiert die
 * Aufgabe. Geprüft wird deshalb das Verhalten, nicht die Umsetzung.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteraktiveAntwort } from '../../src/ui/InteraktiveAntwort.tsx';
import { interaktiveAufgaben } from '../../src/tasks/interaktiv.ts';
import type { Task } from '../../src/domain/types.ts';

function ersteMitFormat(format: string): Task {
  const aufgabe = interaktiveAufgaben().find((a) => a.interaktiv?.format === format);
  if (!aufgabe) throw new Error(`Kein Bestand für Format ${format}`);
  return aufgabe;
}

describe('Wahr/Falsch', () => {
  it("meldet die gewählte Bewertung und sperrt danach die Knöpfe", () => {
    const aufgabe = ersteMitFormat('wahr-falsch');
    const antwort = vi.fn();
    const { rerender } = render(
      <InteraktiveAntwort task={aufgabe} gesperrt={false} onAntwort={antwort} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'wahr' }));
    expect(antwort).toHaveBeenCalledWith({ art: 'wahr-falsch', wert: true });

    rerender(<InteraktiveAntwort task={aufgabe} gesperrt onAntwort={antwort} />);
    for (const knopf of screen.getAllByRole('button')) {
      expect((knopf as HTMLButtonElement).disabled).toBe(true);
    }
  });
});

describe('Zuordnung', () => {
  it('verlangt eine Zuordnung je Begriff und gibt erst dann frei', async () => {
    const aufgabe = ersteMitFormat('zuordnung');
    const antwort = vi.fn();
    render(<InteraktiveAntwort task={aufgabe} gesperrt={false} onAntwort={antwort} />);

    // Der Prüfknopf erscheint erst, wenn nichts mehr ausgewählt ist.
    const paare = aufgabe.interaktiv!.paare!;
    for (const paar of paare) {
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${paar.links}`) }));
      await userEvent.click(screen.getByRole('button', { name: paar.rechts }));
    }

    const pruefen = screen.getByRole('button', { name: /Antwort prüfen/i });
    await userEvent.click(pruefen);

    expect(antwort).toHaveBeenCalledOnce();
    const uebergeben = antwort.mock.calls[0]![0];
    expect(uebergeben.art).toBe('zuordnung');
    // Jeder Begriff muss genau einmal zugeordnet worden sein.
    expect(Object.keys(uebergeben.zuordnung).sort()).toEqual(paare.map((p) => p.links).sort());
  });
});

describe('Reihenfolge', () => {
  it('übergibt die aktuelle Ordnung als Indexliste', async () => {
    const aufgabe = ersteMitFormat('reihenfolge');
    const antwort = vi.fn();
    render(<InteraktiveAntwort task={aufgabe} gesperrt={false} onAntwort={antwort} />);

    await userEvent.click(screen.getByRole('button', { name: /Antwort prüfen/i }));
    const uebergeben = antwort.mock.calls[0]![0];
    expect(uebergeben.art).toBe('reihenfolge');
    // Die Ordnung ist eine vollständige Permutation aller Schritte.
    expect([...uebergeben.reihenfolge].sort()).toEqual(
      aufgabe.interaktiv!.schritte!.map((_, i) => i),
    );
  });
});

describe('Lückentext', () => {
  it('gibt die eingetragenen Werte weiter', async () => {
    const aufgabe = ersteMitFormat('luecke');
    const antwort = vi.fn();
    render(<InteraktiveAntwort task={aufgabe} gesperrt={false} onAntwort={antwort} />);

    const felder = screen.getAllByRole('textbox');
    const loesungen = aufgabe.interaktiv!.luecken!;
    for (let i = 0; i < felder.length; i += 1) {
      await userEvent.type(felder[i]!, loesungen[i]!.loesung);
    }
    await userEvent.click(screen.getByRole('button', { name: /Antwort prüfen/i }));

    const uebergeben = antwort.mock.calls[0]![0];
    expect(uebergeben.art).toBe('luecke');
    expect(uebergeben.luecken).toEqual(loesungen.map((l) => l.loesung));
  });
});

describe('Zahleneingabe', () => {
  it('nimmt Komma und Punkt als Dezimaltrenner an', async () => {
    const aufgabe: Task = {
      ...ersteMitFormat('wahr-falsch'),
      proposal: {
        ...ersteMitFormat('wahr-falsch').proposal,
        format: 'zahl',
        prompt: 'Wie groß ist der Widerstand?',
      },
      interaktiv: { format: 'zahl', wert: 166.7, einheit: 'Ω' },
    };
    const antwort = vi.fn();
    render(<InteraktiveAntwort task={aufgabe} gesperrt={false} onAntwort={antwort} />);

    await userEvent.type(screen.getByRole('textbox'), '166,7');
    await userEvent.click(screen.getByRole('button', { name: /Antwort prüfen/i }));
    expect(antwort).toHaveBeenCalledWith({ art: 'zahl', wert: 166.7 });
  });
});
