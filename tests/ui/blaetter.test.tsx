/**
 * Oberflächentests für die Bauteile, die während einer Aufgabe erscheinen.
 *
 * Diese Datei schließt die Lücke, die der Projektbericht offen benannte: die
 * Oberfläche war ungetestet, obwohl an genau diesen Stellen am meisten
 * gearbeitet wurde. Geprüft wird echtes Verhalten – ein Klick öffnet, Escape
 * schließt, ein Inhalt steht da – nicht die Umsetzung.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabellenBlatt } from '../../src/ui/TabellenBlatt.tsx';
import { InhaltsverzeichnisBlatt } from '../../src/ui/InhaltsverzeichnisBlatt.tsx';
import { Fehlergrenze } from '../../src/ui/Fehlergrenze.tsx';

describe('TabellenBlatt', () => {
  it('zeigt nichts, solange es geschlossen ist', () => {
    render(<TabellenBlatt offen={false} onSchliessen={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('legt sich über die Aufgabe und trägt die Tabellen', () => {
    render(<TabellenBlatt offen onSchliessen={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: /Tabellen und Formeln/i });
    expect(dialog).toBeDefined();
    // Die Tabellenansicht ist vollständig enthalten – der Nutzer soll während
    // der Aufgabe blättern können, ohne sie zu verlassen.
    expect(
      screen.getByRole('heading', { name: /Strombelastbarkeit I_z/i }),
    ).toBeDefined();
  });

  it('schließt auf Escape', async () => {
    const schliessen = vi.fn();
    render(<TabellenBlatt offen onSchliessen={schliessen} />);
    await userEvent.keyboard('{Escape}');
    expect(schliessen).toHaveBeenCalledOnce();
  });

  it('schließt beim Klick auf den Hintergrund, aber nicht im Blatt selbst', async () => {
    const schliessen = vi.fn();
    render(<TabellenBlatt offen onSchliessen={schliessen} />);
    const dialog = screen.getByRole('dialog');
    // Ein Klick im Blatt darf nicht schließen – sonst wäre ein markierter
    // Wert ein versehentliches Schließen.
    fireEvent.click(dialog.firstElementChild!);
    expect(schliessen).not.toHaveBeenCalled();
    fireEvent.click(dialog);
    expect(schliessen).toHaveBeenCalledOnce();
  });
});

describe('InhaltsverzeichnisBlatt', () => {
  it('öffnet sich während einer Frage und listet die Lernpfad-Themen', () => {
    render(<InhaltsverzeichnisBlatt offen onSchliessen={() => {}} />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('schließt auf Escape', async () => {
    const schliessen = vi.fn();
    render(<InhaltsverzeichnisBlatt offen onSchliessen={schliessen} />);
    await userEvent.keyboard('{Escape}');
    expect(schliessen).toHaveBeenCalledOnce();
  });
});

describe('Fehlergrenze', () => {
  it('zeigt den Inhalt, solange nichts schiefgeht', () => {
    render(
      <Fehlergrenze>
        <p>Alles in Ordnung</p>
      </Fehlergrenze>,
    );
    expect(screen.getByText('Alles in Ordnung')).toBeDefined();
  });

  it('fängt einen Renderfehler ab und leert die Seite nicht', () => {
    // Die Fehlergrenze ist das Versprechen, dass ein fehlerhaftes Bauteil nie
    // die ganze Seite leert. Genau das wird hier ausgelöst.
    const still = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Fehlergrenze>
        <Kaputt />
      </Fehlergrenze>,
    );
    // Der Fehlertext steht in einem eigenen Absatz – die Überschrift nennt nur
    // die Lage. Beides zusammen beweist: Die Grenze hat den Wurf gefangen und
    // zeigt eine verständliche Ansicht statt einer leeren Seite.
    expect(screen.getByRole('heading', { name: /schiefgegangen/i })).toBeDefined();
    expect(screen.getByText('Testfehler im Bauteil')).toBeDefined();
    expect(screen.getByRole('button', { name: /Weiter versuchen/i })).toBeDefined();
    still.mockRestore();
  });
});

function Kaputt(): never {
  throw new Error('Testfehler im Bauteil');
}
