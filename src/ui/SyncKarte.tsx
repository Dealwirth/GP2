import { useState } from 'react';
import { verbindungscode } from '../sync/verbindung.ts';
import type { SyncSteuerung } from '../sync/useSync.ts';

/**
 * Die Karte „Überall verfügbar" in den Einstellungen.
 *
 * Sie muss zwei sehr verschiedene Menschen bedienen: den, der zum ersten Mal
 * einschaltet, und den, der auf einem zweiten Gerät beitritt. Deshalb ist sie
 * in zwei Abschnitte geteilt, und der zweite ist zugeklappt, solange man ihn
 * nicht braucht.
 *
 * Eine Entscheidung, die man sieht: Das Passwort wird **nicht** angezeigt und
 * nicht im Verbindungscode mitgeschickt. Wer den Code abfängt, hat den Ort,
 * aber nicht den Inhalt – das ist der ganze Sinn der Trennung.
 */
export function SyncKarte(props: { sync: SyncSteuerung }) {
  const { sync } = props;
  const { verbindung, zustand } = sync;

  const [workerUrl, setWorkerUrl] = useState(verbindung.workerUrl);
  const [passwort, setPasswort] = useState('');
  const [code, setCode] = useState('');
  const [beitreten, setBeitreten] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);

  const ausfuehren = async (arbeit: () => Promise<void>): Promise<void> => {
    setBeschaeftigt(true);
    setFehler(null);
    setMeldung(null);
    try {
      await arbeit();
    } finally {
      setBeschaeftigt(false);
    }
  };

  const einschalten = (): Promise<void> =>
    ausfuehren(async () => {
      const ergebnis = await sync.verbinden({
        workerUrl,
        passwort,
        code: beitreten ? code : undefined,
        neuAnlegen: !beitreten,
      });
      if (ergebnis.ok) {
        setPasswort('');
        setMeldung('Eingeschaltet. Der Lernstand liegt jetzt auch auf dem Server.');
      } else {
        setFehler(ergebnis.grund);
      }
    });

  const abgleichen = (): Promise<void> =>
    ausfuehren(async () => {
      await sync.jetztAbgleichen();
    });

  const trennen = (loeschen: boolean): Promise<void> =>
    ausfuehren(async () => {
      if (loeschen && !confirm('Den Stand auf dem Server löschen? Der Lernstand auf diesem Gerät bleibt.')) {
        return;
      }
      await sync.trennen(loeschen);
      setMeldung(loeschen ? 'Getrennt und im Netz gelöscht.' : 'Getrennt. Auf diesem Gerät bleibt alles.');
    });

  const codeZumTeilen = verbindung.kennung !== '' ? verbindungscode(verbindung) : '';

  const kopieren = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(codeZumTeilen);
      setMeldung('Verbindungscode kopiert.');
      setFehler(null);
    } catch {
      setFehler('Kopieren ging nicht. Markiere den Code und kopiere ihn von Hand.');
    }
  };

  return (
    <section className="karte">
      <h2>Überall verfügbar</h2>
      <p className="klein">
        Eingeschaltet liegt dein Lernstand zusätzlich beim eigenen Cloudflare-Worker
        – verschlüsselt mit deinem Passwort. Auf einem zweiten Gerät trägst du den
        Verbindungscode und dasselbe Passwort ein und machst dort weiter, wo du
        aufgehört hast. Der Server sieht nur Chiffre; Aufgaben und Lösungen sind
        nie dabei, nur dein Lernstand.
      </p>

      {!verbindung.aktiv && (
        <>
          <label className="feldLabel">
            <input
              type="checkbox"
              checked={beitreten}
              onChange={(e) => setBeitreten(e.target.checked)}
            />{' '}
            Auf einem zweiten Gerät beitreten
          </label>

          {beitreten ? (
            <label className="eingabeZeile">
              <span>Verbindungscode</span>
              <input
                type="text"
                placeholder="EGT1-…"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          ) : (
            <label className="eingabeZeile">
              <span>Worker-Adresse</span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://egt-trainer.…workers.dev"
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
              />
            </label>
          )}

          <label className="eingabeZeile">
            <span>Passwort</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="mindestens 8 Zeichen"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
            />
          </label>
          <p className="klein">
            Dieses Passwort verlässt das Gerät nie. Es ist nicht wiederherstellbar –
            ohne es sind die Daten im Netz nicht mehr lesbar, auch für dich nicht.
          </p>

          <button className="haupt" disabled={beschaeftigt} onClick={() => void einschalten()}>
            {beschaeftigt ? 'Verbinde …' : beitreten ? 'Beitreten' : 'Einschalten'}
          </button>
        </>
      )}

      {verbindung.aktiv && (
        <>
          <p className="klein okText">
            Eingeschaltet. Adresse: {verbindung.workerUrl}
          </p>

          <label className="eingabeZeile">
            <span>Verbindungscode</span>
            <input type="text" readOnly value={codeZumTeilen} onFocus={(e) => e.target.select()} />
          </label>
          <button onClick={() => void kopieren()}>Code kopieren</button>

          <div className="zeile">
            <span>Letzter Abgleich</span>
            <span className="klein">
              {verbindung.letzterAbgleich
                ? new Date(verbindung.letzterAbgleich).toLocaleString('de-DE')
                : 'noch keiner'}
            </span>
          </div>
          {zustand.art === 'ok' && (
            <div className="zeile">
              <span>Abgeglichener Stand</span>
              <span className="klein">
                {zustand.kennzahlen.themen} Themen · {zustand.kennzahlen.antworten} Antworten ·{' '}
                {zustand.kennzahlen.pruefungen} Prüfungen
              </span>
            </div>
          )}
          {zustand.art === 'laeuft' && <p className="klein">Gleiche ab …</p>}
          {zustand.art === 'fehler' && (
            <p className="frist dringend">
              {zustand.grund} {zustand.naechsterSchritt}
            </p>
          )}

          <div className="raster raster2">
            <button disabled={beschaeftigt} onClick={() => void abgleichen()}>
              Jetzt abgleichen
            </button>
            <button disabled={beschaeftigt} onClick={() => void trennen(false)}>
              Trennen
            </button>
          </div>
          <button className="gefahr" disabled={beschaeftigt} onClick={() => void trennen(true)}>
            Trennen und im Netz löschen
          </button>
        </>
      )}

      {meldung && <p className="klein okText">{meldung}</p>}
      {fehler && <p className="klein frist dringend">{fehler}</p>}
    </section>
  );
}
