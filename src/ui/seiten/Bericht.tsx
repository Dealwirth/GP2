import { useMemo, useState } from 'react';
import { PRUEFUNGSBEREICHE, TEIL2_BEREICHE, noteZuUrteil } from '../../content/syllabus/exam.ts';
import { abdeckung, reife, KAPITEL, ATOME, holeAtom } from '../../content/curriculum/index.ts';
import { reifegrad } from '../../domain/stateMachine.ts';
import { faktBericht, offeneFakten, FAKTEN } from '../../content/facts/index.ts';
import { baueDigest } from '../../memory/index.ts';
import { bauePhasenplan, aktuellePhase } from '../../domain/termine.ts';
import type { Store } from '../store.ts';

/**
 * Lehrerbericht.
 *
 * Ein Text, den du Ausbilder oder Prüfungsvorbereiter vorlegen kannst. Er sagt
 * ehrlich, wo du stehst – und er verschweigt die offenen Punkte der Faktenbasis
 * nicht, weil ein Bericht, der Unsicherheit versteckt, nicht hilfreich ist.
 */
export function Bericht(props: { store: Store }) {
  const { store } = props;
  const [kopiert, setKopiert] = useState(false);
  const bericht = faktBericht();
  const phasen = bauePhasenplan();
  const phase = aktuellePhase(phasen);
  const digest = baueDigest(store.zustaende);

  const zeilen = useMemo(
    () =>
      TEIL2_BEREICHE.map((b) => ({
        bereich: b,
        label: PRUEFUNGSBEREICHE[b].label,
        reife: reife(store.zustaende, b),
        abgedeckt: abdeckung(store.zustaende, b).quote,
      })),
    [store.zustaende],
  );

  const text = useMemo(() => berichtstext(store, zeilen, bericht.offen, phase?.titel ?? 'Grundlagen'), [store, zeilen, bericht.offen, phase?.titel]);

  return (
    <div>
      <p className="klein">
        Dieser Bericht ist für dich und für deine Ausbilderin oder deinen
        Ausbilder. Er lässt sich ausdrucken oder als Text kopieren.
      </p>

      <div className="karte berichtKarte">
        <h2>Lernstand</h2>
        <p className="klein">Erstellt am {new Date().toLocaleDateString('de-DE')}</p>

        <table className="tabelle">
          <thead>
            <tr>
              <th>Prüfungsbereich</th>
              <th>Reife</th>
              <th>Abgedeckt</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <tr key={z.bereich}>
                <td>{z.label}</td>
                <td>{Math.round(z.reife * 100)} %</td>
                <td>{Math.round(z.abgedeckt * 100)} %</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p>
          <strong>Prognose Teil 2:</strong> {store.prognose.teil2Note.toFixed(1)} (
          {noteZuUrteil(store.prognose.teil2Note)}), Gesamt {store.prognose.gesamtNote.toFixed(1)}.
          {' '}
          {store.prognose.urteil.bestanden
            ? 'Nach der Bestehensregel § 15 ElekAusbV wäre die Prüfung bestanden.'
            : 'Nach der Bestehensregel § 15 ElekAusbV noch nicht bestanden.'}
        </p>

        <p>
          <strong>Themen:</strong> {digest.themenBegonnen} begonnen, {digest.themenGefestigt}{' '}
          gefestigt, {digest.themenVerfallen} verfallen – bei {ATOME.length} Themen
          insgesamt in {KAPITEL.length} Kapiteln.
        </p>

        {phase && (
          <p>
            <strong>Lernphase:</strong> {phase.titel}. {phase.schwerpunkt}
          </p>
        )}

        <p>
          <strong>Nächster Schritt:</strong>{' '}
          {store.prognose.dringendsteLuecken
            .slice(0, 3)
            .map((l) => l.titel)
            .join(', ') || '—'}
        </p>

        <p className="klein">
          Faktenbasis v{FAKTEN.length > 0 ? bericht.version : '1.0'} mit {bericht.offen} noch
          nicht am Original geprüften Werten. Die Lernplattform kennzeichnet diese
          Werte in jeder Aufgabe, statt sie als gesichert auszugeben.
        </p>
      </div>

      <div className="raster raster2">
        <button
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => setKopiert(true));
          }}
        >
          {kopiert ? 'Kopiert' : 'Als Text kopieren'}
        </button>
        <button onClick={() => print()}>Drucken</button>
      </div>

      <section className="karte">
        <h3>Schwächste Themen</h3>
        <ul className="schwacheListe">
          {[...store.zustaende.values()]
            .filter((z) => z.answered > 0)
            .map((z) => ({ z, r: reifegrad(z) }))
            .sort((a, b) => a.r - b.r)
            .slice(0, 10)
            .map(({ z, r }) => (
              <li key={z.topicId}>
                <span>{holeAtom(z.topicId)?.titel ?? z.topicId}</span>
                <span className="klein">
                  {Math.round(r * 100)} % · {z.answered} Versuche
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section className="karte">
        <h3>Offene Prüfpunkte der Faktenbasis</h3>
        <p className="klein">
          Diese Werte stehen in der Anwendung, sind aber nicht am Original
          geprüft. Sie werden in Aufgaben als offen gekennzeichnet.
        </p>
        {offeneFakten().map((f) => (
          <div key={f.id} className="zeile">
            <span className="klein">{f.bezeichnung}</span>
            <span className="klein">
              {f.wert ?? '—'} {f.einheit ?? ''}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function berichtstext(
  store: Store,
  zeilen: { label: string; reife: number; abgedeckt: number }[],
  offeneFaktenAnzahl: number,
  phase: string,
): string {
  const datum = new Date().toLocaleDateString('de-DE');
  const zeilenText = zeilen
    .map((z) => `  ${z.label}: Reife ${Math.round(z.reife * 100)} %, abgedeckt ${Math.round(z.abgedeckt * 100)} %`)
    .join('\n');

  return [
    `Lernstand – Gesellenprüfung Teil 2, Elektroniker/in für Energie- und Gebäudetechnik`,
    `Stand: ${datum}`,
    ``,
    zeilenText,
    ``,
    `Prognose Teil 2: ${store.prognose.teil2Note.toFixed(1)} – ${noteZuUrteil(store.prognose.teil2Note)}`,
    `Gesamtergebnis (Hochrechnung): ${store.prognose.gesamtNote.toFixed(1)}`,
    `Bestehensregel § 15: ${store.prognose.urteil.bestanden ? 'erfüllt' : 'noch nicht erfüllt'}`,
    ``,
    `Lernphase: ${phase}`,
    `Themen begonnen: ${store.digest.themenBegonnen}, gefestigt: ${store.digest.themenGefestigt}, verfallen: ${store.digest.themenVerfallen}`,
    `Faktenbasis: ${offeneFaktenAnzahl} Werte noch nicht am Original geprüft und in der Anwendung als offen gekennzeichnet.`,
    ``,
    store.prognose.hinweis,
  ].join('\n');
}
