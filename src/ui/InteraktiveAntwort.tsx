import { useMemo, useState } from 'react';
import type { Task } from '../domain/types.ts';
import type { Antwort } from '../domain/interaktiv.ts';
import { lueckeStimmt } from '../domain/interaktiv.ts';

/**
 * Eingabe für die interaktiven Aufgabenformate.
 *
 * Jedes Format bekommt seine eigene Bedienung – ein Freitextfeld für die
 * Zuordnung wäre so umständlich wie ungenau, und eine Zahlenaufgabe will eine
 * Zahl, keine Auswahlliste. Die Komponente kennt nur die Frage; ob die Antwort
 * stimmt, entscheidet der Aufrufer mit `bewerte`.
 *
 * Zwei Betriebsarten teilen sich dieselbe Komponente:
 *
 *   Üben    – `onAntwort` ist gesetzt. Jedes Format hat einen Prüfknopf, die
 *             Antwort geht gesammelt an den Aufrufer.
 *   Prüfung – `onVerlauf` ist gesetzt. Es gibt keinen Prüfknopf; jede Änderung
 *             wird sofort gemeldet, damit die Antwort ein Neuladen übersteht
 *             und beim Abgeben vorliegt.
 *
 * Nach dem Abgeben wird `gesperrt` gesetzt: Die Eingabe bleibt stehen, ist
 * aber nicht mehr änderbar, damit die Auflösung zur gegebenen Antwort passt.
 */
export function InteraktiveAntwort({
  task,
  gesperrt,
  onAntwort,
  onVerlauf,
  initial,
  urteil,
}: {
  task: Task;
  gesperrt: boolean;
  /** Sammelnde Rückmeldung im Übungsbetrieb. */
  onAntwort?: (a: Antwort) => void;
  /** Sofortige Rückmeldung im Prüfungsbetrieb – bei jeder Änderung. */
  onVerlauf?: (a: Antwort) => void;
  /** Bereits gegebene Antwort, z. B. nach einem Neuladen. */
  initial?: Antwort | null;
  /** Erst nach dem Abgeben gesetzt – steuert die Markierung. */
  urteil?: { korrekt: boolean } | null;
}): React.ReactElement | null {
  const iv = task.interaktiv;
  if (!iv) return null;

  const gemeinsam = { gesperrt, onAntwort, onVerlauf, initial };
  switch (iv.format) {
    case 'multi':
      return <Multi task={task} {...gemeinsam} />;
    case 'wahr-falsch':
      return <WahrFalsch {...gemeinsam} />;
    case 'zuordnung':
      return <Zuordnung task={task} {...gemeinsam} />;
    case 'reihenfolge':
      return <Reihenfolge task={task} {...gemeinsam} />;
    case 'zahl':
      return <Zahl task={task} {...gemeinsam} urteil={urteil} />;
    case 'luecke':
      return <Luecke task={task} {...gemeinsam} urteil={urteil} />;
    default:
      return null;
  }
}

interface TeilProps {
  gesperrt: boolean;
  onAntwort?: (a: Antwort) => void;
  onVerlauf?: (a: Antwort) => void;
  initial?: Antwort | null;
}

function Multi({ task, gesperrt, onAntwort, onVerlauf, initial }: TeilProps & { task: Task }): React.ReactElement {
  const [gewaehlt, setGewaehlt] = useState<string[]>(
    initial?.art === 'multi' ? initial.optionIds : [],
  );
  const richtig = new Set(task.interaktiv?.richtigIds ?? []);
  return (
    <>
      <div className="raster">
        {(task.proposal.options ?? []).map((o) => {
          const an = gewaehlt.includes(o.id);
          let klasse = 'option';
          if (gesperrt) {
            if (richtig.has(o.id)) klasse += ' richtig';
            else if (an) klasse += ' falsch';
          } else if (an) klasse += ' gewaehlt';
          return (
            <button
              key={o.id}
              className={klasse}
              disabled={gesperrt}
              onClick={() => {
                const neu = an ? gewaehlt.filter((x) => x !== o.id) : [...gewaehlt, o.id];
                setGewaehlt(neu);
                onVerlauf?.({ art: 'multi', optionIds: neu });
              }}
            >
              {o.text}
            </button>
          );
        })}
      </div>
      {!gesperrt && onAntwort && (
        <button
          className="haupt"
          disabled={gewaehlt.length === 0}
          onClick={() => onAntwort({ art: 'multi', optionIds: gewaehlt })}
        >
          Antwort prüfen
        </button>
      )}
    </>
  );
}

function WahrFalsch({ gesperrt, onAntwort, onVerlauf, initial }: TeilProps): React.ReactElement {
  const [wert, setWert] = useState<boolean | null>(
    initial?.art === 'wahr-falsch' ? initial.wert : null,
  );

  const waehle = (neu: boolean): void => {
    setWert(neu);
    onVerlauf?.({ art: 'wahr-falsch', wert: neu });
    // Im Üben gab es hier nie einen Prüfknopf: Zwei Knöpfe, eine Entscheidung.
    // Ein zusätzlicher Bestätigungsschritt wäre nur ein Klick mehr.
    onAntwort?.({ art: 'wahr-falsch', wert: neu });
  };

  return (
    <div className="raster">
      <button
        className={`option ${wert === true ? 'gewaehlt' : ''}`}
        disabled={gesperrt}
        onClick={() => waehle(true)}
      >
        wahr
      </button>
      <button
        className={`option ${wert === false ? 'gewaehlt' : ''}`}
        disabled={gesperrt}
        onClick={() => waehle(false)}
      >
        falsch
      </button>
    </div>
  );
}

function Zuordnung({
  task,
  gesperrt,
  onAntwort,
  onVerlauf,
  initial,
}: TeilProps & { task: Task }): React.ReactElement {
  const paare = task.interaktiv?.paare ?? [];
  // Die rechte Spalte steht in gemischter Reihenfolge. Wird sie in der
  // Reihenfolge der Paare gezeigt, verrät schon die Position die Lösung.
  const rechtsGemisch = useMemo(() => {
    const r = paare.map((p) => p.rechts);
    for (let i = r.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j]!, r[i]!];
    }
    return r;
  }, [paare]);
  const [zuordnung, setZuordnung] = useState<Record<string, string>>(
    initial?.art === 'zuordnung' ? initial.zuordnung : {},
  );
  const [aktiv, setAktiv] = useState<string | null>(null);

  const vollstaendig = paare.every((p) => zuordnung[p.links] !== undefined);

  return (
    <>
      <div className="zuordnung">
        {paare.map((p) => {
          const gewaehlt = zuordnung[p.links];
          let klasse = 'zuordZeile';
          if (gesperrt) klasse += gewaehlt === p.rechts ? ' richtig' : ' falsch';
          else if (aktiv === p.links) klasse += ' gewaehlt';
          return (
            <button
              key={p.links}
              className={klasse}
              disabled={gesperrt}
              onClick={() => setAktiv(aktiv === p.links ? null : p.links)}
            >
              <span className="zuordLinks">{p.links}</span>
              <span className="zuordPfeil">→</span>
              <span className="zuordRechts">{gewaehlt ?? '…'}</span>
            </button>
          );
        })}
      </div>
      {!gesperrt && aktiv !== null && (
        <>
          <p className="klein">Wähle die passende Zuordnung für „{aktiv}":</p>
          <div className="raster">
            {rechtsGemisch.map((r) => (
              <button
                key={r}
                className="option"
                onClick={() => {
                  const neu = { ...zuordnung, [aktiv]: r };
                  setZuordnung(neu);
                  setAktiv(null);
                  onVerlauf?.({ art: 'zuordnung', zuordnung: neu });
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}
      {!gesperrt && aktiv === null && onAntwort && (
        <button
          className="haupt"
          disabled={!vollstaendig}
          onClick={() => onAntwort({ art: 'zuordnung', zuordnung })}
        >
          Antwort prüfen
        </button>
      )}
    </>
  );
}

function Reihenfolge({
  task,
  gesperrt,
  onAntwort,
  onVerlauf,
  initial,
}: TeilProps & { task: Task }): React.ReactElement {
  const schritte = task.interaktiv?.schritte ?? [];
  // Startreihenfolge: gemischt, aber stabil – eine feste Verdrehung reicht,
  // damit die richtige Reihenfolge nicht schon dasteht.
  const start = useMemo(() => {
    const idx = schritte.map((_, i) => i);
    return idx.length > 1 ? [...idx.slice(1), idx[0]!] : idx;
  }, [schritte]);
  const [ordnung, setOrdnung] = useState<number[]>(
    initial?.art === 'reihenfolge' ? initial.reihenfolge : start,
  );

  const tausche = (i: number, j: number): void => {
    if (j < 0 || j >= ordnung.length) return;
    const neu = [...ordnung];
    [neu[i], neu[j]] = [neu[j]!, neu[i]!];
    setOrdnung(neu);
    onVerlauf?.({ art: 'reihenfolge', reihenfolge: neu });
  };

  return (
    <>
      <ol className="reihenfolge">
        {ordnung.map((idx, pos) => {
          let klasse = '';
          if (gesperrt) klasse = idx === pos ? 'richtig' : 'falsch';
          return (
            <li key={idx} className={klasse}>
              <span>{schritte[idx]}</span>
              {!gesperrt && (
                <span className="schieber">
                  <button className="still" onClick={() => tausche(pos, pos - 1)} disabled={pos === 0}>
                    ↑
                  </button>
                  <button
                    className="still"
                    onClick={() => tausche(pos, pos + 1)}
                    disabled={pos === ordnung.length - 1}
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!gesperrt && onAntwort && (
        <button className="haupt" onClick={() => onAntwort({ art: 'reihenfolge', reihenfolge: ordnung })}>
          Antwort prüfen
        </button>
      )}
    </>
  );
}

function Zahl({
  task,
  gesperrt,
  onAntwort,
  onVerlauf,
  initial,
  urteil,
}: TeilProps & { task: Task; urteil?: { korrekt: boolean } | null }): React.ReactElement {
  const [text, setText] = useState(
    initial?.art === 'zahl' ? String(initial.wert).replace('.', ',') : '',
  );
  const einheit = task.interaktiv?.einheit ?? '';
  const formeln = task.interaktiv?.formeln ?? [];
  const wert = Number(text.replace(',', '.'));
  const gueltig = text.trim() !== '' && Number.isFinite(wert);

  const melde = (): void => {
    if (gueltig) onVerlauf?.({ art: 'zahl', wert });
  };

  return (
    <>
      {formeln.length > 0 && (
        <div className="formelkasten">
          {formeln.map((f) => (
            <div key={f} className="formel">
              {f}
            </div>
          ))}
        </div>
      )}
      <div className="zahleingabe">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          disabled={gesperrt}
          placeholder="Wert"
          onChange={(e) => setText(e.target.value)}
          onBlur={melde}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && gueltig && !gesperrt) {
              onAntwort?.({ art: 'zahl', wert });
              melde();
            }
          }}
        />
        {einheit && <span className="einheit">{einheit}</span>}
      </div>
      {!gesperrt && onAntwort && (
        <button className="haupt" disabled={!gueltig} onClick={() => onAntwort({ art: 'zahl', wert })}>
          Antwort prüfen
        </button>
      )}
      {gesperrt && urteil && !urteil.korrekt && (
        <p className="klein">
          Erwartet: {String(task.interaktiv?.wert ?? 0).replace('.', ',')} {einheit}
        </p>
      )}
    </>
  );
}

function Luecke({
  task,
  gesperrt,
  onAntwort,
  onVerlauf,
  initial,
  urteil,
}: TeilProps & { task: Task; urteil?: { korrekt: boolean } | null }): React.ReactElement {
  const luecken = task.interaktiv?.luecken ?? [];
  const [werte, setWerte] = useState<string[]>(
    initial?.art === 'luecke' ? initial.luecken : luecken.map(() => ''),
  );
  const teile = task.proposal.prompt.split('___');
  const vollstaendig = werte.every((w) => w.trim() !== '');

  const setze = (i: number, wert: string): void => {
    const neu = werte.map((w, k) => (k === i ? wert : w));
    setWerte(neu);
    if (neu.every((w) => w.trim() !== '')) onVerlauf?.({ art: 'luecke', luecken: neu });
  };

  return (
    <>
      <p className="frage lueckentext">
        {teile.map((t, i) => (
          <span key={i}>
            {t}
            {i < teile.length - 1 && (
              <input
                className={
                  gesperrt
                    ? werte[i] && lueckeStimmt(luecken[i]!, werte[i]!)
                      ? 'richtig'
                      : 'falsch'
                    : ''
                }
                type="text"
                value={werte[i]}
                disabled={gesperrt}
                onChange={(e) => setze(i, e.target.value)}
              />
            )}
          </span>
        ))}
      </p>
      {!gesperrt && onAntwort && (
        <button className="haupt" disabled={!vollstaendig} onClick={() => onAntwort({ art: 'luecke', luecken: werte })}>
          Antwort prüfen
        </button>
      )}
      {gesperrt && urteil && !urteil.korrekt && (
        <p className="klein">
          Lösung: {luecken.map((l) => l.loesung).join(' · ')}
        </p>
      )}
    </>
  );
}
