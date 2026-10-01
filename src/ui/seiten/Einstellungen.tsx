import { useState } from 'react';
import { storage } from '../../storage/index.ts';
import {
  erzeugeExport,
  leseExport,
  type Einstellungen,
} from '../einstellungen.ts';
import { speichereErgebnisse } from '../../storage/ergebnisse.ts';
import {
  gleicheAb,
  ladeSyncEinstellungen,
  pruefeToken,
  speichereSyncEinstellungen,
  uebernehmeStand,
  type SyncEinstellungen,
} from '../../sync/index.ts';
import type { Store } from '../store.ts';

/**
 * Einstellungen.
 *
 * Was hier zu regeln ist: die Termine, der Aufgaben-Vorrat und was mit deinen
 * Daten passiert. Es gibt keinen Server und keinen Account.
 */
export function Einstellungen(props: { store: Store }) {
  const { store } = props;
  const einstellungSetzen = store.einstellungSetzen;
  const zuruecksetzen = store.zuruecksetzen;
  const [passwort, setPasswort] = useState('');
  const [passwort2, setPasswort2] = useState('');
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncEinstellungen>(() => ladeSyncEinstellungen());
  const [syncLaeuft, setSyncLaeuft] = useState(false);
  const [syncMeldung, setSyncMeldung] = useState<string | null>(null);
  const [syncFehler, setSyncFehler] = useState<string | null>(null);

  const syncAendern = (patch: Partial<SyncEinstellungen>): void => {
    setSync((alt) => {
      const neu = { ...alt, ...patch };
      speichereSyncEinstellungen(neu);
      return neu;
    });
  };

  const tokenPruefen = async (): Promise<void> => {
    setSyncFehler(null);
    setSyncMeldung(null);
    try {
      const name = await pruefeToken(sync.token);
      setSyncMeldung(`Token gültig. Angemeldet als ${name}.`);
    } catch (e) {
      setSyncFehler(e instanceof Error ? e.message : 'Token konnte nicht geprüft werden.');
    }
  };

  const abgleichen = async (): Promise<void> => {
    if (passwort.length < 8) {
      setSyncFehler('Das Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    setSyncLaeuft(true);
    setSyncFehler(null);
    setSyncMeldung(null);
    try {
      const ergebnis = await gleicheAb(sync, passwort);
      await uebernehmeStand(ergebnis.stand);
      await store.aktualisieren();
      setSync((alt) => ({ ...alt, gistId: ergebnis.gistId, letzterAbgleich: new Date().toISOString() }));
      setSyncMeldung(
        ergebnis.fremdeThemen === 0
          ? 'Abgeglichen. Auf dem anderen Gerät lag noch kein Stand.'
          : `Abgeglichen. ${ergebnis.uebernommen} von ${ergebnis.fremdeThemen} Themen waren dort weiter.`,
      );
    } catch (e) {
      setSyncFehler(e instanceof Error ? e.message : 'Der Abgleich ist fehlgeschlagen.');
    } finally {
      setSyncLaeuft(false);
    }
  };

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
        einstellungen: store.einstellungen,
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
        <h2>Aufgaben</h2>
        <p className="klein">
          Alle Aufgaben sind fest eingebaut und auf dem Gerät geprüft. Es gibt
          keine Verbindung nach außen, keinen Schlüssel und kein Kontingent.
        </p>

        <label className="eingabeZeile">
          <span>Aufgaben-Vorrat</span>
          <input
            type="number"
            min={0}
            max={60}
            step={5}
            value={store.einstellungen.vorrat}
            onChange={(e) => aendern({ vorrat: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })}
          />
        </label>
        <p className="klein">
          So viele Aufgaben hält die App im Hintergrund fertig, damit eine Runde
          sofort beginnt. Sechs ist die Voreinstellung. Null schaltet das
          Vorladen ab. Der Vorrat steht oben im Kopf.
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
          Backup als Datei und den verschlüsselten Abgleich oben.
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
        <h2>Auf mehreren Geräten üben</h2>
        <p className="klein">
          Rechner, Tablet, Telefon – mit demselben Stand. Die App legt dafür
          einen <strong>privaten Gist</strong> in deinem eigenen GitHub-Konto
          an. Kein Server von uns, keine laufenden Kosten. Der Inhalt wird
          vorher mit deinem Passwort verschlüsselt; GitHub sieht nur Zahlen.
        </p>

        <label className="eingabeZeile">
          <span>GitHub-Token</span>
          <input
            type="password"
            autoComplete="off"
            placeholder={'ghp_… (nur mit der Berechtigung „gist“)'}
            value={sync.token}
            onChange={(e) => syncAendern({ token: e.target.value })}
          />
        </label>
        <p className="klein">
          Anzulegen unter{' '}
          <a href="https://github.com/settings/tokens/new?scopes=gist&description=EGT-Pr%C3%BCfungstrainer" target="_blank" rel="noreferrer">
            github.com/settings/tokens
          </a>
          . Nur den Haken <em>gist</em> setzen – mehr braucht es nicht.
        </p>

        <div className="raster raster2">
          <button type="button" onClick={() => void tokenPruefen()} disabled={!sync.token.trim()}>
            Token prüfen
          </button>
          <button type="button" onClick={() => void abgleichen()} disabled={syncLaeuft || !sync.token.trim()}>
            {syncLaeuft ? 'Gleiche ab …' : 'Jetzt abgleichen'}
          </button>
        </div>


        {sync.gistId && (
          <p className="klein">
            Ablage: Gist {sync.gistId.slice(0, 8)}…{' '}
            {sync.letzterAbgleich && `· zuletzt ${new Date(sync.letzterAbgleich).toLocaleString('de-DE')}`}
          </p>
        )}
        <p className="klein">
          Dasselbe Passwort auf allen Geräten – es ist der Schlüssel. Geht es
          verloren, ist der abgelegte Stand nicht mehr lesbar; das Gerät selbst
          behält seinen Lernstand aber. Das Passwort wird nirgends gespeichert
          und für jeden Abgleich neu abgefragt.
        </p>

        {syncMeldung && <p className="klein okText">{syncMeldung}</p>}
        {syncFehler && <p className="klein frist dringend">{syncFehler}</p>}

        {sync.gistId && (
          <button
            type="button"
            onClick={() => syncAendern({ gistId: '', letzterAbgleich: null })}
          >
            Ablage trennen (Gist bleibt bestehen)
          </button>
        )}
      </section>

      <section className="karte">
        <h2>Über diese Anwendung</h2>
        <p className="klein">
          Statische Anwendung ohne eigenen Server. Alle Aufgaben sind fest
          eingebaut; gerechnet und geprüft wird auf deinem Gerät. Der Lernstand
          bleibt hier – es sei denn, du schaltest den Abgleich ausdrücklich
          ein; dann geht er verschlüsselt in deinen eigenen GitHub-Gist.
        </p>
      </section>
    </div>
  );
}
