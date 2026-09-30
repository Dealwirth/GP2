import { useEffect } from 'react';
import { Inhaltsverzeichnis } from './Inhaltsverzeichnis.tsx';

/**
 * Überlagerung für das Inhaltsverzeichnis.
 *
 * Sie legt sich über die laufende Aufgabe, statt sie zu ersetzen: Wer mitten
 * im Rechnen nachschlagen will, soll danach genau dort weiterlesen, wo er war.
 * Die Antwort ist noch nicht abgegeben – ein Seitenwechsel würde die halb
 * gelesene Aufgabe aus dem Blick nehmen.
 *
 * Escape schließt. Ein Klick auf den Hintergrund ebenfalls.
 */
export function InhaltsverzeichnisBlatt(props: { offen: boolean; onSchliessen: () => void }) {
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
      aria-label="Inhaltsverzeichnis"
      onClick={props.onSchliessen}
    >
      <div className="blatt" onClick={(e) => e.stopPropagation()}>
        <div className="blattKopf">
          <span className="prTitel">Inhaltsverzeichnis</span>
          <button className="still" onClick={props.onSchliessen} type="button">
            Schließen
          </button>
        </div>
        <div className="blattInhalt">
          <Inhaltsverzeichnis />
        </div>
      </div>
    </div>
  );
}
