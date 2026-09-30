import { useMemo, useState } from 'react';
import type { Task } from '../../domain/types.ts';
import { ATOME, KAPITEL, holeAtom } from '../../content/curriculum/index.ts';
import { erzeugeAufgaben } from '../../ai/generator.ts';
import { selbsttest, type SelbsttestErgebnis } from '../../ai/selbsttest.ts';
import { merkeAufgaben } from '../../tasks/ablage.ts';
import { startSitzung } from '../../tasks/session.ts';
import { aiEinstellungenAus } from '../einstellungen.ts';
import { KiHinweis } from '../KiStatus.tsx';
import { useKiStatus } from '../KiStatus.tsx';
import type { Store } from '../store.ts';
import type { SeitenName } from '../router.ts';

/**
 * KI-Werkstatt.
 *
 * Der Ort, an dem zusätzliche Aufgaben entstehen. Bewusst *hier* und nicht
 * mitten im Aufgabenablauf: Man entscheidet vorher, was man üben will, und
 * sieht, was dabei herausgekommen ist – statt während einer Session auf ein
 * Modell zu warten.
 *
 * Jede erzeugte Aufgabe hat denselben Weg durch die Prüfung genommen wie jede
 * andere: Rechenrezept, Faktenbindung, Duplikatsperre, Zweitprüfung. Was hier
 * erscheint, ist geprüft. Was durchgefallen ist, wird mit Grund angezeigt –
 * nicht stillschweigend weggeworfen, sonst wüsste man nicht, dass etwas fehlt.
 */
export function KiWerkstatt(props: { store: Store; wechsle: (s: SeitenName) => void }) {
  const { store } = props;
  const einstellungen = store.einstellungen;
  const ai = useMemo(() => aiEinstellungenAus(einstellungen), [einstellungen]);
  const { zustand, setzeZustand, pruefeVerbindung } = useKiStatus();

  const [themaId, setThemaId] = useState<string>(ATOME[0]?.id ?? '');
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Task[]>([]);
  const [verworfen, setVerworfen] = useState<{ grund: string; vorschlag: string }[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [test, setTest] = useState<SelbsttestErgebnis | null>(null);
  const [testLaeuft, setTestLaeuft] = useState(false);

  const teste = async (): Promise<void> => {
    setTestLaeuft(true);
    setTest(null);
    try {
      setTest(await selbsttest(ai, AbortSignal.timeout(90_000)));
    } catch (fehler) {
      setTest({
        ok: false,
        modell: ai.modell,
        stufen: [
          {
            name: 'Aufbau',
            ok: false,
            detail: fehler instanceof Error ? fehler.message : 'Unbekannter Fehler.',
          },
        ],
      });
    } finally {
      setTestLaeuft(false);
    }
  };

  const kapitel = useMemo(() => {
    return KAPITEL.map((k) => ({
      id: k.id,
      titel: k.titel,
      atome: ATOME.filter((a) => a.kapitelId === k.id),
    })).filter((k) => k.atome.length > 0);
  }, []);

  const thema = holeAtom(themaId);

  const erzeugen = async (): Promise<void> => {
    if (!thema) return;
    setLaeuft(true);
    setMeldung(null);
    setErgebnis([]);
    setVerworfen([]);

    try {
      const antwort = await erzeugeAufgaben(ai, thema, 3, AbortSignal.timeout(60_000));
      setErgebnis(antwort.aufgaben);
      setVerworfen(antwort.verworfen);

      if (!antwort.kiAktiv) {
        setzeZustand({
          art: 'fehler',
          grund: 'Die Anfrage kam nicht durch.',
          naechsterSchritt: 'Verbindung prüfen und erneut versuchen.',
        });
      } else if (antwort.aufgaben.length > 0) {
        setzeZustand({ art: 'bereit', modell: ai.modell, dauerMs: 0 });
        merkeAufgaben(antwort.aufgaben);
      } else {
        setMeldung(
          'Das Modell hat diesmal keine Aufgabe geliefert, die die Prüfung bestanden hätte. ' +
            'Das ist kein Fehler deiner Eingabe – erneut versuchen oder ein anderes Thema wählen.',
        );
      }
    } catch (fehler) {
      setzeZustand({
        art: 'fehler',
        grund: fehler instanceof Error ? fehler.message : 'Unbekannter Fehler.',
        naechsterSchritt: 'Erneut versuchen oder die Einstellungen prüfen.',
      });
    } finally {
      setLaeuft(false);
    }
  };

  const ueben = (aufgaben: Task[]): void => {
    if (aufgaben.length === 0) return;
    startSitzung(
      aufgaben,
      { minuten: Math.max(5, aufgaben.length * 2), label: 'KI-Aufgaben' },
      'pause',
    );
    props.wechsle('ueben');
  };

  return (
    <div>
      <h3>KI-Werkstatt</h3>
      <p className="klein">
        Zusätzliche Aufgaben zu einem Thema. Jede läuft durch dieselbe Prüfung wie der
        feste Bestand – Rechnung, Faktenbindung, Zweitprüfung.
      </p>

      {!ai.aktiv && (
        <div className="warnung">
          <p className="klein">
            Die KI ist ausgeschaltet – sie lässt sich in den Einstellungen wieder
            einschalten. Ohne sie stellt diese Werkstatt keine Aufgaben.
          </p>
          <button onClick={() => props.wechsle('einstellungen')}>Zu den Einstellungen</button>
        </div>
      )}

      <KiHinweis
        zustand={zustand}
        onEinstellungen={() => props.wechsle('einstellungen')}
        onErneutVersuchen={() => void pruefeVerbindung(ai)}
      />

      <section className="karte">
        <label className="messfeld">
          <span className="klein">Thema</span>
          <select value={themaId} onChange={(e) => setThemaId(e.target.value)}>
            {kapitel.map((k) => (
              <optgroup key={k.id} label={k.titel}>
                {k.atome.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.titel}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {thema && (
          <>
            <div className="prMeta">
              {thema.kapitelTitel} · {thema.position}
            </div>
            <p className="klein">{thema.lernziel}</p>
          </>
        )}

        <div className="raster raster2">
          <button disabled={laeuft || !thema} onClick={() => void erzeugen()}>
            {laeuft ? 'Erzeugt …' : 'Aufgaben erzeugen'}
          </button>
          <button disabled={testLaeuft || !ai.aktiv} onClick={() => void teste()}>
            {testLaeuft ? 'Prüft …' : 'KI-Selbsttest'}
          </button>
        </div>
        <p className="klein">
          Der Selbsttest prüft die ganze Kette – Verbindung, Vorschlag, Rechnung,
          Validierung – und zeigt je Stufe, was zurückkommt. Damit siehst du
          sofort, ob die KI wirklich Aufgaben liefert oder wo es hakt.
        </p>
      </section>

      {test && (
        <section className="karte">
          <div className="prKopf">
            <span className="prTitel">
              KI-Selbsttest · {test.ok ? 'bestanden' : 'nicht bestanden'}
            </span>
            <span className="prGewicht">{test.modell}</span>
          </div>
          {test.stufen.map((s) => (
            <div key={s.name} className="zeile">
              <span className={s.ok ? 'okText' : 'frist dringend'}>{s.ok ? '✓' : '✗'} {s.name}</span>
              <span className="klein lueckText">{s.detail}</span>
            </div>
          ))}
          {test.task && (
            <>
              <p className="klein">
                Beispielaufgabe: {test.task.proposal.prompt}
              </p>
              <p className="klein">
                Optionen: {test.task.proposal.options?.map((o) => o.text).join(' | ')} · richtig:{' '}
                {test.task.correctOptionId}
              </p>
            </>
          )}
        </section>
      )}

      {meldung && <p className="warnung">{meldung}</p>}

      {ergebnis.length > 0 && (
        <section className="karte">
          <div className="prKopf">
            <span className="prTitel">Geprüfte Aufgaben</span>
            <span className="prGewicht">{ergebnis.length}</span>
          </div>
          {ergebnis.map((t) => (
            <div key={t.taskId} className="zeile">
              <span className="lueckText">{t.proposal.prompt.slice(0, 90)}</span>
              <span className="zahlKlein">Stufe {t.proposal.stufe}</span>
            </div>
          ))}
          <button className="haupt" onClick={() => ueben(ergebnis)}>
            Mit diesen Aufgaben üben
          </button>
        </section>
      )}

      {verworfen.length > 0 && (
        <section className="karte">
          <div className="prKopf">
            <span className="prTitel">Nicht übernommen</span>
            <span className="prGewicht">{verworfen.length}</span>
          </div>
          <p className="klein">
            Diese Vorschläge haben die Prüfung nicht bestanden und wurden deshalb nicht
            gestellt.
          </p>
          {verworfen.map((v, i) => (
            <div key={i} className="zeile">
              <span className="klein lueckText">{v.grund}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
