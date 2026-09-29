import { useState } from 'react';
import { storage } from '../../storage/index.ts';
import {
  erzeugeExport,
  kiBereit,
  leseExport,
  STANDARDEINSTELLUNGEN,
  type Einstellungen,
} from '../einstellungen.ts';
import { STANDARD_MODELLE } from '../../ai/client.ts';
import { speichereErgebnisse } from '../../storage/ergebnisse.ts';
import type { Store } from '../store.ts';

/**
 * Einstellungen.
 *
 * Zwei Fragen bestimmen diesen Bildschirm: Welche KI soll Aufgaben erzeugen, und
 * was passiert mit deinen Daten. Beides wird hier beantwortet – ohne Umwege
 * und ohne Account.
 */
export function Einstellungen(props: { store: Store }) {
  const { store } = props;
  const einstellungSetzen = store.einstellungSetzen;
  const zuruecksetzen = store.zuruecksetzen;
  const [passwort, setPasswort] = useState('');
  const [passwort2, setPasswort2] = useState('');
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const aendern = (patch: Partial<Einstellungen>): void => {
    void einstellungSetzen(patch);
  };

  const exportieren = async (): Promise<void> => {
    if (passwort.length < 8) {
      setFehler('Das Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    const daten = await storage.alleErgebnisse();
    const text = await erzeugeExport(
      {
        einstellungen: (({ groqKey: _weg, ...rest }) => rest)(store.einstellungen),
        zustaende: daten.zustaende,
        versuche: daten.versuche,
        sitzungen: daten.sitzungen,
        ergebnisse: store.ergebnisse,
      },
      passwort,
    );
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `egt-lernstand-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMeldung('Export erstellt. Das Passwort kann nicht wiederhergestellt werden.');
    setFehler(null);
  };

  const importieren = async (datei: File): Promise<void> => {
    try {
      const daten = await leseExport(await datei.text(), passwort);
      await storage.loescheAlles();
      for (const z of daten.zustaende as { topicId: string }[]) {
        await storage.schreibeZustand(z as never);
      }
      await speichereErgebnisse((daten.ergebnisse ?? []) as never);
      await store.aktualisieren();
      setMeldung('Lernstand wiederhergestellt.');
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Import fehlgeschlagen.');
    }
  };

  return (
    <div>
      <section className="karte">
        <h2>Künstliche Intelligenz</h2>
        <p className="klein">
          Die KI erzeugt nur Aufgabenvorschläge. Sie bekommt nie eine fertige
          Aufgabe und nie eine Lösung zu sehen – Rechnung und Prüfung passieren
          auf deinem Gerät. Ohne KI bleibt alles funktionsfähig.
        </p>

        <label className="feldLabel">
          <input
            type="checkbox"
            checked={store.einstellungen.kiAktiv}
            onChange={(e) => aendern({ kiAktiv: e.target.checked })}
          />{' '}
          KI-Aufgaben erzeugen
        </label>

        <label className="feldLabel">
          <input
            type="checkbox"
            checked={store.einstellungen.zweitpruefung}
            onChange={(e) => aendern({ zweitpruefung: e.target.checked })}
          />{' '}
          Zweitprüfung durch zweites Modell
        </label>

        <p className="klein">
          Der Groq-Schlüssel ist fest eingebaut – die KI arbeitet sofort, ohne
          Einrichtung. Wer einen eigenen Schlüssel nutzen will, kann ihn hier
          ersetzen (kostenlos auf console.groq.com).
        </p>

        <label className="eingabeZeile">
          <span>Groq-Schlüssel</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="gsk_…"
            value={store.einstellungen.groqKey}
            onChange={(e) => aendern({ groqKey: e.target.value })}
          />
        </label>

        <label className="eingabeZeile">
          <span>Modell</span>
          <select
            value={store.einstellungen.modelle[0] ?? 'openai/gpt-oss-120b'}
            onChange={(e) => aendern({ modelle: [e.target.value, ...store.einstellungen.modelle.slice(1)] })}
          >
            {Object.entries(STANDARD_MODELLE).map(([kurz, id]) => (
              <option key={id} value={id}>
                {kurz}
              </option>
            ))}
          </select>
        </label>
        <p className="klein">
          Standard: GPT-OSS 120b – präzise bei Rechenaufgaben. GPT-OSS 20b ist
          der schnelle Ausweich; Qwen 3.8 27b, falls ein Modell gerade nicht
          liefert. Steht ein Modell nicht mehr zur Verfügung, sagt das der
          Verbindungstest unten – dann hier einfach umschalten.
        </p>

        <p className={`klein ${kiBereit(store.einstellungen) ? 'okText' : 'frist dringend'}`}>
          {kiBereit(store.einstellungen)
            ? 'KI ist bereit. Jede Aufgabe wird frisch erzeugt und geprüft.'
            : 'KI ist ausgeschaltet. Es entstehen keine Aufgaben.'}
        </p>
      </section>

      <section className="karte">
        <h2>Termine</h2>
        <label className="eingabeZeile">
          <span>Schriftliche Prüfung</span>
          <input
            type="date"
            value={store.einstellungen.pruefungsdatumSchriftlich}
            onChange={(e) => aendern({ pruefungsdatumSchriftlich: e.target.value })}
          />
        </label>
        <label className="eingabeZeile">
          <span>Praktische Prüfung</span>
          <input
            type="date"
            value={store.einstellungen.pruefungsdatumPraktisch}
            onChange={(e) => aendern({ pruefungsdatumPraktisch: e.target.value })}
          />
        </label>
        <p className="klein">
          Maßgeblich ist dein Einladungsschreiben. Trage die dort genannten
          Daten hier ein – dann gelten sie in der ganzen App als amtlich, und
          alle Countdowns rechnen damit.
        </p>
      </section>

      <section className="karte">
        <h2>Anleitung</h2>
        <label className="eingabeZeile">
          <span>Hinweis an deinen KI-Coach</span>
          <textarea
            rows={3}
            placeholder="z. B. schwierige Themen zuerst, kurze Erklärungen"
            value={store.einstellungen.eigenerCoachHinweis}
            onChange={(e) => aendern({ eigenerCoachHinweis: e.target.value })}
          />
        </label>
        <label className="feldLabel">
          <input
            type="checkbox"
            checked={store.einstellungen.animationen}
            onChange={(e) => aendern({ animationen: e.target.checked })}
          />{' '}
          Animationen im Labor
        </label>
        <label className="feldLabel">
          <input
            type="checkbox"
            checked={store.einstellungen.taeglicheErinnerung}
            onChange={(e) => aendern({ taeglicheErinnerung: e.target.checked })}
          />{' '}
          Tägliche Erinnerung
        </label>
      </section>

      <section className="karte">
        <h2>Deine Daten</h2>
        <p className="klein">
          Dein Lernstand liegt auf diesem Gerät – automatisch, nach jeder
          Antwort. Gelöschte Browserdaten löschen ihn mit; deshalb gibt es das
          Backup als Datei.
        </p>

        <label className="eingabeZeile">
          <span>Passwort</span>
          <input type="password" value={passwort} onChange={(e) => setPasswort(e.target.value)} />
        </label>
        <label className="eingabeZeile">
          <span>Passwort wiederholen</span>
          <input type="password" value={passwort2} onChange={(e) => setPasswort2(e.target.value)} />
        </label>
        {passwort2 !== '' && passwort !== passwort2 && (
          <p className="frist dringend">Die Passwörter stimmen nicht überein.</p>
        )}

        <div className="raster raster2">
          <button onClick={() => void exportieren()}>Backup erstellen</button>
          <label className="dateiKnopf">
            Backup einspielen
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const datei = e.target.files?.[0];
                if (datei) void importieren(datei);
              }}
            />
          </label>
        </div>

        {meldung && <p className="klein okText">{meldung}</p>}
        {fehler && <p className="klein frist dringend">{fehler}</p>}

        <hr />
        <button
          className="gefahr"
          onClick={() => {
            if (confirm('Wirklich alles löschen? Lernstand, Versuche und Ergebnisse gehen unwiderruflich verloren.')) {
              void zuruecksetzen();
              setMeldung('Alles gelöscht.');
            }
          }}
        >
          Alles löschen
        </button>
      </section>

      <section className="karte">
        <h2>Über diese Anwendung</h2>
        <p className="klein">
          Statische Anwendung ohne Server. Aufgaben stellt die KI (Groq),
          gespeist aus dem eingebauten Lernlager; gerechnet und geprüft wird
          auf deinem Gerät. Der Lernstand verlässt es nicht.
        </p>
        <p className="klein">
          Standardschnitt: {STANDARDEINSTELLUNGEN.modelle.join(', ')}
        </p>
      </section>
    </div>
  );
}
