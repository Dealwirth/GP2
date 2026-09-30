import { useMemo, useState } from 'react';
import {
  GRUPPEN,
  THEMEN,
  formelnFuer,
  themenInGruppe,
  type Thema,
} from '../content/nachschlagewerk.ts';

/**
 * Inhaltsverzeichnis – Formeln und Verweisstellen je Thema.
 *
 * Erreichbar an jeder Aufgabe, ohne die Aufgabe zu verlassen: Wer mitten im
 * Rechnen merkt, dass er die Formel nicht sicher hat, will nicht erst zur
 * Tabellenübersicht navigieren und den Faden verlieren.
 *
 * Die Suche filtert über Titel, Formeltext und Verweisstelle. Formeln kommen
 * aus der Faktenbasis, sind also dieselben, mit denen gerechnet wird.
 */

function verweisZeilen(verweise: Thema['tabellenbuch']): string {
  return verweise.map((v) => `${v.seite} ${v.was}`).join(' · ');
}

export function Inhaltsverzeichnis() {
  const [suche, setSuche] = useState('');
  const [offen, setOffen] = useState<string | null>(null);

  const q = suche.trim().toLowerCase();

  // Eine Zeile gilt als Treffer, wenn der Suchbegriff im Titel, in einer
  // Formelbezeichnung, im Formeltext oder in einer Verweisstelle steht.
  const trifft = useMemo(() => {
    return (t: Thema): boolean => {
      if (q === '') return true;
      if (t.titel.toLowerCase().includes(q)) return true;
      if (verweisZeilen(t.tabellenbuch).toLowerCase().includes(q)) return true;
      if (verweisZeilen(t.formelsammlung).toLowerCase().includes(q)) return true;
      return formelnFuer(t).some(
        (f) => f.bezeichnung.toLowerCase().includes(q) || f.formel.toLowerCase().includes(q),
      );
    };
  }, [q]);

  const sichtbar = THEMEN.filter(trifft);
  const keineTreffer = q !== '' && sichtbar.length === 0;

  return (
    <div>
      <h3>Inhaltsverzeichnis</h3>
      <p className="klein">
        Formeln und Verweisstellen nach Thema. Die Formeln kommen aus der Faktenbasis –
        es sind dieselben, mit denen die App rechnet. Die Seitenzahlen verweisen auf
        Tabellenbuch und Formelsammlung.
      </p>

      <label className="feld">
        <span>Im Inhaltsverzeichnis suchen</span>
        <input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="z. B. Spannungsfall, Drehstrom, 205"
        />
      </label>

      {keineTreffer && (
        <p className="klein">Kein Thema passt zu „{suche.trim()}“.</p>
      )}

      {GRUPPEN.map((gruppe) => {
        const themen = themenInGruppe(gruppe).filter(trifft);
        if (themen.length === 0) return null;
        return (
          <section className="karte" key={gruppe}>
            <div className="prKopf">
              <span className="prTitel">{gruppe}</span>
              <span className="prGewicht">{themen.length}</span>
            </div>
            {themen.map((t) => {
              const formeln = formelnFuer(t);
              const istOffen = offen === t.id || q !== '';
              return (
                <div className="ivEintrag" key={t.id}>
                  <button
                    className="ivTitel"
                    onClick={() => setOffen(offen === t.id ? null : t.id)}
                    aria-expanded={istOffen}
                  >
                    <span>{t.titel}</span>
                    <span className="zahlKlein">{istOffen ? '–' : '+'}</span>
                  </button>

                  {istOffen && (
                    <div className="ivInhalt">
                      {formeln.length > 0 && (
                        <ul className="ivFormeln">
                          {formeln.map((f) => (
                            <li key={f.id}>
                              <span className="ivFormel">{f.formel}</span>
                              <span className="klein">
                                {f.bezeichnung}
                                {f.geprueft ? '' : ' · noch offen geprüft'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {formeln.length === 0 && (
                        <p className="klein">
                          Zu diesem Thema führt die App keine Formel – es ist
                          Begriffswissen.
                        </p>
                      )}

                      <div className="ivVerweise">
                        {t.tabellenbuch.length > 0 && (
                          <p className="klein">
                            <strong>Tabellenbuch:</strong> {verweisZeilen(t.tabellenbuch)}
                          </p>
                        )}
                        {t.formelsammlung.length > 0 && (
                          <p className="klein">
                            <strong>Formelsammlung:</strong> {verweisZeilen(t.formelsammlung)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
