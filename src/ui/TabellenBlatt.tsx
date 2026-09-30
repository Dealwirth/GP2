import { useEffect } from 'react';
import { Tabellen } from './seiten/Tabellen.tsx';

/**
 * Tabellenblatt für die laufende Aufgabe.
 *
 * In der Prüfung liegen Tabellenbuch und Formelsammlung neben dem Bogen – man
 * blättert, während die Aufgabe offen bleibt. Genau das bildet dieses Blatt
 * ab: Es legt sich über die Aufgabe, statt sie zu ersetzen, und enthält die
 * vollständige Tabellenansicht (Verzeichnis, Strombelastbarkeit, Absicherung,
 * Faktoren, Formeln).
 *
 * Es gibt hier nichts, was nicht auch auf der Tabellenseite stünde. Das ist
 * Absicht: Eine Aufgabe, die man nur mit einer „Prüfungstabelle" lösen kann,
 * wäre keine Prüfungsaufgabe.
 */
export function TabellenBlatt(props: { offen: boolean; onSchliessen: () => void }) {
  useEffect(() => {
    if (!props.offen) return;
    const beiTaste = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onSchliessen();
    };
    addEventListener('keydown', beiTaste);
    return () => removeEventListener('keydown', beiTaste);
  }, [props.offen, props.onSchliessen]);

  if (!props.offen) return null;

  return (
    <div
      className="blattHintergrund"
      role="dialog"
      aria-modal="true"
      aria-label="Tabellen und Formeln"
      onClick={props.onSchliessen}
    >
      <div className="blatt" onClick={(e) => e.stopPropagation()}>
        <div className="blattKopf">
          <span className="prTitel">Tabellen und Formeln</span>
          <button className="still" onClick={props.onSchliessen} type="button">
            Schließen
          </button>
        </div>
        <div className="blattInhalt">
          <Tabellen />
        </div>
      </div>
    </div>
  );
}
