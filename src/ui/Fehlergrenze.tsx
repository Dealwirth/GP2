import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Fehlergrenze.
 *
 * Die Datensammlungen fangen fehlerhafte Einträge bereits einzeln ab – ein
 * kaputter Datensatz leert die App also nicht. Für einen Fehler in der
 * Darstellung selbst galt das bisher nicht: Ein Wurf in einer Komponente
 * riss die ganze Seite mit.
 *
 * Diese Grenze fängt ihn ab und zeigt, was zu tun ist, statt einer weißen
 * Seite. Sie heilt nichts – aber der Lernende weiß, dass der Fehler nicht bei
 * ihm liegt, und kann den Lernstand exportieren, bevor er neu lädt.
 */
interface Zustand {
  fehler: Error | null;
}

export class Fehlergrenze extends Component<{ children: ReactNode }, Zustand> {
  override state: Zustand = { fehler: null };

  static getDerivedStateFromError(fehler: Error): Zustand {
    return { fehler };
  }

  override componentDidCatch(fehler: Error, info: ErrorInfo): void {
    // Die Konsole ist die einzige Stelle, an der die Einzelheiten landen. Kein
    // Versand nach außen: Der Lernstand ist privat.
    console.error('Darstellungsfehler:', fehler, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.fehler) return this.props.children;

    return (
      <div className="huelle">
        <div className="karte">
          <h2>Hier ist etwas schiefgegangen</h2>
          <p>
            Ein Anzeigefehler hat diese Ansicht unterbrochen. Dein Lernstand ist
            davon nicht betroffen – er liegt im Browserspeicher.
          </p>
          <p className="klein">
            {this.state.fehler.message.slice(0, 300)}
          </p>
          <div className="raster raster2">
            <button className="haupt" onClick={() => this.setState({ fehler: null })}>
              Weiter versuchen
            </button>
            <button className="still" onClick={() => location.reload()}>
              Neu laden
            </button>
          </div>
          <p className="klein">
            Bleibt der Fehler, hilft ein Blick in die Einstellungen: Dort lässt
            sich der Lernstand als Datei sichern, bevor du den Speicher leerst.
          </p>
        </div>
      </div>
    );
  }
}
