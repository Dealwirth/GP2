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
import { SyncKarte } from '../SyncKarte.tsx';
import type { SyncSteuerung } from '../../sync/useSync.ts';
import type { Store } from '../store.ts';

/**
 * Einstellungen.
 *
 * Zwei Fragen bestimmen diesen Bildschirm: Welche KI soll Aufgaben erzeugen, und
 * was passiert mit deinen Daten. Beides wird hier beantwortet – ohne Umwege
 * und ohne Account.
 */
export function Einstellungen(props: { store: Store; sync: SyncSteuerung }) {
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

        <label className="eingabeZeile">
          <span>Worker-Adresse</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://egt-proxy.workers.dev"
            value={store.einstellungen.workerUrl}
            onChange={(e) => aendern({ workerUrl: e.target.value })}
          />
        </label>
        <p className="klein">
          Der kostenlose Cloudflare-Worker hält den API-Schlüssel geheim und gibt
          nichts weiter. Ohne Worker trägst du den Schlüssel direkt ein – dann
          verlässt er dein Gerät direkt an Groq.
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
            value={store.einstellungen.modelle[0] ?? STANDARD_MODELLE[0]}
            onChange={(e) => aendern({ modelle: [e.target.value, ...store.einstellungen.modelle.slice(1)] })}
          >
            {Object.entries(STANDARD_MODELLE).map(([kurz, lang]) => (
              <option key={kurz} value={kurz}>
                {lang}
              </option>
            ))}
          </select>
        </label>

        <p className={`klein ${kiBereit(store.einstellungen) ? 'okText' : 'frist dringend'}`}>
          {kiBereit(store.einstellungen)
            ? 'KI ist bereit. Aufgaben werden zusätzlich zu den geprüften Grundaufgaben erzeugt.'
            : 'KI ist nicht verbunden. Es funktioniert alles außer der Aufgabenerzeugung.'}
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

      <SyncKarte sync={props.sync} />

      <section className="karte">
        <h2>Deine Daten</h2>
        <p className="klein">
          Dein Lernstand liegt in diesem Browser – und, wenn du es oben
          eingeschaltet hast, zusätzlich verschlüsselt auf deinem eigenen
          Cloudflare-Worker. Gelöschte Browserdaten sind sonst weg, deshalb
          gibt es zusätzlich das Backup als Datei.
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
          Statische Anwendung ohne Server. Der Quellcode enthält nur Programm und
          Faktenbasis – beides Allgemeinwissen aus Verordnung und Norm. Kein
          Schlüssel, kein Lernstand, keine Notizen im Quelltext.
        </p>
        <p className="klein">
          Standardschnitt: {STANDARDEINSTELLUNGEN.modelle.join(', ')}
        </p>
      </section>
    </div>
  );
}
