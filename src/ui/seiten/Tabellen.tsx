import { useState } from 'react';
import { useGespeichert } from '../persistenz.ts';
import { FAKTEN, FAKTEN_VERSION } from '../../content/facts/index.ts';
import type { Fact } from '../../domain/types.ts';
import { Inhaltsverzeichnis } from '../Inhaltsverzeichnis.tsx';
import {
  IZ_VERLEGEART_C,
  ABSICHERUNG_SCHULTABELLE,
  TEMPERATURFAKTOREN,
} from '../../content/facts/v1.0/leitungen.ts';

/**
 * Nachschlagetabellen – reine Referenz, ohne Rechnung.
 *
 * Die Prüfungsaufgaben der Leitungsberechnung leben von Werten, die man im
 * Prüfungszimmer aus einer Tabelle abliest. Diese Seite ist diese Tabelle:
 * Sie rechnet nichts, entscheidet nichts und versteckt nichts. Jeder Wert
 * kommt aus der Faktenbasis – dieselbe Quelle, aus der auch die Rechen-Engine
 * und die Aufgaben speisen. Steht hier ein Wert, rechnet die App überall
 * sonst mit demselben.
 *
 * Wo ein Wert noch nicht am Original geprüft ist, steht das daneben. Eine
 * Tabelle, die so tut, als wären alle Werte gesichert, wäre in der
 * Prüfungsvorbereitung die gefährlichere Lüge.
 */

const REIHENFOLGE = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95];

function zahl(wert: number): string {
  // 1,5 statt 1.5 – die Prüfung schreibt Komma.
  return wert.toLocaleString('de-DE', { maximumFractionDigits: 3 });
}

/** Sucht den Fakten-Datensatz zu einer Tabelle heraus (für Quelle + Status). */
function fakt(id: string): Fact | undefined {
  return FAKTEN.find((f) => f.id === id);
}

function herkunftsZeile(f: Fact | undefined): string | null {
  if (!f) return null;
  const status = f.verification === 'geprueft' ? 'am Original geprüft' : 'noch offen geprüft';
  return `${f.bezeichnung} · Quelle: ${f.quelleId} · ${status} · gültig ab ${f.gueltigAb}`;
}

function statusMarke(f: Fact | undefined): string {
  if (!f) return '?';
  return f.verification === 'geprueft' ? 'geprüft' : 'offen';
}

export function Tabellen() {
  const [reiter, setReiter] = useGespeichert<string>('tabellen-reiter', 'strom');
  const [suche, setSuche] = useState('');

  const fIz = fakt('iz-tabelle-verlegeart-c');
  const fSchule = fakt('absicherung-schultabelle');
  const fTemp = fakt('iz-temperatur-bezug');
  const fRho = fakt('rho-kupfer');

  // Der Suchfilter verdichtet die Tabellen auf das, was gerade gebraucht wird.
  // Er filtert Zeilen, nie Spalten – eine verdeckte Spalte wäre die falsche
  // Sparsamkeit.
  const q = suche.trim().replace(',', '.');
  const reiheSichtbar = REIHENFOLGE.filter(
    (qs) => q === '' || String(qs).includes(q) || String(qs).replace('.', ',').includes(q),
  );
  const tempSichtbar = Object.entries(TEMPERATURFAKTOREN).filter(
    ([grad]) => q === '' || grad.includes(q),
  );

  return (
    <>
      <h2>Tabellen</h2>
      <p className="klein">
        Nachschlagen, nicht rechnen: Alle Werte stehen so in der Faktenbasis{' '}
        v{FAKTEN_VERSION} und sind dieselben, mit denen die Rechen-Engine und die Aufgaben
        arbeiten. Wo die Norm zwei Wege kennt (Referenzwerte I_z und vereinfachte
        Schultabelle), stehen beide nebeneinander – vermischt werden sie nie.
      </p>

      <div className="reiterreihe" role="tablist">
        {[
          { id: 'verzeichnis', label: 'Inhaltsverzeichnis' },
          { id: 'strom', label: 'Strombelastbarkeit' },
          { id: 'absicherung', label: 'Absicherung' },
          { id: 'faktoren', label: 'Faktoren' },
          { id: 'formeln', label: 'Formeln' },
        ].map((r) => (
          <button
            key={r.id}
            className={reiter === r.id ? 'reiter aktiv' : 'reiter'}
            onClick={() => setReiter(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {reiter !== 'verzeichnis' && (
        <label className="feld">
          <span>Tabelle filtern (Querschnitt oder Temperatur)</span>
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="z. B. 2,5 oder 40"
          />
        </label>
      )}

      {reiter === 'verzeichnis' && <Inhaltsverzeichnis />}

      {reiter === 'strom' && (
        <section className="karte">
          <h3>
            Strombelastbarkeit I_z · Verlegeart C, Cu, PVC, 30 °C{' '}
            <span className="marke">{statusMarke(fIz)}</span>
          </h3>
          <table className="tabelle">
            <thead>
              <tr>
                <th scope="col">Querschnitt</th>
                <th scope="col">I_z</th>
              </tr>
            </thead>
            <tbody>
              {reiheSichtbar.map((qs) => (
                <tr key={qs}>
                  <td>{zahl(qs)} mm²</td>
                  <td>{IZ_VERLEGEART_C[qs] !== undefined ? `${zahl(IZ_VERLEGEART_C[qs]!)} A` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="versionszeile">{herkunftsZeile(fIz)}</p>
        </section>
      )}

      {reiter === 'absicherung' && (
        <section className="karte">
          <h3>
            Absicherung (vereinfacht, Schultabelle/ZVEH){' '}
            <span className="marke">{statusMarke(fSchule)}</span>
          </h3>
          <table className="tabelle">
            <thead>
              <tr>
                <th scope="col">Querschnitt</th>
                <th scope="col">Schultabelle</th>
                <th scope="col">zum Vergleich: I_z</th>
              </tr>
            </thead>
            <tbody>
              {reiheSichtbar.map((qs) => (
                <tr key={qs}>
                  <td>{zahl(qs)} mm²</td>
                  <td>{ABSICHERUNG_SCHULTABELLE[qs] !== undefined ? `${zahl(ABSICHERUNG_SCHULTABELLE[qs]!)} A` : '–'}</td>
                  <td>{IZ_VERLEGEART_C[qs] !== undefined ? `${zahl(IZ_VERLEGEART_C[qs]!)} A` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="klein">
            Beide Spalten sind <strong>keine</strong> Umrechnung voneinander: Die Schultabelle
            ist eine eigene Abstufung für Übungen, die I_z-Spalte die Referenz nach Norm. Die
            Aufgaben zeigen immer an, mit welchem Weg sie gerechnet haben.
          </p>
          <p className="versionszeile">{herkunftsZeile(fSchule)}</p>
        </section>
      )}

      {reiter === 'faktoren' && (
        <>
          <section className="karte">
            <h3>
              Reduktionsfaktoren für Umgebungstemperatur (Bezug 30 °C){' '}
              <span className="marke">{statusMarke(fTemp)}</span>
            </h3>
            <table className="tabelle">
              <thead>
                <tr>
                  <th scope="col">Temperatur</th>
                  <th scope="col">Faktor</th>
                </tr>
              </thead>
              <tbody>
                {tempSichtbar.map(([grad, faktor]) => (
                  <tr key={grad}>
                    <td>{grad} °C</td>
                    <td>{zahl(faktor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="klein">
              I_z′ = I_z · Faktor. Bei 35 °C trägt dieselbe Leitung also nur 94 %.
            </p>
            <p className="versionszeile">{herkunftsZeile(fTemp)}</p>
          </section>

          <section className="karte">
            <h3>
              Widerstandsbelag ρ (Kupfer) <span className="marke">{statusMarke(fRho)}</span>
            </h3>
            <table className="tabelle">
              <tbody>
                <tr>
                  <td>Kupfer (Rechenwert)</td>
                  <td>0,018 Ω·mm²/m</td>
                </tr>
                <tr>
                  <td>Kupfer (bei 20 °C, Berufsschule)</td>
                  <td>0,0175 Ω·mm²/m</td>
                </tr>
              </tbody>
            </table>
            <p className="klein">
              Beide Werte sind gebräuchlich; jede Lösung in dieser App zeigt, mit welchem
              gerechnet wurde.
            </p>
            <p className="versionszeile">{herkunftsZeile(fRho)}</p>
          </section>
        </>
      )}

      {reiter === 'formeln' && (
        <section className="karte">
          <h3>Formeln der Leitungsberechnung</h3>
          <table className="tabelle">
            <thead>
              <tr>
                <th scope="col">Was</th>
                <th scope="col">Formel</th>
              </tr>
            </thead>
            <tbody>
              {FAKTEN.filter((f) => f.kategorie === 'Formel').map((f) => (
                <tr key={f.id}>
                  <td>{f.bezeichnung}</td>
                  <td>
                    <code>{f.formel}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="klein">
            Gerechnet wird ausschließlich in der Rechen-Engine – jede Lösung zeigt Formel,
            eingesetzte Werte und Ergebnis einzeln.
          </p>
        </section>
      )}
    </>
  );
}
