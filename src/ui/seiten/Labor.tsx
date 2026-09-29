import { useCallback, useMemo, useState } from 'react';
import { useGespeichert } from '../persistenz.ts';
import { MessgeraetSeite } from './Messgeraet.tsx';
import {
  wendeAn,
  wendeFiAn,
  wendeTrafoAn,
  starteStation,
  stationFakten,
  type Aktion,
  type StationsEreignis,
  type StationsZustand,
  type StationsId,
} from '../../labor/stationen.ts';
import {
  musterAnlage,
  pruefeAnlage,
  anlageKennzahlen,
  leereAnlage,
  anlageFakten,
  type Anlage,
} from '../../labor/stromlaufplan.ts';
import {
  PRUEFSCHRITTE,
  leeresProtokoll,
  bewerteProtokoll,
  formatiereZahl,
  type ProtokollEintrag,
} from '../../labor/pruefprotokoll.ts';
import { PHASEN, minuteAlsUhrzeit, tagesUebersicht, PHASEN_PUNKTE_GESAMT } from '../../labor/ablauf.ts';
import type { Store } from '../store.ts';

type LaborTeil = 'stationen' | 'messgeraet' | 'plan' | 'protokoll' | 'ablauf';

/**
 * Labor.
 *
 * Hier wird geübt, was sich in Multiple Choice nicht üben lässt: Verläufe,
 * Fehler, Protokolle, Zeitdruck. Die Stationen sind animiert, aber nicht
 * dekorativ – jede Bewegung zeigt einen elektrischen Zusammenhang.
 */
export function Labor(props: { store: Store }) {
  // Auch der gewählte Laborbereich bleibt stehen. Wer die Anlage halb geprüft
  // hat und den Tab neu lädt, landet nicht wieder am Anfang.
  const [teil, setTeil] = useGespeichert<LaborTeil>('labor-teil', 'stationen');

  return (
    <div>
      <div className="reiterreihe">
        {(
          [
            ['stationen', 'Stationen'],
            ['messgeraet', 'Messgerät'],
            ['plan', 'Stromlaufplan'],
            ['protokoll', 'Messprotokoll'],
            ['ablauf', '16 Stunden'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`reiter ${teil === id ? 'aktiv' : ''}`} onClick={() => setTeil(id)}>
            {label}
          </button>
        ))}
      </div>

      {teil === 'stationen' && <Stationen store={props.store} />}
      {teil === 'messgeraet' && <MessgeraetSeite />}
      {teil === 'plan' && <PlanSeite store={props.store} />}
      {teil === 'protokoll' && <ProtokollSeite store={props.store} />}
      {teil === 'ablauf' && <AblaufSeite />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stationen
// ---------------------------------------------------------------------------

function Stationen(_props: { store: Store }) {
  // Die gewählte Station und ihr Verlauf bleiben stehen. Eine Messreihe, die
  // man mitten im Ablauf verliert, muss man sonst von vorn beginnen.
  const [id, setId] = useGespeichert<StationsId>('labor-station', 'fi');
  const station = useMemo(() => starteStation(id), [id]);
  const [zustand, setZustand] = useState<StationsZustand>(station.startZustand);
  const [ereignisse, setEreignisse] = useState<StationsEreignis[]>([]);

  const wechseln = (neuId: StationsId): void => {
    setId(neuId);
    setZustand(starteStation(neuId).startZustand);
    setEreignisse([]);
  };

  const ausfuehren = (aktion: Aktion): void => {
    const ergebnis =
      id === 'fi' ? wendeFiAn(zustand, aktion) : id === 'trafo' ? wendeTrafoAn(zustand, aktion) : wendeAn(zustand, aktion);
    setZustand(ergebnis.zustand);
    setEreignisse(ergebnis.ereignisse);
  };

  const laststromA = zustand.lastW / zustand.u0;

  return (
    <div>
      <div className="reiterreihe">
        {(
          [
            ['fi', 'Fehlerstromschutz'],
            ['ls', 'Überstromschutz'],
            ['trafo', 'Trenntransformator'],
            ['verlegeart', 'Verlegeart'],
          ] as const
        ).map(([wert, label]) => (
          <button key={wert} className={`reiter ${id === wert ? 'aktiv' : ''}`} onClick={() => wechseln(wert)}>
            {label}
          </button>
        ))}
      </div>

      <h2>{station.titel}</h2>
      <p className="klein">{station.lernziel}</p>
      <p className="klein">{station.pruefungsbezug}</p>

      {/* Animierte Darstellung: der Zustand wird sichtbar, nicht nur beschrieben. */}
      <div className={`schaltung ${zustand.fiAusgeloest ? 'ausgeloest' : ''} ${zustand.neutralGekappt ? 'peBelastet' : ''} ${zustand.sekundaerAus ? 'spannungslos' : ''}`}>
        <div className="schaltKreis">
          <div className="schaltPunkt leiter" aria-hidden="true" />
          <div className="schaltLeitung" aria-hidden="true" />
          <div className="schaltPunkt schalter" aria-hidden="true" />
          <div className="schaltLeitung" aria-hidden="true" />
          <div className="schaltPunkt last" aria-hidden="true" />
        </div>
        <div className="schaltWerte">
          <div>
            <span className="klein">Laststrom</span>
            <span className="wert">{laststromA.toFixed(1)} A</span>
          </div>
          <div>
            <span className="klein">Leitung</span>
            <span className="wert">{zustand.querschnittMm2} mm²</span>
          </div>
          <div>
            <span className="klein">Absicherung</span>
            <span className="wert">
              {zustand.absicherungA} A {zustand.kennlinie}
            </span>
          </div>
          {id === 'fi' && (
            <div>
              <span className="klein">Fehlerstrom</span>
              <span className="wert">{zustand.fehlerstromMa} mA</span>
            </div>
          )}
        </div>
        <div className="schaltZustand">
          {zustand.fiAusgeloest
            ? 'Schutz hat ausgelöst – Anlage spannungsfrei'
            : zustand.sekundaerAus
              ? 'Sekundärseite abgeschaltet'
              : zustand.neutralGekappt
                ? 'Achtung: Neutralleiter unterbrochen'
                : 'Anlage unter Spannung'}
        </div>
      </div>

      <div className="aktionen">
        {station.aktionen.map((aktion, i) => (
          <button
            key={`${aktion.art}-${i}`}
            onClick={() => ausfuehren(aktion)}
            disabled={
              (aktion.art === 'neutralleiterTrennen' || aktion.art === 'sekundaerAbschalten' || aktion.art === 'fiAusloesen') &&
              (zustand.fiAusgeloest || zustand.sekundaerAus || (aktion.art === 'fiAusloesen' && zustand.fiAusgeloest))
            }
          >
            {aktionText(aktion, zustand)}
          </button>
        ))}
      </div>

      {ereignisse.length > 0 && (
        <div className="ereignisse">
          {ereignisse.map((e, i) => (
            <p key={i} className={`ereignis ${e.art}`}>
              {e.text}
            </p>
          ))}
        </div>
      )}

      <section className="karte">
        <h3>Dahinter</h3>
        <ul className="faktListe">
          {stationFakten(id).map((f) => (
            <li key={f.bezeichnung}>
              <span>{f.bezeichnung}</span>
              <span className="klein">{f.wert}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function aktionText(aktion: Aktion, z: StationsZustand): string {
  switch (aktion.art) {
    case 'lastAendern':
      return `Last auf ${aktion.nach} W`;
    case 'querschnittAendern':
      return `${aktion.nach} mm²`;
    case 'kennlinieAendern':
      return `Kennlinie ${aktion.nach}`;
    case 'absicherungAendern':
      return `Absicherung ${aktion.nach} A`;
    case 'lastspannungAendern':
      return `Spannung ${aktion.nach} V`;
    case 'verlegeartAendern':
      return `Verlegeart ${aktion.nach}`;
    case 'waehlerWechseln':
      return `Betrachtung ${aktion.nach}`;
    case 'fehlerstromAendern':
      return `Fehlerstrom ${aktion.nachMa} mA`;
    case 'fiAusloesen':
      return 'FI auslösen';
    case 'neutralleiterTrennen':
      return z.neutralGekappt ? 'Neutralleiter verbinden' : 'Neutralleiter trennen';
    case 'sekundaerAbschalten':
      return z.sekundaerAus ? 'Sekundärseite zuschalten' : 'Sekundärseite abschalten';
  }
}

// ---------------------------------------------------------------------------
// Stromlaufplan
// ---------------------------------------------------------------------------

function PlanSeite(props: { store: Store }) {
  // Der bearbeitete Stromlaufplan bleibt erhalten.
  const [anlage, setAnlage] = useGespeichert<Anlage>('stromlaufplan', musterAnlage());
  const befunde = useMemo(() => pruefeAnlage(anlage), [anlage]);
  const kennzahlen = useMemo(() => anlageKennzahlen(anlage), [anlage]);

  const aendern = useCallback((fn: (a: Anlage) => Anlage): void => {
    setAnlage((alt) => fn(alt));
  }, []);

  return (
    <div>
      <p className="klein">
        Baue eine Anlage und lass sie prüfen. Die Prüfung arbeitet mit denselben
        Regeln wie die Rechen-Engine – sie findet keine Fehler, die es nicht gibt.
      </p>

      <div className="zusammenfassung">
        <div>
          <div className="zahl">{kennzahlen.knoten}</div>
          <div className="klein">Knoten</div>
        </div>
        <div>
          <div className="zahl">{kennzahlen.leitungen}</div>
          <div className="klein">Leitungen</div>
        </div>
        <div>
          <div className="zahl">{kennzahlen.mittel}</div>
          <div className="klein">Betriebsmittel</div>
        </div>
        <div>
          <div className={`zahl ${kennzahlen.fehler > 0 ? 'rot' : ''}`}>{kennzahlen.fehler}</div>
          <div className="klein">Fehler</div>
        </div>
      </div>

      <div className="reiterreihe">
        {(['referenz-iz', 'schultabelle'] as const).map((weg) => (
          <button
            key={weg}
            className={`reiter ${anlage.rechenweg === weg ? 'aktiv' : ''}`}
            onClick={() => aendern((a) => ({ ...a, rechenweg: weg }))}
          >
            {weg === 'referenz-iz' ? 'Referenz I_z' : 'Schultabelle'}
          </button>
        ))}
      </div>
      <p className="klein">
        {anlage.rechenweg === 'referenz-iz'
          ? 'Gerechnet wird mit der Referenztabelle I_z.'
          : 'Gerechnet wird mit den vereinfachten Absicherungswerten der Berufsschule.'}
      </p>

      <section className="karte">
        <h3>Verbraucher</h3>
        {anlage.knoten
          .filter((k) => k.typ === 'verbraucher')
          .map((knoten) => {
            const mittel = anlage.mittel.find((m) => m.knotenId === knoten.id);
            return (
              <div key={knoten.id} className="zeile">
                <span>{knoten.bezeichnung}</span>
                <span className="klein">
                  {mittel?.absicherungA ?? '—'} A {mittel?.kennlinie ?? ''}
                </span>
                <div className="knopfrei">
                  {[10, 16, 20, 25].map((a) => (
                    <button
                      key={a}
                      className={mittel?.absicherungA === a ? 'kleinKnopf aktiv' : 'kleinKnopf'}
                      onClick={() =>
                        aendern((alt) => ({
                          ...alt,
                          mittel: alt.mittel.map((m) =>
                            m.knotenId === knoten.id ? { ...m, absicherungA: a } : m,
                          ),
                        }))
                      }
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
      </section>

      <section className="karte">
        <h3>Leitungen</h3>
        {anlage.leitungen.map((leitung) => (
          <div key={leitung.id} className="zeile">
            <span className="klein">
              {leitung.von} → {leitung.nach}
            </span>
            <div className="knopffrei">
              {[1.5, 2.5, 4, 6, 10].map((q) => (
                <button
                  key={q}
                  className={leitung.querschnitt === q ? 'kleinKnopf aktiv' : 'kleinKnopf'}
                  onClick={() =>
                    aendern((alt) => ({
                      ...alt,
                      leitungen: alt.leitungen.map((l) =>
                        l.id === leitung.id ? { ...l, querschnitt: q } : l,
                      ),
                    }))
                  }
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h3>Befunde</h3>
        {befunde.length === 0 && <p className="klein okText">Keine Auffälligkeiten gefunden.</p>}
        {befunde.map((b, i) => (
          <div key={i} className={`karte schmal ${b.schwere}`}>
            <div className="titel">{b.text}</div>
            {b.beleg && <p className="klein">{b.beleg}</p>}
            {b.abhilfe && (
              <p className="klein">
                <strong>Abhilfe:</strong> {b.abhilfe}
              </p>
            )}
          </div>
        ))}
      </section>

      <div className="raster raster2">
        <button onClick={() => setAnlage(musterAnlage())}>Muster laden</button>
        <button onClick={() => setAnlage(leereAnlage())}>Leere Anlage</button>
      </div>

      <section className="karte">
        <h3>Bezug</h3>
        <ul className="faktListe">
          {anlageFakten().map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>
      <p className="klein">
        {props.store.zustaende.size} Themen mit Lernstand – die Laborübungen
        zählen genauso in die Reife wie die Aufgaben aus der Pause.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messprotokoll
// ---------------------------------------------------------------------------

function ProtokollSeite(props: { store: Store }) {
  // Ein begonnenes Prüfprotokoll ist wertvolle Arbeit – es darf nicht
  // verschwinden, nur weil die Seite neu geladen wurde.
  const [eintraege, setEintraege] = useGespeichert<ProtokollEintrag[]>(
    'messprotokoll',
    leeresProtokoll({ u0: 230, idnA: 0.03 }),
  );
  const auswertung = useMemo(() => bewerteProtokoll(eintraege), [eintraege]);

  const setzen = (schrittId: string, feld: 'messwert' | 'durchgefuehrt', wert: unknown): void => {
    setEintraege((alt) =>
      alt.map((e) => (e.schrittId === schrittId ? { ...e, [feld]: wert } : e)),
    );
  };

  return (
    <div>
      <p className="klein">
        Fülle das Protokoll wie in der Prüfung. Grenzwerte kommen aus der
        Faktenbasis; wo eine Formel nötig ist, steht das ausdrücklich dabei –
        statt einer geratenen Zahl.
      </p>

      <div className="zusammenfassung">
        <div>
          <div className="zahl">{auswertung.punkte}</div>
          <div className="klein">von {auswertung.maxPunkte} Punkten</div>
        </div>
        <div>
          <div className="zahl">{auswertung.fehlerhafte.length}</div>
          <div className="klein">überschritten</div>
        </div>
        <div>
          <div className="zahl">{auswertung.offene.length}</div>
          <div className="klein">offen</div>
        </div>
      </div>

      {PRUEFSCHRITTE.map((schritt) => {
        const eintrag = eintraege.find((e) => e.schrittId === schritt.id);
        const fehler = auswertung.fehlerhafte.some((s) => s.id === schritt.id);
        return (
          <section key={schritt.id} className={`karte ${fehler ? 'fehler' : ''}`}>
            <div className="titel">{schritt.titel}</div>
            <p className="klein">
              {schritt.messpunkt} · {schritt.geraet} · {schritt.punkte} Punkte
            </p>
            {schritt.grenze.art === 'formel' ? (
              <p className="klein">
                <strong>Grenze aus Formel:</strong> {schritt.grenze.hinweis}
              </p>
            ) : (
              <p className="klein">
                <strong>Grenze:</strong>{' '}
                {eintrag?.grenze === null || eintrag?.grenze === undefined
                  ? 'für diesen Stromkreis zu berechnen'
                  : `${formatiereZahl(eintrag.grenze)} ${schritt.einheit}`}
                {schritt.grenze.art === 'fakt' && (
                  <span className="klein"> (Faktenbasis, geprüft)</span>
                )}
              </p>
            )}
            <p className="klein">{schritt.bewertung}</p>
            <div className="zeile">
              <input
                className="zahlEingabe"
                type="number"
                step="0.01"
                value={eintrag?.messwert ?? ''}
                onChange={(e) =>
                  setzen(schritt.id, 'messwert', e.target.value === '' ? null : Number(e.target.value))
                }
              />
              <span className="klein">{schritt.einheit}</span>
              <label className="klein">
                <input
                  type="checkbox"
                  checked={eintrag?.durchgefuehrt ?? false}
                  onChange={(e) => setzen(schritt.id, 'durchgefuehrt', e.target.checked)}
                />{' '}
                gemessen
              </label>
            </div>
          </section>
        );
      })}

      {auswertung.bestanden ? (
        <p className="okText stark">Protokoll vollständig und ohne Grenzwertverletzung.</p>
      ) : (
        <p className="klein">
          {auswertung.fehlerhafte.length > 0
            ? `${auswertung.fehlerhafte.length} Messwert(e) außerhalb der Grenze. In der Prüfung bedeutet das: Fehlerursache suchen und dokumentieren.`
            : 'Das Protokoll ist noch unvollständig.'}
        </p>
      )}

      <p className="klein">
        {props.store.digest.beantwortetGesamt} Versuche insgesamt im Lernstand.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

function AblaufSeite() {
  const [tag, setTag] = useState<1 | 2>(1);
  const uebersicht = tagesUebersicht(tag);

  return (
    <div>
      <p className="klein">
        Der Kundenauftrag läuft über 16 Stunden an zwei Tagen. Das Fachgespräch
        von 20 Minuten findet während der Durchführung statt, nicht danach.
      </p>

      <div className="reiterreihe">
        {([1, 2] as const).map((t) => (
          <button key={t} className={`reiter ${tag === t ? 'aktiv' : ''}`} onClick={() => setTag(t)}>
            Tag {t}
          </button>
        ))}
      </div>

      <div className="zusammenfassung">
        <div>
          <div className="zahl">{Math.round(uebersicht.dauerMinuten / 60)} h</div>
          <div className="klein">inkl. Pause</div>
        </div>
        <div>
          <div className="zahl">{Math.round(uebersicht.arbeitsMinuten / 60)} h</div>
          <div className="klein">Arbeitszeit</div>
        </div>
        <div>
          <div className="zahl">{Math.round(uebersicht.gesprachsMinuten)} min</div>
          <div className="klein">Fachgespräch</div>
        </div>
        <div>
          <div className="zahl">{uebersicht.punkte}</div>
          <div className="klein">Punkte</div>
        </div>
      </div>

      {PHASEN.filter((p) => p.tag === tag).map((phase) => (
        <section key={phase.id} className={`karte ${phase.art}`}>
          <div className="klein">
            {minuteAlsUhrzeit(phase.vonMin)} – {minuteAlsUhrzeit(phase.bisMin)} · {phase.punkte} Punkte
          </div>
          <div className="titel">{phase.titel}</div>
          <p className="klein">{phase.inhalt}</p>
          <p className="klein">
            <strong>Achtung:</strong> {phase.hinweis}
          </p>
        </section>
      ))}

      <section className="karte">
        <h3>Insgesamt</h3>
        <p className="klein">
          {PHASEN.length} Phasen, {PHASEN_PUNKTE_GESAMT} Punkte. Die Zeitangaben
          sind Planungswerte der Prüfungsbehörde – die tatsächliche Aufteilung
          kann abweichen.
        </p>
      </section>
    </div>
  );
}
