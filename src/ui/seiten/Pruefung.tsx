import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { PRUEFUNGEN, wertePruefung, type PruefungDefinition } from '../../domain/exam/simulation.ts';
import { PRUEFUNGSBEREICHE, noteZuUrteil } from '../../content/syllabus/exam.ts';
import { statischeGrundaufgaben } from '../../tasks/generator.ts';
import { startSitzung, beendeSitzung } from '../../tasks/session.ts';
import type { Antwort } from '../../domain/interaktiv.ts';
import { bilanzieren, leseAntwort, schreibeAntwort, verteileAufgaben } from '../../domain/exam/simulation.ts';
import type { Task } from '../../domain/types.ts';
import type { Store } from '../store.ts';
import type { SeitenName } from '../router.ts';
import { useGespeichert } from '../persistenz.ts';
import { InhaltsverzeichnisBlatt } from '../InhaltsverzeichnisBlatt.tsx';
import { InteraktiveAntwort } from '../InteraktiveAntwort.tsx';
import { TabellenBlatt } from '../TabellenBlatt.tsx';

/** Schlüssel des laufenden Durchgangs im dauerhaften Speicher. */
const LAUF_SCHLUESSEL = 'pruefung-lauf';

/**
 * Verbleibende Sekunden.
 *
 * Aus dem gespeicherten Startzeitpunkt gerechnet, nicht heruntergezählt.
 * Dadurch stimmt die Restzeit auch nach einem Neuladen, und ein Neuladen
 * schenkt keine Prüfungszeit.
 */
function restsekunden(pruefung: PruefungDefinition, beginn: number): number {
  const vergangen = Math.round((Date.now() - beginn) / 1000);
  return Math.max(0, pruefung.minuten * 60 - vergangen);
}

/**
 * Prüfungstrainer.
 *
 * Aufbau nach dem Prüfungsaufbau, nicht nach dem Zufall:
 *
 *   Schriftlich  – Systementwurf (§ 12), Funktions- und Systemanalyse (§ 13),
 *                  Wirtschafts- und Sozialkunde (§ 14). Am Bildschirm
 *                  simulierbar, weil die echte Prüfung schriftlich ist.
 *   Praktisch    – Kundenauftrag (§ 11), 16 Stunden mit situativem
 *                  Fachgespräch. Das ist eine Werkstattaufgabe; sie wird im
 *                  geführten Kundenauftrag geübt (Planung, Ausführung nach
 *                  den Sicherheitsregeln, Fachgespräch) und hier nicht als
 *                  Multiple Choice verkleidet.
 *
 * Zwei Regeln gelten in jeder Simulation:
 *  1. Keine Hinweise und keine Lösungshilfen während des Durchgangs.
 *  2. Vor dem Abgeben gibt es keine Rückmeldung, sonst misst man Lernhilfe
 *     statt Prüfungsfähigkeit.
 */
/** Der laufende Prüfungsdurchgang – als Ganzes gespeichert. */
export interface PruefungsLauf {
  pruefungId: string;
  index: number;
  /** Startzeitpunkt in Millisekunden – daraus wird die Restzeit gerechnet. */
  beginn: number;
  abgegeben: boolean;
  /**
   * Die Antwort je Aufgabe.
   *
   * Nicht mehr nur die gewählte Optionskennung: Die interaktiven Formate
   * antworten als Zuordnung, Reihenfolge oder Lückentext. Der Wert ist eine
   * Zeichenkette, damit der gespeicherte Durchgang ein Neuladen übersteht –
   * die Antwort selbst liegt als JSON darin.
   */
  antworten: Record<string, string>;
}

export function Pruefung(props: { store: Store; wechsle: (s: SeitenName) => void }) {
  const { store } = props;

  // Der Durchgang liegt im dauerhaften Speicher, nicht im Bauteilzustand.
  // Vorher bedeutete jedes Neuladen: Prüfung weg. Auf dem Telefon passiert das
  // ständig, wenn der Browser den Tab aus dem Speicher wirft.
  const [lauf, setLauf] = useGespeichert<PruefungsLauf | null>(LAUF_SCHLUESSEL, null);

  const verfuegbare = useMemo(() => statischeGrundaufgaben(), []);

  const auswahl = useMemo(() => {
    if (!lauf) return null;
    return PRUEFUNGEN.find((p) => p.id === lauf.pruefungId) ?? null;
  }, [lauf]);

  const starten = useCallback(
    (pruefung: PruefungDefinition) => {
      const aufgaben = verteileAufgaben(pruefung.bereich, verfuegbare, pruefung.aufgabenAnzahl);
      if (aufgaben.length === 0) return;
      // Originalzeit, nicht ein Pausenbudget: 120 Minuten sind 120 Minuten.
      startSitzung(aufgaben, { minuten: pruefung.minuten, label: pruefung.titel }, 'pruefung');
      setLauf({
        pruefungId: pruefung.id,
        index: 0,
        beginn: Date.now(),
        abgegeben: false,
        antworten: {},
      });
      scrollTo({ top: 0 });
    },
    [verfuegbare, setLauf],
  );

  const beenden = useCallback(() => {
    setLauf(null);
    scrollTo({ top: 0 });
  }, [setLauf]);

  if (auswahl && lauf) {
    return (
      <PruefungLaufend
        pruefung={auswahl}
        lauf={lauf}
        setLauf={setLauf}
        store={store}
        wechsle={props.wechsle}
        onZurueck={beenden}
      />
    );
  }

  const kundenauftrag = PRUEFUNGSBEREICHE.kundenauftrag;
  const teil2Summe = PRUEFUNGEN.reduce(
    (summe, p) => summe + PRUEFUNGSBEREICHE[p.bereich].weightPercent,
    0,
  );

  return (
    <div>
      <h2>Prüfung</h2>
      <p className="klein">Originalzeit, keine Hilfen, Bewertung erst nach dem Abgeben.</p>

      <h3>Schriftlich · {teil2Summe} % von Teil 2</h3>
      {/* Auf Tablet und PC liegen die Bereiche nebeneinander. Die Klasse
          entscheidet nur das Raster; auf dem Telefon bleibt es eine Spalte. */}
      <div className="kartenraster">
        {PRUEFUNGEN.map((p) => {
        const bereich = PRUEFUNGSBEREICHE[p.bereich];
        const bisher = store.ergebnisse.filter((e) => e.pruefungId === p.id);
        const beste = bisher.length > 0 ? Math.min(...bisher.map((e) => e.note)) : null;
        const vorrat = verteileAufgaben(p.bereich, verfuegbare, p.aufgabenAnzahl).length;
        const knapp = vorrat < p.aufgabenAnzahl;

        return (
          <section key={p.id} className="karte prCard">
            <div className="prKopf">
              <span className="prTitel">{p.titel}</span>
              <span className="prGewicht">{bereich.weightPercent} %</span>
            </div>
            <div className="prMeta">
              {p.minuten} min · {bereich.paragraph}
              {beste !== null && (
                <>
                  {' · '}
                  <span className={beste <= 4 ? 'gruen' : 'rot'}>
                    Beste {beste.toFixed(1)}
                  </span>
                </>
              )}
            </div>
            <div className="prZeile">
              <span className={`prVorrat ${knapp ? 'warnText' : ''}`}>
                {vorrat} / {p.aufgabenAnzahl} Aufgaben
              </span>
              <button className="prStart" disabled={vorrat === 0} onClick={() => starten(p)}>
                Starten
              </button>
            </div>
            {vorrat === 0 && (
              <p className="klein">Noch kein geprüfter Vorrat – übe zuerst im Lernpfad.</p>
            )}
          </section>
        );
        })}
      </div>

      <h3>Praktisch · {kundenauftrag.weightPercent} % von Teil 2</h3>
      <section className="karte prCard">
        <div className="prKopf">
          <span className="prTitel">Kundenauftrag</span>
          <span className="prGewicht">{kundenauftrag.weightPercent} %</span>
        </div>
        <div className="prMeta">
          16 h + Fachgespräch · {kundenauftrag.paragraph} · zwingend ausreichend
        </div>
        <p className="klein">
          Planung, Ausführung nach den fünf Sicherheitsregeln, Fachgespräch. Wird
          im geführten Kundenauftrag geübt – eine Werkstattaufgabe lässt sich
          nicht als Multiple Choice abfragen.
        </p>
        <button onClick={() => props.wechsle('kundenauftrag')}>Zum Kundenauftrag</button>
      </section>

      <h3>Bestehensregel § 15</h3>
      <section className="karte">
        <ul className="pruefliste">
          {store.prognose.urteil.pruefpunkte.map((punkt) => (
            <li key={punkt.label}>
              <span className={punkt.erfuellt ? 'marke gruen' : 'marke rot'}>
                {punkt.erfuellt ? '✓' : '✗'}
              </span>
              <span className="prText">{punkt.label}</span>
              <span className="prWert">{punkt.hinweis}</span>
            </li>
          ))}
        </ul>
        <p className="klein">Bezogen auf deinen aktuellen Lernstand.</p>
      </section>
    </div>
  );
}

function PruefungLaufend(props: {
  pruefung: PruefungDefinition;
  lauf: PruefungsLauf;
  setLauf: Dispatch<SetStateAction<PruefungsLauf | null>>;
  store: Store;
  wechsle: (s: SeitenName) => void;
  onZurueck: () => void;
}) {
  const { pruefung, lauf, setLauf, store } = props;
  const aufgaben = useMemo<Task[]>(() => {
    const verfuegbar = statischeGrundaufgaben();
    return verteileAufgaben(pruefung.bereich, verfuegbar, pruefung.aufgabenAnzahl);
  }, [pruefung]);

  const { index, antworten, abgegeben } = lauf;
  const aktuelle = aufgaben[index] ?? null;
  const beantwortet = Object.keys(antworten).length;

  /**
   * Restzeit aus dem gespeicherten Startzeitpunkt – nicht aus einem Zähler.
   *
   * Vorher begann der Countdown bei jedem Rendern neu. Damit war er nach einem
   * Neuladen wieder bei der vollen Prüfungszeit, und die Simulation sagte
   * nichts mehr über das echte Zeitverhalten aus.
   */
  const [restzeit, setRestzeit] = useState(() => restsekunden(pruefung, lauf.beginn));
  const [zeigeVerzeichnis, setZeigeVerzeichnis] = useState(false);
  const [zeigeTabellen, setZeigeTabellen] = useState(false);

  // Funktionale Aktualisierung, nicht `{...lauf, ...}`.
  //
  // Mit dem Spread aus der aktuellen Kopie gehen Aktualisierungen verloren,
  // wenn zwei in derselben Runde passieren – etwa „Antwort wählen" und sofort
  // „Weiter". Dann überschreibt der zweite Aufruf den ersten, und die Antwort
  // ist weg.
  const setIndex = useCallback(
    (f: (i: number) => number) =>
      setLauf((alt) => (alt ? { ...alt, index: f(alt.index) } : alt)),
    [setLauf],
  );
  const setAntwort = useCallback(
    (taskId: string, a: Antwort | null) =>
      setLauf((alt) => {
        if (!alt) return alt;
        const neu = { ...alt.antworten };
        if (a) neu[taskId] = schreibeAntwort(a);
        else delete neu[taskId];
        return { ...alt, antworten: neu };
      }),
    [setLauf],
  );
  const abgeben = useCallback(
    () => setLauf((alt) => (alt ? { ...alt, abgegeben: true } : alt)),
    [setLauf],
  );

  useEffect(() => {
    if (abgegeben) return;
    const tick = (): void => {
      const rest = restsekunden(pruefung, lauf.beginn);
      setRestzeit(rest);
      // Die Zeit ist um: die Prüfung wird abgegeben, ob man will oder nicht.
      // Genau das passiert in der echten Prüfung auch.
      if (rest <= 0) abgeben();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pruefung, lauf.beginn, abgegeben]);

  if (aufgaben.length === 0) {
    return (
      <div>
        <h2>Noch nicht verfügbar</h2>
        <p className="klein">Für diesen Bereich liegen keine geprüften Aufgaben vor.</p>
        <button className="haupt" onClick={() => props.wechsle('heute')}>
          Zur Startseite
        </button>
      </div>
    );
  }

  if (abgegeben) {
    // Richtig ist eine Aufgabe nur, wenn `bewerte` sie vollständig so sieht.
    // Interaktive Formate liefern Teilpunkte – für die Note zählt wie in der
    // echten Prüfung allein die volle Antwort.
    const bilanz = bilanzieren(aufgaben, antworten);
    const { richtig, falsch: falschBeantwortet, offen, schwacheThemenIds: falscheThemen } = bilanz;
    // Die tatsächlich verbrauchte Prüfungszeit – nie mehr als das Zeitbudget,
    // sonst würde eine liegen gelassene Seite die Zeitbilanz verfälschen.
    const dauer = Math.min(
      pruefung.minuten * 60,
      Math.round((Date.now() - lauf.beginn) / 1000),
    );
    const ergebnis = wertePruefung({
      pruefung,
      richtig,
      gesamt: aufgaben.length,
      dauerSekunden: dauer,
      themenIds: aufgaben.flatMap((t) => t.proposal.topicIds),
      falscheThemenIds: falscheThemen,
    });

    return (
      <div>
        <h2>{pruefung.titel}</h2>

        <section className="karte">
          <div className="kennzahlen">
            <div>
              <div className="zahl">{ergebnis.quote.toFixed(0)} %</div>
              <div className="klein">
                {ergebnis.richtig} / {ergebnis.gesamt} richtig
              </div>
            </div>
            <div>
              <div className={`zahl ${ergebnis.note <= 4 ? 'gruen' : 'rot'}`}>
                {ergebnis.note.toFixed(1)}
              </div>
              <div className="klein">{noteZuUrteil(ergebnis.note)}</div>
            </div>
            <div>
              <div className={`zahl ${ergebnis.imZeitbudget ? '' : 'rot'}`}>
                {Math.round(ergebnis.dauerSekunden / 60)} min
              </div>
              <div className="klein">von {pruefung.minuten} min</div>
            </div>
          </div>
        </section>

        {ergebnis.schwacheThemenIds.length > 0 ? (
          <section className="karte">
            <div className="prKopf">
              <span className="prTitel">Danach wiederholen</span>
              <span className="prGewicht">{ergebnis.schwacheThemenIds.length} Themen</span>
            </div>
            <p className="klein">
              {falschBeantwortet.length} falsch · {offen.length} offen gelassen
            </p>
          </section>
        ) : (
          <section className="karte">
            <p className="klein">Alle Fragen richtig beantwortet.</p>
          </section>
        )}

        <button
          className="haupt"
          onClick={() => {
            void store.ergebnisHinzufuegen(ergebnis).then(() => props.onZurueck());
          }}
        >
          Speichern und zurück
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="prLaufend">
        <span className="klein">
          {index + 1} / {aufgaben.length}
        </span>
        {/* Tabellenbuch und Formelsammlung sind in der Prüfung zugelassen –
            die Übersicht gehört deshalb auch hierher, nicht nur ins Üben. */}
        <button className="still" onClick={() => setZeigeVerzeichnis(true)} type="button">
          Formeln
        </button>
        <button className="still" onClick={() => setZeigeTabellen(true)} type="button">
          Tabellen
        </button>
        <span className={`zahlKlein ${restzeit < 300 ? 'rot' : ''}`}>
          {Math.floor(restzeit / 60)}:{String(restzeit % 60).padStart(2, '0')}
        </span>
      </div>

      <InhaltsverzeichnisBlatt
        offen={zeigeVerzeichnis}
        onSchliessen={() => setZeigeVerzeichnis(false)}
      />
      <TabellenBlatt offen={zeigeTabellen} onSchliessen={() => setZeigeTabellen(false)} />

      <div className="balken fortschrittsbalken">
        <div
          className="balkenFuell"
          style={{ width: `${Math.round(((index + 1) / aufgaben.length) * 100)}%` }}
        />
      </div>

      {aktuelle && (
        <>
          <p className="frage">{aktuelle.proposal.prompt}</p>
          {aktuelle.interaktiv ? (
            <InteraktiveAntwort
              key={aktuelle.taskId}
              task={aktuelle}
              gesperrt={false}
              initial={leseAntwort(antworten[aktuelle.taskId])}
              onVerlauf={(a) => setAntwort(aktuelle.taskId, a)}
            />
          ) : (
            <div>
              {(aktuelle.proposal.options ?? []).map((o) => {
                const gewaehlt = leseAntwort(antworten[aktuelle.taskId]);
                const istGewaehlt = gewaehlt?.art === 'mc' && gewaehlt.optionId === o.id;
                return (
                  <button
                    key={o.id}
                    className={`option ${istGewaehlt ? 'gewaehlt' : ''}`}
                    disabled={antworten[aktuelle.taskId] !== undefined}
                    onClick={() => setAntwort(aktuelle.taskId, { art: 'mc', optionId: o.id })}
                  >
                    {o.text}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="raster raster2">
        <button disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          Zurück
        </button>
        <button
          disabled={index + 1 >= aufgaben.length}
          onClick={() => setIndex((i) => Math.min(aufgaben.length - 1, i + 1))}
        >
          Weiter
        </button>
      </div>

      <button className="haupt" onClick={abgeben}>
        Abgeben · {beantwortet} / {aufgaben.length}
      </button>
      <button
        className="still"
        onClick={() => {
          beendeSitzung();
          // Auch den gespeicherten Durchgang löschen, sonst führt ein
          // Neuladen zurück in eine Prüfung, die abgebrochen wurde.
          props.onZurueck();
        }}
      >
        Abbrechen – zählt nicht als Versuch
      </button>
    </div>
  );
}
