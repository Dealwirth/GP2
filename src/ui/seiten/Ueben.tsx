import { useCallback, useEffect, useState } from 'react';
import type { Task, TopicStateRecord } from '../../domain/types.ts';
import { PRUEFUNGSBEREICHE } from '../../content/syllabus/exam.ts';
import {
  holeSitzung,
  verbucheAntwort,
  beendeSitzung,
  stelleSitzungWieder,
} from '../../tasks/session.ts';
import { useGespeichert } from '../persistenz.ts';
import { KiWerkstatt } from './KiWerkstatt.tsx';
import { InhaltsverzeichnisBlatt } from '../InhaltsverzeichnisBlatt.tsx';
import { TabellenBlatt } from '../TabellenBlatt.tsx';
import { storage } from '../../storage/index.ts';
import { faktBericht } from '../../content/facts/index.ts';
import { reifegrad } from '../../domain/stateMachine.ts';
import { holeAtom } from '../../content/curriculum/index.ts';
import type { Store } from '../store.ts';
import type { SeitenName } from '../router.ts';

/**
 * Aufgabenablauf.
 *
 * Zwei Modi in derselben Ansicht:
 *  - Pause: sofortige Rückmeldung, ein Erklärungssatz, Lösungsweg
 *  - Prüfung: keine Rückmeldung während der Session, Auswertung am Ende
 *
 * Der Prüfungsmodus ist wichtig für eine ehrliche Selbsteinschätzung – wer
 * sofort sieht, ob er richtig lag, schätzt sich zu gut ein.
 */
/** Fortschritt innerhalb der laufenden Runde – überlebt ein Neuladen. */
interface Rundenstand {
  sessionId: string | null;
  index: number;
  antwort: string | null;
  sicherheit: 'sicher' | 'geraten' | 'unsicher' | null;
  antworten: { taskId: string; korrekt: boolean }[];
  beginn: number;
  ergebnis: { richtig: number; gesamt: number } | null;
}

const RUNDE_SCHLUESSEL = 'runde-stand';

function startRundenstand(sessionId: string | null = null): Rundenstand {
  return { sessionId, index: 0, antwort: null, sicherheit: null, antworten: [], beginn: Date.now(), ergebnis: null };
}

export function Ueben(props: { store: Store; wechsle: (s: SeitenName) => void; pruefung?: boolean }) {
  const { store } = props;
  // Die Sitzung stand vorher nur im Arbeitsspeicher. Nach einem Neuladen war
  // die halbe Runde weg, obwohl sie in der Datenbank lag. Sie wird jetzt
  // wiederhergestellt – und der Stand innerhalb der Runde dazu.
  const [laufend, setLaufend] = useState(() => holeSitzung());
  const [stand, setStand] = useGespeichert<Rundenstand>(RUNDE_SCHLUESSEL, startRundenstand());
  const [zeigeVerzeichnis, setZeigeVerzeichnis] = useState(false);
  const [zeigeTabellen, setZeigeTabellen] = useState(false);

  // Gehört der gemerkte Rundenspeicher noch zu dieser Sitzung? Nach dem
  // Beenden blieb früher das Ergebnis stehen – eine neu gestartete Sitzung
  // zeigte dann „Sitzung beendet", statt die neuen Aufgaben zu stellen.
  // Genau das war die Blockade nach der ersten Einheit.
  useEffect(() => {
    if (laufend && stand.sessionId !== laufend.sitzung.sessionId) {
      setStand(startRundenstand(laufend.sitzung.sessionId));
    }
  }, [laufend, stand.sessionId, setStand]);

  const { index, antwort, sicherheit, beginn, ergebnis } = stand;
  const setSicherheit = (s: 'sicher' | 'geraten' | 'unsicher' | null): void =>
    setStand((alt) => ({ ...alt, sicherheit: s }));
  const [restzeit, setRestzeit] = useState<number | null>(null);

  useEffect(() => {
    if (laufend) return;
    let aktiv = true;
    void stelleSitzungWieder().then((wieder) => {
      if (aktiv && wieder) setLaufend(wieder);
    });
    return () => {
      aktiv = false;
    };
  }, [laufend]);

  const aufgaben: Task[] = laufend?.aufgaben ?? [];
  const aktuelle = aufgaben[index] ?? null;
  const pruefung = props.pruefung ?? false;
  const richtig = antwort !== null && aktuelle ? antwort === aktuelle.correctOptionId : false;

  // Countdown: die Pause endet, auch wenn nicht weitergearbeitet wird.
  useEffect(() => {
    if (!laufend) return;
    const ende = new Date(laufend.sitzung.startedAt).getTime() + laufend.sitzung.budgetSeconds * 1000;
    const tick = (): void => {
      const rest = Math.max(0, Math.round((ende - Date.now()) / 1000));
      setRestzeit(rest);
      if (rest === 0) {
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [laufend]);

  const waehleAntwort = useCallback(
    async (optionId: string) => {
      if (!aktuelle || antwort !== null) return;
      const korrekt = optionId === aktuelle.correctOptionId;
      // Funktionale Aktualisierung: sonst gehen Antwort und Sicherheitsangabe
      // verloren, wenn beide in derselben Runde gesetzt werden.
      setStand((alt) => ({
        ...alt,
        antwort: optionId,
        antworten: [...alt.antworten, { taskId: aktuelle.taskId, korrekt }],
      }));
      await verbucheAntwort({
        task: aktuelle,
        korrekt,
        sicherheit,
        zeitMs: Date.now() - beginn,
        sessionId: laufend?.sitzung.sessionId ?? null,
      });
      await store.aktualisieren();
    },
    [aktuelle, antwort, sicherheit, beginn, laufend, store, setStand],
  );

  const weiter = useCallback(async () => {
    if (index + 1 < aufgaben.length) {
      setStand((alt) => ({
        ...alt,
        index: alt.index + 1,
        antwort: null,
        sicherheit: null,
        beginn: Date.now(),
      }));
      return;
    }
    setStand((alt) => ({
      ...alt,
      ergebnis: {
        richtig: alt.antworten.filter((a) => a.korrekt).length,
        gesamt: aufgaben.length,
      },
    }));
    await store.aktualisieren();
    if (laufend) {
      await storage.sitzungBeenden(laufend.sitzung.sessionId, new Date().toISOString());
      beendeSitzung();
    }
  }, [index, aufgaben, laufend, store, setStand]);

  // Eine laufende Prüfung gehört nicht in den Übungsablauf.
  //
  // Im Übungsmodus gibt es sofort Rückmeldung samt Lösungsweg. Würde die
  // Prüfungssitzung hier landen, könnte man sich mitten in der Prüfung die
  // Lösungen ansehen – und die Simulation wäre wertlos. Deshalb führt diese
  // Ansicht zurück in den Prüfungsdurchgang.
  if (laufend?.sitzung.mode === 'pruefung') {
    return (
      <div>
        <h2>Prüfung läuft</h2>
        <p className="klein">
          Deine Prüfungssitzung ist noch offen. Sie wird im Prüfungstrainer
          weitergeführt – dort gibt es keine Rückmeldung vor dem Abgeben.
        </p>
        <button className="haupt" onClick={() => props.wechsle('pruefung')}>
          Zur laufenden Prüfung
        </button>
      </div>
    );
  }

  if (!laufend || aufgaben.length === 0) {
    return (
      <div>
        <h2>Üben</h2>
        <p className="klein">
          Auf der Startseite wählst du ein Zeitbudget – die App stellt die Aufgaben
          zusammen. Oder du lässt dir hier gezielt Aufgaben zu einem Thema erzeugen.
        </p>
        <button className="haupt" onClick={() => props.wechsle('heute')}>
          Zeitbudget wählen
        </button>
        <KiWerkstatt store={props.store} wechsle={props.wechsle} />
      </div>
    );
  }

  if (ergebnis) {
    return (
      <div>
        <h2>Sitzung beendet</h2>
        <div className="karte">
          <div className="zusammenfassung">
            <div>
              <div className="zahl">{ergebnis.gesamt}</div>
              <div className="klein">Aufgaben</div>
            </div>
            <div>
              <div className="zahl">{ergebnis.richtig}</div>
              <div className="klein">richtig</div>
            </div>
            <div>
              <div className="zahl">{store.digest.themenBegonnen}</div>
              <div className="klein">Themen begonnen</div>
            </div>
          </div>
        </div>
        <p className="klein">
          Dein Lernstand wurde gespeichert. Was als „geraten" markiert wurde,
          kommt schneller wieder.
        </p>
        <button className="haupt" onClick={() => props.wechsle('heute')}>
          Zurück
        </button>
      </div>
    );
  }

  const bericht = faktBericht();

  return (
    <div>
      <div className="kopfleiste">
        <span className="klein">
          {index + 1} / {aufgaben.length}
        </span>
        {/* Nachschlagen mitten in der Aufgabe: Formeln und Verweisstellen,
            ohne die Aufgabe zu verlassen. */}
        <button className="still" onClick={() => setZeigeVerzeichnis(true)} type="button">
          Formeln
        </button>
        <button className="still" onClick={() => setZeigeTabellen(true)} type="button">
          Tabellen
        </button>
        {restzeit !== null && (
          <span className={`klein ${restzeit < 60 ? 'frist dringend' : ''}`}>
            {Math.floor(restzeit / 60)}:{String(restzeit % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <InhaltsverzeichnisBlatt
        offen={zeigeVerzeichnis}
        onSchliessen={() => setZeigeVerzeichnis(false)}
      />
      <TabellenBlatt offen={zeigeTabellen} onSchliessen={() => setZeigeTabellen(false)} />

      {aktuelle && (
        <>
          <div className="feld">{PRUEFUNGSBEREICHE[aktuelle.proposal.examArea].label}</div>
          <p className="frage">{aktuelle.proposal.prompt}</p>

          {aktuelle.proposal.format === 'simulation' ? (
            <div className="karte">
              <p className="klein">
                Diese Aufgabe gehört in den Kundenauftrag. Sie wird im geführten
                Kundenauftrag behandelt, nicht hier in der Pause.
              </p>
            </div>
          ) : (
            <div className="raster">
              {(aktuelle.proposal.options ?? []).map((o) => {
                const istAntwort = antwort === o.id;
                const istRichtig = o.id === aktuelle.correctOptionId;
                let klasse = 'option';
                if (!pruefung && antwort !== null && istRichtig) klasse += ' richtig';
                else if (!pruefung && istAntwort && !istRichtig) klasse += ' falsch';
                else if (pruefung && istAntwort) klasse += ' gewaehlt';
                return (
                  <button
                    key={o.id}
                    className={klasse}
                    onClick={() => {
                      void waehleAntwort(o.id);
                    }}
                    disabled={antwort !== null}
                  >
                    {o.text}
                  </button>
                );
              })}
            </div>
          )}

          {antwort === null && (
            <div className="sicherheit">
              <p className="klein">Wusstest du es?</p>
              {(['sicher', 'geraten', 'unsicher'] as const).map((s) => (
                <button
                  key={s}
                  className={sicherheit === s ? 'gewahlt' : ''}
                  onClick={() => setSicherheit(s)}
                >
                  {s === 'sicher' ? 'wusste ich' : s === 'geraten' ? 'geraten' : 'unsicher'}
                </button>
              ))}
            </div>
          )}

          {antwort !== null && !pruefung && (
            <>
              <hr />
              <p>
                <strong>{richtig ? 'Richtig.' : 'Nicht ganz.'}</strong>{' '}
                {aktuelle.explanation}
              </p>
              {aktuelle.solutionSteps.length > 0 && (
                <>
                  <h3>Lösungsweg</h3>
                  <ol className="schritte">
                    {aktuelle.solutionSteps.map((s, i) => (
                      <li key={i}>
                        {s.label}
                        {s.formula && <div className="formel">{s.formula}</div>}
                        {s.substitution && <div className="klein">{s.substitution}</div>}
                        <div>{s.result}</div>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <p className="klein">{aktuelle.proposal.learningGoal}</p>
              <p className="klein versionszeile">
                Fakten v{aktuelle.factVersion} · Regeln v{aktuelle.ruleVersion} · Engine v
                {aktuelle.engineVersion} · {bericht.offen} Fakten noch offen geprüft
              </p>

              <button className="haupt" onClick={() => void weiter()}>
                {index + 1 < aufgaben.length ? 'Weiter' : 'Fertig'}
              </button>
            </>
          )}
        </>
      )}

      {!pruefung && antwort === null && (
        <button className="still" onClick={() => void weiter()}>
          Ohne Antwort überspringen
        </button>
      )}
    </div>
  );
}

/** Zustandsanzeige eines Themas – in mehreren Seiten verwendet. */
export function ZustandsAnzeige(props: { zustand: TopicStateRecord | undefined }) {
  if (!props.zustand) return <span className="klein">neu</span>;
  return (
    <span className={`marker ${props.zustand.state}`} title={props.zustand.state}>
      {Math.round(reifegrad(props.zustand) * 100)} %
    </span>
  );
}

export { holeAtom };
