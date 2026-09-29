import { useMemo, useState } from 'react';
import { useGespeichert } from '../persistenz.ts';
import {
  SZENARIEN,
  holeSzenario,
  bewertePlanung,
  bewerteReihenfolge,
  szenarioRechnung,
  quelleFuerSchritt,
  type AuftragsSzenario,
} from '../../labor/kundenauftrag.ts';
import { formatiereZahl } from '../../labor/pruefprotokoll.ts';
import type { Store } from '../store.ts';

/**
 * Der geführte Kundenauftrag – der Praxisteil der App.
 *
 * Ablauf wie in der Prüfung: Auftrag lesen → Planungsentscheidungen treffen
 * (jede wird gegen die Rechen-Engine geprüft) → Ausführungsreihenfolge
 * festlegen (Sicherheitsregeln zuerst) → Fachgespräch als Selbstprüfung.
 *
 * Bewusst ohne Punkte-Deko: Die Rückmeldung ist fachlich, nicht spielerisch.
 * Wer sich vertut, liest warum – und kann es in der nächsten Runde richtig.
 */

type Phase = 'wahl' | 'auftrag' | 'planung' | 'ausfuehrung' | 'gespraech';

/** Eine Fachgesprächs-Frage mit aufgedeckten Punkten. */
function GespraechsKarte(props: {
  index: number;
  gesamt: number;
  frage: string;
  punkte: string[];
}) {
  const [offen, setOffen] = useState(false);
  return (
    <section className="karte">
      <div className="prMeta">
        Frage {props.index + 1} von {props.gesamt}
      </div>
      <p className="frage">{props.frage}</p>
      {!offen ? (
        <button className="still" onClick={() => setOffen(true)}>
          Antwortpunkte aufdecken
        </button>
      ) : (
        <>
          <h3>Erwartete Punkte</h3>
          <ul className="pruefliste">
            {props.punkte.map((p) => (
              <li key={p}>
                <span>▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function Praxisteil(_props: { store: Store }) {
  const [phase, setPhase] = useGespeichert<Phase>('praxis-phase', 'wahl');
  const [szenarioId, setSzenarioId] = useGespeichert<string>('praxis-szenario', '');
  const [planung, setPlanung] = useGespeichert<Record<string, number>>('praxis-planung', {});
  const [reihenfolge, setReihenfolge] = useGespeichert<string[]>('praxis-reihenfolge', []);

  const szenario: AuftragsSzenario | null = szenarioId ? (holeSzenario(szenarioId) ?? null) : null;
  const rechnungen = useMemo(() => (szenarioId ? szenarioRechnung(szenarioId) : {}), [szenarioId]);

  const planungErgebnis = useMemo(
    () => (szenario ? bewertePlanung(szenario, planung) : null),
    [szenario, planung],
  );
  const reihenfolgeErgebnis = useMemo(
    () => (szenario ? bewerteReihenfolge(szenario, reihenfolge) : null),
    [szenario, reihenfolge],
  );

  const start = (id: string): void => {
    setSzenarioId(id);
    setPlanung({});
    setReihenfolge([]);
    setPhase('auftrag');
  };

  // ------------------------------------------------------------------ Wahl
  if (phase === 'wahl' || !szenario) {
    return (
      <div>
        <h2>Praxis: Kundenauftrag</h2>
        <p className="klein">
          So ist die praktische Prüfung aufgebaut: ein Auftrag, eine Planung,
          die stimmen muss, Arbeit nach den fünf Sicherheitsregeln, Messen mit
          Protokoll, zum Schluss das Fachgespräch. Hier durchläufst du denselben
          Weg an realistischen Anlagen – jede Planungsentscheidung wird gegen
          die Rechen-Engine geprüft.
        </p>
        <div className="raster">
          {SZENARIEN.map((s) => (
            <button key={s.id} className="karte schmal" onClick={() => start(s.id)}>
              <span className="titel">{s.titel}</span>
              <span className="klein">{s.planungsschritte.length} Planungsentscheidungen · {s.ausfuehrung.length} Ausführungsschritte · Fachgespräch</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- Auftrag
  if (phase === 'auftrag') {
    return (
      <div>
        <h2>{szenario.titel}</h2>
        <section className="karte">
          <h3>Auftrag</h3>
          <p>{szenario.auftrag}</p>
        </section>
        <section className="karte">
          <h3>Bestandsangaben</h3>
          <ul className="pruefliste">
            {szenario.bestand.map((b) => (
              <li key={b}>
                <span>▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="karte">
          <h3>Der Kunde ergänzt</h3>
          <ul className="pruefliste">
            {szenario.kundenAngaben.map((k) => (
              <li key={k}>
                <span>▸</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
          <p className="klein">
            Diese Angaben brauchst du für die Planung. In der Prüfung bekommst du
            sie nur, wenn du die richtigen Fragen stellst.
          </p>
        </section>
        <button className="haupt" onClick={() => setPhase('planung')}>
          Zur Planung
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- Planung
  if (phase === 'planung') {
    const alleBeantwortet =
      planungErgebnis !== null && planungErgebnis.quittung.length === planungErgebnis.gesamt;
    return (
      <div>
        <h2>Planung: {szenario.titel}</h2>
        <p className="klein">
          Entscheide Schritt für Schritt. Nach der Antwort siehst du die Begründung –
          und wo eine Zahl drinsteckt, die Rechnung der Engine.
        </p>

        {szenario.planungsschritte.map((schritt, i) => {
          const gewaehlt = planung[schritt.id];
          const quelle = quelleFuerSchritt(schritt.id);
          const rechnung = rechnungen[schritt.id];
          return (
            <section key={schritt.id} className="karte">
              <div className="prMeta">
                Planungsschritt {i + 1} von {szenario.planungsschritte.length}
                {quelle && <span className="klein"> · Quelle: {quelle}</span>}
              </div>
              <p className="frage">{schritt.frage}</p>
              <div className="raster">
                {schritt.optionen.map((o, oi) => {
                  const istGewaehlt = gewaehlt === oi;
                  let klasse = 'option';
                  if (gewaehlt !== undefined && istGewaehlt) {
                    klasse += o.korrekt ? ' richtig' : ' falsch';
                  } else if (gewaehlt !== undefined && o.korrekt) {
                    klasse += ' richtig';
                  }
                  return (
                    <button
                      key={oi}
                      className={klasse}
                      disabled={gewaehlt !== undefined}
                      onClick={() => setPlanung((alt) => ({ ...alt, [schritt.id]: oi }))}
                    >
                      {o.text}
                    </button>
                  );
                })}
              </div>
              {gewaehlt !== undefined && (
                <>
                  <p>
                    <strong>
                      {schritt.optionen[gewaehlt]?.korrekt ? 'Richtig.' : 'So würde es nicht durchgehen.'}
                    </strong>{' '}
                    {schritt.hintergrund}
                  </p>
                  {rechnung && (
                    <p className="klein versionszeile">
                      Engine: {formatiereZahl(rechnung.wert)} {rechnung.einheit} · Regel: {rechnung.regel}
                    </p>
                  )}
                </>
              )}
            </section>
          );
        })}

        {alleBeantwortet && planungErgebnis && (
          <section className="karte">
            <div className="zusammenfassung">
              <div>
                <div className="zahl">{planungErgebnis.richtig}/{planungErgebnis.gesamt}</div>
                <div className="klein">Planungsentscheidungen fachlich richtig</div>
              </div>
            </div>
            <p className="klein">
              In der Prüfung wird die Planung mit bewertet – wer hier vertut,
              verliert Punkte, die später nichts mehr retten.
            </p>
          </section>
        )}

        <button
          className="haupt"
          disabled={!alleBeantwortet}
          onClick={() => setPhase('ausfuehrung')}
        >
          {alleBeantwortet ? 'Zur Ausführung' : 'Erst alle Entscheidungen treffen'}
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------- Ausführung
  if (phase === 'ausfuehrung') {
    const fertig = reihenfolge.length === szenario.ausfuehrung.length;
    const restliche = szenario.ausfuehrung.filter((s) => !reihenfolge.includes(s.id));
    return (
      <div>
        <h2>Ausführungsreihenfolge</h2>
        <p className="klein">
          Wähle die Schritte in der Reihenfolge, in der du sie ausführen würdest.
          In der Prüfung beobachten die Prüfer genau diese Reihenfolge – und die
          Sicherheitsregeln kommen immer zuerst.
        </p>

        {reihenfolge.length > 0 && (
          <section className="karte">
            <h3>Deine Reihenfolge</h3>
            <ol className="schritte">
              {reihenfolge.map((id) => {
                const schritt = szenario.ausfuehrung.find((s) => s.id === id);
                return schritt ? <li key={id}>{schritt.titel}</li> : null;
              })}
            </ol>
          </section>
        )}

        {!fertig && (
          <section className="karte">
            <h3>Nächster Schritt wählen</h3>
            <div className="raster">
              {restliche.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setReihenfolge((alt) => [...alt, s.id])}
                >
                  {s.titel}
                </button>
              ))}
            </div>
          </section>
        )}

        {fertig && reihenfolgeErgebnis && (
          <section className="karte">
            <h3>{reihenfolgeErgebnis.korrekt ? 'Diese Reihenfolge geht durch.' : 'So nicht.'}</h3>
            <p>{reihenfolgeErgebnis.begruendung}</p>
            <h3>Die Schritte im Einzelnen</h3>
            <ol className="schritte">
              {szenario.ausfuehrung.map((s) => (
                <li key={s.id}>
                  <strong>{s.titel}</strong>
                  <div className="klein">{s.inhalt}</div>
                  {s.regel && <div className="klein versionszeile">Regel: {s.regel}</div>}
                  <div className="klein frist">Wenn übersprungen: {s.folgeBeiUeberspringen}</div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {fertig && (
          <button className="haupt" onClick={() => setPhase('gespraech')}>
            Zum Fachgespräch
          </button>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------- Fachgespräch
  return (
    <div>
      <h2>Fachgespräch (situativ, 20 Minuten)</h2>
      <p className="klein">
        Die Fragen beziehen sich auf deine eigene Arbeit an dieser Anlage. Decke
        die erwarteten Punkte erst auf, wenn du deine Antwort im Kopf hattest –
        sonst übst du das Nachplappern, nicht das Erklären.
      </p>

      {szenario.fachgespraech.map((f, i) => (
        <GespraechsKarte
          key={i}
          index={i}
          gesamt={szenario.fachgespraech.length}
          frage={f.frage}
          punkte={f.erwartetePunkte}
        />
      ))}

      <section className="karte">
        <div className="zusammenfassung">
          <div>
            <div className="zahl">
              {planungErgebnis?.richtig ?? 0}/{planungErgebnis?.gesamt ?? 0}
            </div>
            <div className="klein">Planung richtig</div>
          </div>
          <div>
            <div className="zahl">{reihenfolgeErgebnis?.korrekt ? 'ja' : 'nein'}</div>
            <div className="klein">Ausführung in Ordnung</div>
          </div>
        </div>
        <p className="klein">
          Wiederhole den Auftrag jederzeit – zwei bis drei Durchgänge je Anlage
          prägen den Ablauf so ein, dass er im Prüfungszimmer automatisch kommt.
        </p>
      </section>
      <div className="raster raster2">
        <button className="haupt" onClick={() => start(szenario.id)}>
          Diesen Auftrag wiederholen
        </button>
        <button onClick={() => setPhase('wahl')}>Anderen Auftrag wählen</button>
      </div>
    </div>
  );
}
