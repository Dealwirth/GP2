import { useMemo, useState } from 'react';
import { useGespeichert } from '../persistenz.ts';
import { lokaleBeratung, type Beratung } from '../../domain/beratung.ts';

import {
  PRUEFUNGSBEREICHE,
  TEIL2_BEREICHE,
  noteZuUrteil,
} from '../../content/syllabus/exam.ts';
import { abdeckung, reife, holeAtom, schwacheThemen } from '../../content/curriculum/index.ts';
import { reifegrad } from '../../domain/stateMachine.ts';
import { faktBericht, offeneFakten, FAKTEN_VERSION } from '../../content/facts/index.ts';
import {
  bauePhasenplan,
  aktuellePhase,
  sortiereTermine,
  tageBis,
  termineMitVorgaben,
  SICHERHEIT_TEXT,
  TRAEGER_TEXT,
  ZUSTAENDIGE_STELLE,
} from '../../domain/termine.ts';
import { tagesEintrag } from '../../memory/index.ts';
import type { Store } from '../store.ts';

/**
 * Lernstand.
 *
 * Reihenfolge nach Wichtigkeit, nicht nach Datenmenge:
 *   1. Wie viel ist abgedeckt – eine Zahl, ein Balken.
 *   2. Wo steht jeder Prüfungsbereich.
 *   3. Was heißt das nach § 15.
 *   4. Was ist zeitlich zu tun.
 *
 * Text ist hier sparsam. Erklärt wird nur, was man sonst falsch versteht –
 * etwa dass geratene Treffer nur halb zählen.
 */
export function Fortschritt(props: { store: Store }) {
  const { store } = props;
  // Der gewählte Filter bleibt stehen – sonst springt die Ansicht nach jedem
  // Neuladen auf "Alle" zurück.
  const [bereich, setBereich] = useGespeichert<string>('lernstand-bereich', 'alle');
  const bericht = faktBericht();
  const phasen = useMemo(() => bauePhasenplan(), []);
  const phase = aktuellePhase(phasen);
  const tage = tagesEintrag(store.zustaende);
  const termine = useMemo(
    () =>
      sortiereTermine(
        termineMitVorgaben({
          schriftlich: store.einstellungen.pruefungsdatumSchriftlich,
          praktisch: store.einstellungen.pruefungsdatumPraktisch,
        }),
      ),
    [store.einstellungen.pruefungsdatumSchriftlich, store.einstellungen.pruefungsdatumPraktisch],
  );

  const deckung =
    bereich === 'alle'
      ? abdeckung(store.zustaende)
      : abdeckung(store.zustaende, bereich as never);

  const schwach = useMemo(
    () =>
      schwacheThemen(store.zustaende, 8).map((atom) => ({
        atom,
        zustand: store.zustaende.get(atom.id),
        reife: store.zustaende.get(atom.id) ? reifegrad(store.zustaende.get(atom.id)!) : 0,
      })),
    [store.zustaende],
  );

  const naechsterTermin = termine.find((t) => tageBis(t.datum) >= 0);
  const offen = offeneFakten();

  return (
    <div>
      <h2>Lernstand</h2>
      <p className="klein">{tage.texte.join(' · ')}</p>

      <div className="reiterreihe">
        <button
          className={`reiter ${bereich === 'alle' ? 'aktiv' : ''}`}
          onClick={() => setBereich('alle')}
        >
          Alle
        </button>
        {TEIL2_BEREICHE.map((b) => (
          <button
            key={b}
            className={`reiter ${bereich === b ? 'aktiv' : ''}`}
            onClick={() => setBereich(b)}
          >
            {PRUEFUNGSBEREICHE[b].label}
          </button>
        ))}
      </div>

      <section className="karte">
        <div className="kennzahlen">
          <div>
            <div className="zahl">{Math.round(deckung.quote * 100)} %</div>
            <div className="klein">Abdeckung</div>
          </div>
          <div>
            <div className="zahl">{deckung.begonnen}</div>
            <div className="klein">begonnen</div>
          </div>
          <div>
            <div className="zahl">{deckung.gefestigt}</div>
            <div className="klein">gefestigt</div>
          </div>
          <div>
            <div className={`zahl ${deckung.verfallen > 0 ? 'rot' : ''}`}>
              {deckung.verfallen}
            </div>
            <div className="klein">verfallen</div>
          </div>
        </div>
        <div className="balken">
          <div className="balkenFuell" style={{ width: `${Math.round(deckung.quote * 100)}%` }} />
        </div>
      </section>

      <section>
        <h3>Reife je Bereich</h3>
        <div className="reifeListe">
          {[...TEIL2_BEREICHE, 'teil1' as const].map((b) => (
            <div key={b} className="reifeZeile">
              <span className="reifeName">{PRUEFUNGSBEREICHE[b].label}</span>
              <span className="zahlKlein">{Math.round(reife(store.zustaende, b) * 100)} %</span>
              <div className="balken">
                <div
                  className="balkenFuell"
                  style={{ width: `${Math.round(reife(store.zustaende, b) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="klein hinweiszeile">
          Geratene richtige Antworten zählen halb – Raten zählt in der Prüfung nicht.
        </p>
      </section>

      <section>
        <h3>Beratung</h3>
        <section className="karte">
          <Beratungskarte store={store} />
        </section>
      </section>

      <section>
        <h3>Prognose § 15</h3>
        <div className="karte">
          <div className="kennzahlen">
            <div>
              <div className="zahl">{store.prognose.teil2Note.toFixed(1)}</div>
              <div className="klein">Teil 2</div>
            </div>
            <div>
              <div className="zahl">{store.prognose.gesamtNote.toFixed(1)}</div>
              <div className="klein">Gesamt</div>
            </div>
            <div>
              <div className={`zahl ${store.prognose.urteil.bestanden ? 'gruen' : 'rot'}`}>
                {store.prognose.urteil.bestanden ? 'ja' : 'nein'}
              </div>
              <div className="klein">bestanden</div>
            </div>
          </div>
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
          {/* Ohne Nullpunkt-Erklärung wirken fünf Kreuze bei 6,0 wie ein Urteil.
              Nach § 15 gilt ein nicht bewerteter Bereich jedoch als 6,0 – der
              Startwert ist also rechnerisch bedingt, nicht inhaltlich. */}
          {store.ergebnisse.length === 0 && (
            <p className="klein hinweiszeile">
              Noch keine Simulation: nicht bewertete Bereiche zählen nach § 15 als 6,0.
            </p>
          )}
        </div>
      </section>

      {store.ergebnisse.length > 0 && (
        <section>
          <h3>Simulationen</h3>
          <div className="karte">
            {store.ergebnisse.slice(-5).reverse().map((e, i) => (
              <div key={i} className="zeile">
                <span>{PRUEFUNGSBEREICHE[e.bereich].label}</span>
                <span className={`klein ${e.note <= 4 ? 'gruen' : 'rot'}`}>
                  {e.quote.toFixed(0)} % · {e.note.toFixed(1)} {noteZuUrteil(e.note)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>Größte Lücken</h3>
        {schwach.length === 0 ? (
          <p className="klein">Noch keine Daten – lerne zuerst, dann steht hier etwas.</p>
        ) : (
          <ul className="schwacheListe">
            {schwach.map(({ atom, zustand, reife: r }) => (
              <li key={atom.id}>
                <span className="lueckText">
                  {atom.titel}
                  <span className="klein"> · {atom.kapitelTitel}</span>
                </span>
                <span className="zahlKlein">{zustand ? `${Math.round(r * 100)} %` : 'neu'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Plan</h3>
        {phase && (
          <div className="karte">
            <div className="prKopf">
              <span className="prTitel">{phase.titel}</span>
              <span className="prGewicht">{phase.zielMinutenProWoche} min/Woche</span>
            </div>
            <div className="prMeta">
              {phase.von} – {phase.bis}
            </div>
            <p className="klein">{phase.schwerpunkt}</p>
            <p className="klein">
              <strong>Ziel:</strong> {phase.abschlussKriterium}
            </p>
          </div>
        )}
        <div className="phasenListe">
          {phasen.map((p) => (
            <div key={p.id} className={`phasenZeile ${p.id === phase?.id ? 'aktiv' : ''}`}>
              <span className="klein">{p.von.slice(5)}</span>
              <span>{p.titel}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Termine</h3>
        <div className="karte">
          {naechsterTermin && (
            <div className="countdown">
              <div className="zahl">{Math.max(0, tageBis(naechsterTermin.datum))}</div>
              <div className="klein">Tage bis {naechsterTermin.titel}</div>
            </div>
          )}
          {termine.map((t) => {
            const rest = tageBis(t.datum);
            return (
              <div key={t.id} className="zeile">
                <span>
                  {t.titel}
                  <br />
                  <span className="klein">
                    {TRAEGER_TEXT[t.traeger]} · {SICHERHEIT_TEXT[t.sicherheit]}
                  </span>
                </span>
                <span className="klein">
                  {new Date(`${t.datum}T00:00:00`).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                  {rest >= 0 && ` · ${rest} T`}
                </span>
              </div>
            );
          })}
          <p className="klein">
            <strong>Zuständig:</strong> {ZUSTAENDIGE_STELLE.pruefendeStelle}.{' '}
            {ZUSTAENDIGE_STELLE.rechtsgrundlage}. {ZUSTAENDIGE_STELLE.hinweis}
          </p>
          <p className="klein">
            {ZUSTAENDIGE_STELLE.kammer} · {ZUSTAENDIGE_STELLE.kontakt}
          </p>
        </div>
      </section>

      <section>
        <h3>Faktenbasis {FAKTEN_VERSION}</h3>
        <div className="karte">
          <div className="zeile">
            <span>geprüft</span>
            <span className="klein gruen">{bericht.geprueft}</span>
          </div>
          <div className="zeile">
            <span>offen</span>
            <span className={`klein ${offen.length > 0 ? 'rot' : 'gruen'}`}>{offen.length}</span>
          </div>
          {offen.slice(0, 5).map((f) => (
            <div key={f.id} className="zeile">
              <span className="klein">{f.bezeichnung}</span>
              <span className="klein rot">offen</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Beratungstext zum Lernstand.
 *
 * Der Text wird aus dem Lernstand gerechnet und steht sofort. Er hält, bis er
 * verworfen wird – so bleibt die Seite beim Öffnen still.
 */
function Beratungskarte(props: { store: Store }) {
  const { store } = props;
  const [beratung, setBeratung] = useGespeichert<Beratung | null>('beratung', null);
  const [laeuft, setLaeuft] = useState(false);

  const erzeugen = async (): Promise<void> => {
    setLaeuft(true);
    try {
      setBeratung(lokaleBeratung(store.digest));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div>
      <div className="prKopf">
        <span className="prTitel">Lernberatung</span>
        {beratung && <span className="prGewicht">aus dem Lernstand gerechnet</span>}
      </div>

      {beratung ? (
        <>
          <p>{beratung.text}</p>
          <div className="raster raster2">
            <button disabled={laeuft} onClick={() => void erzeugen()}>
              {laeuft ? 'Erzeugt …' : 'Neu berechnen'}
            </button>
            <button className="still" onClick={() => setBeratung(null)}>
              Ausblenden
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="klein">Was jetzt am meisten bringt – aus deinem Lernstand gerechnet.</p>
          <button disabled={laeuft} onClick={() => void erzeugen()}>
            {laeuft ? 'Erzeugt …' : 'Beratung erzeugen'}
          </button>
        </>
      )}
    </div>
  );
}

export { holeAtom };
