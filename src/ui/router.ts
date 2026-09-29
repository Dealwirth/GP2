import { useCallback, useEffect, useState } from 'react';
import { letzteSeite, merkeSeite } from './persistenz.ts';

export type SeitenName =
  | 'heute'
  | 'lernen'
  | 'ueben'
  | 'tabellen'
  | 'pruefung'
  | 'labor'
  | 'fortschritt'
  | 'bericht'
  | 'einstellungen';

export const SEITEN: { id: SeitenName; label: string; kurz: string }[] = [
  { id: 'heute', label: 'Heute', kurz: 'Heute' },
  { id: 'lernen', label: 'Lernen', kurz: 'Lernen' },
  { id: 'ueben', label: 'Üben', kurz: 'Üben' },
  { id: 'tabellen', label: 'Tabellen', kurz: 'Tabelle' },
  { id: 'pruefung', label: 'Prüfung', kurz: 'Prüf' },
  { id: 'labor', label: 'Labor', kurz: 'Labor' },
  { id: 'fortschritt', label: 'Fortschritt', kurz: 'Stand' },
  { id: 'bericht', label: 'Bericht', kurz: 'Bericht' },
  { id: 'einstellungen', label: 'Einstellungen', kurz: 'Mehr' },
];

function ausHash(hash: string): SeitenName {
  // Nur das erste Segment zählt. Alles dahinter ist ein Zustand innerhalb
  // der Seite, keine eigene Route – sonst landet man beim Neuladen falsch.
  const teil = hash.replace(/^#\/?/, '').split('/')[0] ?? '';
  const treffer = SEITEN.find((s) => s.id === teil);
  return treffer?.id ?? 'heute';
}

/**
 * Ermittelt die Startseite.
 *
 * Drei Stufen, in dieser Reihenfolge:
 *  1. Der Hash – er ist die eigentliche Adresse und hat Vorrang.
 *  2. Die zuletzt geöffnete Seite aus dem Speicher.
 *  3. Die Startseite.
 *
 * Stufe 2 greift, wenn die App ohne Hash geöffnet wird: beim Start über das
 * Symbol einer installierten Anwendung, nach einem Update oder wenn der
 * Browser die Adresse gekürzt hat. Ohne diese Stufe landete man dort immer
 * auf „Heute", obwohl man mitten in einer Prüfung war.
 */
function startSeite(): SeitenName {
  const ausAdresse = typeof location === 'undefined' ? '' : location.hash;
  const ausHashWert = ausAdresse ? ausHash(ausAdresse) : 'heute';
  if (ausHashWert !== 'heute' || ausAdresse.includes('heute')) return ausHashWert;

  const gemerkt = letzteSeite();
  if (gemerkt && SEITEN.some((s) => s.id === gemerkt)) return gemerkt as SeitenName;
  return 'heute';
}

/**
 * Einfacher Router über den Hash.
 *
 * Bewusst so klein wie möglich: die App hat keine Unterseiten mit eigenen URLs,
 * die eine Serverkonfiguration brauchen. Deshalb funktioniert das Ganze auch
 * als einfache Datei oder auf GitHub Pages.
 */
export function useRouter(): [SeitenName, (ziel: SeitenName) => void] {
  const [seite, setSeite] = useState<SeitenName>(startSeite);

  useEffect(() => {
    const beiAenderung = (): void => {
      const ziel = ausHash(location.hash);
      setSeite(ziel);
      merkeSeite(ziel);
    };
    addEventListener('hashchange', beiAenderung);
    return () => removeEventListener('hashchange', beiAenderung);
  }, []);

  // Auch die beim Start ermittelte Seite festhalten – sonst bliebe die
  // Wiederherstellung nach einem einzigen Aufruf ohne Hash wirkungslos.
  useEffect(() => {
    merkeSeite(seite);
  }, [seite]);

  const wechsle = useCallback((ziel: SeitenName): void => {
    location.hash = `#/${ziel}`;
    setSeite(ziel);
    merkeSeite(ziel);
    scrollTo({ top: 0 });
  }, []);

  return [seite, wechsle];
}
