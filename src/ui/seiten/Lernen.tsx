import { useMemo, useState } from 'react';
import { KAPITEL, atomeVonKapitel } from '../../content/curriculum/index.ts';
import type { KapitelDef } from '../../content/curriculum/types.ts';
import { PRUEFUNGSBEREICHE, TEIL2_BEREICHE } from '../../content/syllabus/exam.ts';
import { reifegrad } from '../../domain/stateMachine.ts';
import type { ExamArea } from '../../domain/types.ts';
import type { Store } from '../store.ts';
import type { SeitenName } from '../router.ts';
import { startSitzung } from '../../tasks/session.ts';
import { statischeGrundaufgaben } from '../../tasks/generator.ts';

/**
 * Lernpfad.
 *
 * Der Baum folgt den Berufsbildpositionen der Fachrichtung Energie- und
 * Gebäudetechnik (§ 4 ElekAusbV). Jedes Thema zeigt seinen Zustand, damit
 * sichtbar ist, was fehlt – und ein Kapitel lässt sich direkt üben.
 */
export function Lernen(props: { store: Store; wechsle: (s: SeitenName) => void }) {
  const { store } = props;
  const [bereich, setBereich] = useState<ExamArea | 'alle'>('alle');
  const [offen, setOffen] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const kapitel = useMemo(
    () => (bereich === 'alle' ? KAPITEL : KAPITEL.filter((k) => k.bereich === bereich)),
    [bereich],
  );

  const gefiltert = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (q === '') return kapitel;
    return kapitel
      .map((k) => ({
        ...k,
        atome: k.atome.filter(
          (a) =>
            a.t.toLowerCase().includes(q) ||
            a.l.toLowerCase().includes(q) ||
            k.titel.toLowerCase().includes(q),
        ),
      }))
      .filter((k) => k.atome.length > 0);
  }, [kapitel, filter]);

  const [meldung, setMeldung] = useState<string | null>(null);

  const ueben = async (kapitelId: string, titel: string): Promise<void> => {
    const vorrat = statischeGrundaufgaben();
    const passend = vorrat.filter((t) => t.proposal.topicIds.some((id) => id.startsWith(kapitelId)));
    if (passend.length === 0) {
      setMeldung(
        `Für „${titel}" gibt es noch keine fertigen Aufgaben. ` +
          'Diese Themen werden von der KI erzeugt – ohne API-Schlüssel bleibt der Vorrat leer. ' +
          'Wähle auf der Startseite eine normale Session, sie mischt alle Bereiche.',
      );
      return;
    }
    const genug = passend.slice(0, 8);
    startSitzung(genug, { minuten: 10, label: `${titel}` }, 'normal');
    location.hash = '#/ueben';
  };

  return (
    <div>
      <div className="reiterreihe">
        {(['alle', ...TEIL2_BEREICHE] as const).map((b) => (
          <button
            key={b}
            className={`reiter ${bereich === b ? 'aktiv' : ''}`}
            onClick={() => setBereich(b)}
          >
            {b === 'alle' ? 'Alle' : PRUEFUNGSBEREICHE[b].label}
          </button>
        ))}
      </div>

      <input
        className="suche"
        type="search"
        placeholder="Thema suchen"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {gefiltert.length === 0 && <p className="klein">Kein Thema gefunden.</p>}

      {gefiltert.map((k) => {
        const atome = atomeVonKapitel(k.id);
        const zustandsliste = atome.map((a) => store.zustaende.get(a.id));
        const begonnen = zustandsliste.filter((z) => z && z.answered > 0).length;
        const gefestigt = zustandsliste.filter(
          (z) => z && (z.state === 'gefestigt' || z.state === 'pruefungsreif'),
        ).length;
        const mittelReife =
          zustandsliste.reduce((s, z) => s + (z ? reifegrad(z) : 0), 0) /
          Math.max(1, zustandsliste.length);

        return (
          <section key={k.id} className="kapitel">
            <button className="kapitelKopf" onClick={() => setOffen(offen === k.id ? null : k.id)}>
              <span className="kapitelTitel">{k.titel}</span>
              <span className="klein">
                {atome.length} Themen · {gefestigt} gefestigt
              </span>
              <div className="balken schmalBalken">
                <div className="balkenFuell" style={{ width: `${Math.round(mittelReife * 100)}%` }} />
              </div>
            </button>

            {offen === k.id && (
              <>
                <p className="klein">
                  {k.position} · {PRUEFUNGSBEREICHE[k.bereich].label} · Gewicht {k.gewicht} ·{' '}
                  {begonnen} begonnen
                </p>
                <ul className="atomListe">
                  {k.atome.map((atom, i) => {
                    const id = `${k.id}-${String(i + 1).padStart(2, '0')}`;
                    const zustand = store.zustaende.get(id);
                    const reife = zustand ? reifegrad(zustand) : 0;
                    return (
                      <li key={id}>
                        <span className="atomPunkt" data-state={zustand?.state ?? 'neu'} />
                        <span className="atomTitel">{atom.t}</span>
                        <span className="klein">{Math.round(reife * 100)} %</span>
                      </li>
                    );
                  })}
                </ul>
                <button onClick={() => void ueben(k.id, k.titel)}>Dieses Kapitel üben</button>
              </>
            )}
          </section>
        );
      })}

      <section className="karte">
        <h3>Was hinter den Themen steht</h3>
        <p className="klein">
          {KAPITEL.length} Kapitel, {KAPITEL.reduce((s, k) => s + k.atome.length, 0)} Themen. Die
          Kapitel folgen den Berufsbildpositionen der Fachrichtung Energie- und
          Gebäudetechnik. Jedes Thema nennt die Position, damit du nachvollziehen
          kannst, woher es kommt.
        </p>
        {meldung && <p className="klein warnung">{meldung}</p>}
      </section>
    </div>
  );
}

export type { KapitelDef };
