import { useEffect, useState } from 'react';
import { beobachteVorrat, fuelleVorratAuf, type Vorratsstand } from '../tasks/vorrat.ts';
import { aiEinstellungenAus } from './einstellungen.ts';
import type { Store } from './store.ts';

/**
 * Anzeige des Aufgaben-Vorrats im Kopf.
 *
 * Zeigt, wie viele fertige Aufgaben bereitliegen. Solange es weniger als das
 * Minimum sind, füllt die App im Hintergrund nach – sichtbar am pulsierenden
 * Punkt, damit niemand denkt, es hake. Ein Klick fordert sofort nach.
 *
 * Die Zeile ist bewusst knapp: Der Vorrat ist eine Betriebsgröße, keine
 * Prüfungsinformation. Wer sie nicht beachtet, merkt nur, dass es schnell geht.
 */
export function Vorratszeile(props: { store: Store }) {
  const { store } = props;
  const [stand, setStand] = useState<Vorratsstand>({
    bereit: 0,
    gesamt: 0,
    fuelltAuf: false,
    fehler: null,
  });

  useEffect(() => beobachteVorrat(setStand), []);

  // Beim Öffnen der App einmal nachfüllen – unaufdringlich, im Hintergrund.
  useEffect(() => {
    if (!store.geladen) return;
    const ai = aiEinstellungenAus(store.einstellungen);
    void fuelleVorratAuf(ai);
  }, [store.geladen, store.einstellungen]);

  const farbe = stand.fehler
    ? 'vorratFehler'
    : stand.bereit >= 10
      ? 'vorratVoll'
      : stand.fuelltAuf
        ? 'vorratLaeuft'
        : 'vorratLeer';

  return (
    <button
      className={`vorrat ${farbe}`}
      title={
        stand.fehler
          ? `Vorrat: ${stand.fehler}`
          : `${stand.bereit} fertige Aufgaben bereit (${stand.gesamt} insgesamt gespeichert)`
      }
      onClick={() => void fuelleVorratAuf(aiEinstellungenAus(store.einstellungen))}
    >
      <span className="vorratPunkt" />
      <span className="vorratText">
        {stand.fuelltAuf && stand.bereit < 10
          ? `${stand.bereit} · wird aufgefüllt`
          : `${stand.bereit} bereit`}
      </span>
    </button>
  );
}
