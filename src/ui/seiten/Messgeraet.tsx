import { useMemo, useState } from 'react';
import { useGespeichert } from '../persistenz.ts';
import { lies, schreib } from '../persistenz.ts';
import { trageMesswertEin, type ProtokollEintrag } from '../../labor/pruefprotokoll.ts';
import {
  MESSAUFGABEN,
  MESSARTEN,
  bewerteMessung,
  formatZahl,
  hinweis,
  messAnlage,
  messaufgabe,
  messartInfo,
  messen,
  punkteMitHinweisen,
  startGeraet,
  type Buchse,
  type Geraet,
  type Messart,
} from '../../labor/messgeraet.ts';

/**
 * Bedienoberfläche des Prüfgeräts.
 *
 * Aufbau wie das echte Gerät, und in dieser Reihenfolge bedient man es auch:
 *
 *   1. Messart am Drehschalter wählen
 *   2. Die rote Leitung in die passende Buchse stecken
 *   3. Prüfen, ob die Anlage spannungsfrei sein muss – und sie ggf. freischalten
 *   4. Die Messspitzen an die richtigen Punkte setzen
 *   5. Messen
 *
 * Nichts davon ist automatisiert. Das ist Absicht: Die Prüfung fragt genau
 * diese Griffe ab, und wer sie hier einmal falsch gemacht hat, macht sie dort
 * nicht mehr falsch.
 */

const MESSPROTOKOLL_SCHLUESSEL = 'messprotokoll';

/**
 * Übernimmt einen Messwert in das gespeicherte Prüfprotokoll.
 *
 * Die eigentliche Rechnung steckt in `trageMesswertEin`, damit sie prüfbar
 * bleibt. Hier steht nur das Lesen und Schreiben.
 */
function uebernimmInProtokoll(
  schrittId: string,
  wert: number,
  einheit: string,
): { ok: boolean; grund?: string } {
  const eintraege = lies<ProtokollEintrag[]>(MESSPROTOKOLL_SCHLUESSEL);
  if (!eintraege) {
    return { ok: false, grund: 'Kein begonnenes Prüfprotokoll gefunden.' };
  }
  const ergebnis = trageMesswertEin(eintraege, schrittId, wert, einheit);
  if (!ergebnis.uebernommen) return { ok: false, grund: ergebnis.grund };
  schreib(MESSPROTOKOLL_SCHLUESSEL, ergebnis.eintraege);
  return { ok: true };
}

export function MessgeraetSeite() {
  const [aufgabeId, setAufgabeId] = useGespeichert<string>('messaufgabe', MESSAUFGABEN[0]!.id);
  const aufgabe = useMemo(() => messaufgabe(aufgabeId), [aufgabeId]);

  // Der Gerätezustand bleibt stehen – wer mitten in einer Messreihe den Tab
  // neu lädt, findet seinen Aufbau wieder vor.
  const [geraet, setGeraet] = useGespeichert<Geraet>('messgeraet', startGeraet());
  const [spannungsfrei, setSpannungsfrei] = useGespeichert<boolean>('messanlage-frei', false);
  const [punktA, setPunktA] = useGespeichert<string>('messpunkt-a', 'l1');
  const [punktB, setPunktB] = useGespeichert<string>('messpunkt-b', 'n');
  const [hilfeStufe, setHilfeStufe] = useState(0);
  const [gemessen, setGemessen] = useState<ReturnType<typeof messen> | null>(null);
  const [uebernommen, setUebernommen] = useState<string | null>(null);

  const anlage = useMemo(() => messAnlage(!spannungsfrei), [spannungsfrei]);
  const aktuelleMessart = messartInfo(geraet.messart);

  const punkt = (id: string): (typeof anlage.punkte)[number] | undefined =>
    anlage.punkte.find((p) => p.id === id);

  const A = punkt(punktA);
  const B = punkt(punktB);

  const befund = useMemo(() => {
    if (!gemessen || !A || !B) return null;
    return bewerteMessung(aufgabe, geraet, anlage, punktA, punktB, gemessen);
  }, [gemessen, A, B, aufgabe, geraet, anlage, punktA, punktB]);

  const messenJetzt = (): void => {
    if (!A || !B) return;
    setGemessen(messen(geraet, anlage, A, B));
    setUebernommen(null);
  };

  const aufgabeWechseln = (id: string): void => {
    setAufgabeId(id);
    setGemessen(null);
    setHilfeStufe(0);
    setUebernommen(null);
  };

  const uebernehmen = (): void => {
    if (!gemessen || !befund?.richtig || !aufgabe.protokollSchritt || gemessen.wert === null) return;
    const ergebnis = uebernimmInProtokoll(
      aufgabe.protokollSchritt,
      gemessen.wert,
      aufgabe.protokollEinheit,
    );
    setUebernommen(
      ergebnis.ok
        ? 'Wert steht im Prüfprotokoll. Du findest ihn unter „Messprotokoll".'
        : `${ergebnis.grund} Öffne zuerst „Messprotokoll".`,
    );
  };

  return (
    <div>
      <div className="reiterreihe">
        {MESSAUFGABEN.map((m) => (
          <button
            key={m.id}
            className={`reiter ${m.id === aufgabeId ? 'aktiv' : ''}`}
            onClick={() => aufgabeWechseln(m.id)}
          >
            {m.titel}
          </button>
        ))}
      </div>

      {/* --- Auftrag --- */}
      <section className="karte">
        <div className="prKopf">
          <span className="prTitel">{aufgabe.titel}</span>
          <span className="prGewicht">{aufgabe.punkte} Punkte</span>
        </div>
        <p>{aufgabe.auftrag}</p>
        <div className="prMeta">
          {aufgabe.spannungsfrei ? 'Anlage muss spannungsfrei sein' : 'Anlage bleibt unter Spannung'}
        </div>
      </section>

      {/* --- Gerät --- */}
      <section className="karte geraet">
        <div className="displayKasten">
          <div className={`display ${gemessen?.gefahr ? 'displayGefahr' : ''}`}>
            <span className="displayWert">{gemessen ? gemessen.text : '– – –'}</span>
            <span className="displayEinheit">{gemessen ? gemessen.einheit : ''}</span>
          </div>
          <div className="displayFuss">
            {aktuelleMessart.symbol} · Buchse {geraet.roteBuchse}
            {gemessen?.gefahr === 'gerät' && <span className="displayGefahrLeuchte">⚠ Gerät</span>}
            {gemessen?.gefahr === 'person' && <span className="displayGefahrLeuchte">⚠ Gefahr</span>}
          </div>
        </div>

        <h3>Drehschalter</h3>
        <div className="drehschalter">
          {MESSARTEN.map((m) => (
            <button
              key={m.id}
              className={`stufe ${m.id === geraet.messart ? 'aktiv' : ''}`}
              onClick={() => setGeraet({ ...geraet, messart: m.id as Messart })}
              title={m.bedingung}
            >
              <span className="messSymbol">{m.symbol}</span>
              <span className="klein">{m.beschriftung}</span>
            </button>
          ))}
        </div>

        <h3>Rote Messleitung</h3>
        <div className="buchsen">
          {(['VΩ', 'mA', 'A'] as Buchse[]).map((b) => (
            <button
              key={b}
              className={`buchse ${b === geraet.roteBuchse ? 'aktiv' : ''}`}
              onClick={() => setGeraet({ ...geraet, roteBuchse: b })}
            >
              {b}
            </button>
          ))}
          <span className="buchse buchseFest" title="Die schwarze Leitung steckt immer in COM.">
            COM (schwarz)
          </span>
        </div>
        <p className="klein">{aktuelleMessart.bedingung}</p>
      </section>

      {/* --- Anlage --- */}
      <section className="karte">
        <div className="prKopf">
          <span className="prTitel">Anlage</span>
          <span className={`prGewicht ${spannungsfrei ? 'gruen' : 'rot'}`}>
            {spannungsfrei ? 'spannungsfrei' : 'unter Spannung'}
          </span>
        </div>
        <div className="raster raster2">
          <button
            className={spannungsfrei ? 'gewaehlt' : ''}
            onClick={() => {
              setSpannungsfrei(true);
              setGemessen(null);
            }}
          >
            Freischalten
          </button>
          <button
            className={!spannungsfrei ? 'gewaehlt' : ''}
            onClick={() => {
              setSpannungsfrei(false);
              setGemessen(null);
            }}
          >
            Unter Spannung setzen
          </button>
        </div>

        <h3>Messspitzen</h3>
        <div className="messpunkte">
          <label className="messfeld">
            <span className="klein">Rote Spitze</span>
            <select value={punktA} onChange={(e) => { setPunktA(e.target.value); setGemessen(null); }}>
              {anlage.punkte.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bezeichnung}
                </option>
              ))}
            </select>
          </label>
          <label className="messfeld">
            <span className="klein">Schwarze Spitze (COM)</span>
            <select value={punktB} onChange={(e) => { setPunktB(e.target.value); setGemessen(null); }}>
              {anlage.punkte.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bezeichnung}
                </option>
              ))}
            </select>
          </label>
        </div>
        {A && <p className="klein">{A.hinweis}</p>}

        <button className="haupt" onClick={messenJetzt}>
          Messen
        </button>
      </section>

      {/* --- Ergebnis --- */}
      {gemessen && (
        <section className={`karte ${befund?.richtig ? '' : 'fehler'}`}>
          <div className="prKopf">
            <span className={`prTitel ${befund?.richtig ? 'gruen' : 'rot'}`}>
              {befund?.richtig ? 'Richtig gemessen' : 'So nicht'}
            </span>
            <span className="prGewicht">
              {befund ? punkteMitHinweisen(aufgabe, hilfeStufe).toFixed(1) : 0} / {aufgabe.punkte} P
            </span>
          </div>

          {gemessen.warnung && <p className="warnung">{gemessen.warnung}</p>}

          {befund && befund.maengel.length > 0 && (
            <ul className="pruefliste">
              {befund.maengel.map((m) => (
                <li key={m}>
                  <span className="marke rot">✗</span>
                  <span className="prText">{m}</span>
                  <span className="prWert" />
                </li>
              ))}
            </ul>
          )}

          {befund?.richtig && (
            <>
              <p className="klein">
                Erwartet: {befund.erwartung}. {aufgabe.begruendung}
              </p>
              {aufgabe.protokollSchritt && (
                <button className="still" onClick={uebernehmen}>
                  Wert ins Prüfprotokoll übernehmen
                </button>
              )}
              {uebernommen && <p className="klein">{uebernommen}</p>}
            </>
          )}

          {!befund?.richtig && (
            <p className="klein">
              Korrigiere Drehschalter, Buchse oder Messort und miss erneut. Die Anzeige
              verrät dabei nichts – genau wie am echten Gerät.
            </p>
          )}
        </section>
      )}

      {/* --- Hilfe --- */}
      <section className="karte">
        <div className="prKopf">
          <span className="prTitel">Hilfe</span>
          <span className="prGewicht">
            {hilfeStufe > 0 ? `Stufe ${hilfeStufe} · ${Math.round(hilfeStufe * 15)} % Abzug` : 'noch keine'}
          </span>
        </div>
        {hilfeStufe > 0 && <p>{hinweis(aufgabe, hilfeStufe)}</p>}
        <div className="raster raster2">
          <button disabled={hilfeStufe >= 4} onClick={() => setHilfeStufe((s) => Math.min(4, s + 1))}>
            Hinweis geben
          </button>
          <button className="still" disabled={hilfeStufe === 0} onClick={() => setHilfeStufe(0)}>
            Zurücksetzen
          </button>
        </div>
        <p className="klein">
          Jeder Hinweis kostet 15 % der Punkte – wie eine Rückfrage in der Prüfung.
        </p>
      </section>

      <section className="karte">
        <h3>Warum diese Übung so aufgebaut ist</h3>
        <p className="klein">
          Ein falsch eingestelltes Messgerät zeigt keinen Fehler, sondern einen Wert.
          Wer bei eingestelltem Widerstandsmessbereich Spannung misst, liest „O.L“ und
          hält das vielleicht für einen hochohmigen Stromkreis. Deshalb wird hier die
          echte Anzeige nachgebildet, samt der Fälle, in denen ein Gerät in Wirklichkeit
          Schaden nimmt.
        </p>
        <p className="klein">
          Beispiel: {formatZahl(0.4, 1)} Ω zwischen PE-Klemme und Potentialausgleich ist
          Durchgang. Eine Strommessung parallel zur Spannung dagegen ist ein Kurzschluss
          über das Messgerät – dort brennt die Feinsicherung.
        </p>
      </section>
    </div>
  );
}
