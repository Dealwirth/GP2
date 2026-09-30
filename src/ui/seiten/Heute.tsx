import { useCallback, useState } from 'react';
import type { Store } from '../store.ts';
import type { SeitenName } from '../router.ts';
import { BUDGETS, type Zeitbudget } from '../../tasks/session.ts';
import { baueSession, startSitzung } from '../../tasks/session.ts';
import { erzeugeAufgaben } from '../../ai/generator.ts';
import { aiEinstellungenAus } from '../einstellungen.ts';
import { merkeAufgaben } from '../../tasks/ablage.ts';
import { fuelleVorratAuf } from '../../tasks/vorrat.ts';
import { deuteFehler } from '../KiStatus.tsx';
import type { Task } from '../../domain/types.ts';
import { PRUEFUNGSBEREICHE, TEIL2_BEREICHE } from '../../content/syllabus/exam.ts';
import {
  tageBis,
  naechsterTermin,
  dringlichkeit,
  DRINGLICHKEIT_TEXT,
  sortiereTermine,
  termineMitVorgaben,
  SICHERHEIT_TEXT,
  ZUSTAENDIGE_STELLE,
} from '../../domain/termine.ts';
import { reifegrad } from '../../domain/stateMachine.ts';
import { reife, holeAtom } from '../../content/curriculum/index.ts';

/**
 * Startseite.
 *
 * Der ganze Bildschirm ist auf eine Entscheidung ausgerichtet: Wie viel Zeit
 * hast du? Alles Weitere – Themen, Wiederholung, Rechenaufgaben – ergibt sich
 * daraus. Es gibt bewusst keinen Themenfilter auf dieser Seite.
 */
export function Heute(props: { store: Store; wechsle: (s: SeitenName) => void }) {
  const { store } = props;
  const [wirdGebaut, setWirdGebaut] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const starten = useCallback(
    async (budget: Zeitbudget) => {
      setWirdGebaut(true);
      setHinweis(null);
      try {
        const ai = aiEinstellungenAus(store.einstellungen);
        const tasks = await baueSession(budget, (topicId, anzahl) => {
          const atom = holeAtom(topicId);
          if (!atom) return Promise.resolve([]);
          return erzeugeAufgaben(ai, atom, anzahl).then((ergebnis) => {
            merkeAufgaben(ergebnis.aufgaben);
            return ergebnis.aufgaben;
          });
        });
        if (tasks.length === 0) {
          setHinweis(
            'Die KI konnte keine prüfbare Aufgabe liefern. Einen Moment warten und erneut versuchen – oder die Verbindung über den KI-Knopf oben prüfen.',
          );
          return;
        }
        startSitzung(tasks, budget, 'pause');
        // Im Hintergrund sofort wieder auffüllen, damit die nächste Runde
        // ohne Wartezeit startet.
        void fuelleVorratAuf(ai);
        location.hash = '#/ueben';
      } catch (fehler) {
        const { grund } = deuteFehler(fehler);
        setHinweis(grund);
      } finally {
        setWirdGebaut(false);
      }
    },
    [store],
  );

  // Der Einladungsbrief schlägt den Orientierungswert: Sobald in den
  // Einstellungen ein eigenes Datum steht, rechnen alle Anzeigen damit.
  const termine = termineMitVorgaben({
    schriftlich: store.einstellungen.pruefungsdatumSchriftlich,
    praktisch: store.einstellungen.pruefungsdatumPraktisch,
  });
  const naechstes = naechsterTermin(new Date(), termine);
  const faellig = sortiereTermine(termine).filter(
    (t) => tageBis(t.datum) >= 0 && tageBis(t.datum) <= 60,
  );

  return (
    <div>
      <section className="start">
        <p className="klein">Wie viel Zeit hast du?</p>
        <button
          className="haupt budgetHaupt"
          onClick={() => void starten(BUDGETS[0]!)}
          disabled={wirdGebaut}
        >
          <span className="budgetZahl">{BUDGETS[0]!.minuten}</span>
          <span className="klein">{wirdGebaut ? 'Minuten – Aufgaben werden gestellt …' : 'Minuten – der Normalfall'}</span>
        </button>
        <div className="budget raster raster2">
          {BUDGETS.slice(1).map((b) => (
            <button key={b.minuten} className="budgetKnopf" onClick={() => void starten(b)} disabled={wirdGebaut}>
              <span className="budgetZahl">{b.minuten}</span>
              <span className="klein">Minuten</span>
            </button>
          ))}
        </div>
        {hinweis && <p className="klein frist dringend">{hinweis}</p>}
        <p className="klein">
          Jede Aufgabe stellt die KI frisch – gemischt über alle
          Prüfungsbereiche, ohne Wiederholungen. Die Rechnung dahinter läuft
          auf deinem Gerät.
        </p>
      </section>

      {store.notizen.length > 0 && (
        <section className="coach">
          <h3>Dein Coach</h3>
          <ul className="coachListe">
            {store.notizen.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="karte">
        <div className="zusammenfassung">
          <div>
            <div className="zahl">{store.digest.themenBegonnen}</div>
            <div className="klein">Themen begonnen</div>
          </div>
          <div>
            <div className="zahl">{store.digest.themenGefestigt}</div>
            <div className="klein">gefestigt</div>
          </div>
          <div>
            <div className="zahl">{store.digest.themenVerfallen}</div>
            <div className="klein">verfallen</div>
          </div>
          <div>
            <div className="zahl">{Math.round(store.digest.abdeckungQuote * 100)} %</div>
            <div className="klein">Abdeckung</div>
          </div>
        </div>
        {store.digest.beantwortetGesamt === 0 && (
          <p className="klein">
            Noch nichts beantwortet. Der erste Durchgang dauert am längsten,
            danach wird es Wiederholung.
          </p>
        )}
      </section>

      <section>
        <h3>Reife je Prüfungsbereich</h3>
        <div className="reifeListe">
          {TEIL2_BEREICHE.map((bereich) => {
            const wert = reife(store.zustaende, bereich);
            return (
              <div key={bereich} className="reifeZeile">
                <span className="reifeName">{PRUEFUNGSBEREICHE[bereich].label}</span>
                <span className="klein zahlKlein">{Math.round(wert * 100)} %</span>
                <div className="balken">
                  <div className="balkenFuell" style={{ width: `${Math.round(wert * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="klein">
          Reife heißt: richtig beantwortet <em>und</em> als sicher eingeschätzt.
          Geratene Antworten zählen nur halb.
        </p>
      </section>

      {naechstes && (
        <section className="karte">
          <div className="klein">Nächster Termin</div>
          <div className="titel">{naechstes.titel}</div>
          <div className={`frist ${dringlichkeit(naechstes.datum)}`}>
            {tageBis(naechstes.datum) === 0
              ? 'heute'
              : `in ${tageBis(naechstes.datum)} Tagen`}{' '}
            · {new Date(`${naechstes.datum}T00:00:00`).toLocaleDateString('de-DE')}
          </div>
          <p className="klein">{naechstes.beschreibung}</p>
          <p className="klein">
            <span className="marke">{SICHERHEIT_TEXT[naechstes.sicherheit]}</span>{' '}
            {naechstes.sicherheit === 'orientierung'
              ? 'Dieses Datum stammt nicht von deiner prüfenden Stelle.'
              : naechstes.sicherheit === 'annahme'
                ? 'Arbeitsannahme – steht so nicht in einem amtlichen Plan.'
                : 'Aus deinem Einladungsschreiben.'}
          </p>
          <p className="klein">{ZUSTAENDIGE_STELLE.hinweis}</p>
        </section>
      )}

      {faellig.length > 0 && (
        <section>
          <h3>Fristen</h3>
          {faellig.map((t) => (
            <div key={t.id} className="karte schmal">
              <div className="titel">{t.titel}</div>
              <div className={`frist ${dringlichkeit(t.datum)}`}>
                {tageBis(t.datum)} Tage · {DRINGLICHKEIT_TEXT[dringlichkeit(t.datum)]}
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h3>Weiter</h3>
        <div className="raster raster2">
          <button onClick={() => props.wechsle('lernen')}>Lernpfad</button>
          <button onClick={() => props.wechsle('labor')}>Labor</button>
          <button onClick={() => props.wechsle('pruefung')}>Prüfungssimulation</button>
          <button onClick={() => props.wechsle('fortschritt')}>Fortschritt</button>
        </div>
      </section>
    </div>
  );
}

/** Balkenanzeige der Reifegrade – auch in anderen Seiten verwendet. */
/**
 * Reifebalken für eine Zeile.
 *
 * Zwei Zeilen statt drei Spalten: erst Bezeichnung und Prozentwert, darunter
 * der Balken. Nebeneinander wurde der Name auf dem Telefon abgeschnitten, und
 * bei langen Bezeichnungen schoben sich die Spalten ineinander.
 */
export function ReifeBalken(props: { wert: number; label?: string }) {
  const prozent = Math.round(props.wert * 100);
  return (
    <div className="reifeZeile">
      {props.label && <span className="reifeName">{props.label}</span>}
      <span className="klein zahlKlein">{prozent} %</span>
      <div className="balken">
        <div className="balkenFuell" style={{ width: `${prozent}%` }} />
      </div>
    </div>
  );
}

/** Listet die Themen mit dem geringsten Reifegrad auf. */
export function SchwachsteThemen(props: { store: Store; anzahl?: number }) {
  const eintraege = [...props.store.zustaende.values()]
    .filter((z) => z.answered > 0)
    .map((z) => ({ z, reife: reifegrad(z) }))
    .sort((a, b) => a.reife - b.reife)
    .slice(0, props.anzahl ?? 5);

  if (eintraege.length === 0) {
    return <p className="klein">Noch keine auswertbaren Versuche.</p>;
  }

  return (
    <ul className="schwacheListe">
      {eintraege.map(({ z, reife: r }) => (
        <li key={z.topicId}>
          <span>{z.topicId}</span>
          <span className="klein">
            {Math.round(r * 100)} % · {z.answered} Versuche · {z.state}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type { Task };
