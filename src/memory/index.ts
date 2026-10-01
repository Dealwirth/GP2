import type { TopicStateRecord } from '../domain/types.ts';
import { ATOME, abdeckung, faelligeThemen, fehlerkorbThemen, holeAtom, reife, schwacheThemen } from '../content/curriculum/index.ts';
import { effektiverZustand } from '../domain/stateMachine.ts';
import { TEIL2_BEREICHE } from '../content/syllabus/exam.ts';
import type { Pruefungsergebnis } from '../domain/exam/simulation.ts';

/**
 * Lerngedächtnis.
 *
 * Zwei Ebenen, sauber getrennt:
 *   (a) Wissen in `content/` – schreibgeschützt
 *   (b) Lernfortschritt hier – wird automatisch geschrieben und überwacht
 *
 * Die Überwachung schreibt nur in (b), in Form von Insights und Plänen. Sie
 * kann damit den Lernpfad steuern, aber kein Prüfungswissen verändern.
 */

export type InsightTyp =
  | 'fortgeschritten'
  | 'wiederholt'
  | 'schwach'
  | 'vergessen'
  | 'neue_luecke'
  | 'lernstrategie';

export interface Insight {
  id: string;
  typ: InsightTyp;
  topicId: string | null;
  bereich: string;
  text: string;
  konfidenz: number;
  gueltigBis: string;
  /** `auto` stammt aus der Überwachung, `korrektur` vom Nutzer – und gewinnt. */
  herkunft: 'auto' | 'korrektur';
  erstelltAm: string;
}

export interface Digest {
  erstelltAm: string;
  beantwortetGesamt: number;
  themenBegonnen: number;
  themenGefestigt: number;
  themenVerfallen: number;
  abdeckungQuote: number;
  reife: Record<string, number>;
  fehlerquote: number;
  /** Top-Themen, die immer wieder falsch laufen. */
  haeufigsteFehler: { atomId: string; titel: string; quote: number }[];
  faelligeThemen: string[];
  offeneFaelligkeit: string[];
}

/**
 * Verdichtet den Lernstand zu einem kompakten Überblick.
 *
 * Der Digest ist bewusst klein gehalten – er ist die Kennzahl, aus der die
 * Lernberatung und der Fortschritt entstehen.
 */
export function baueDigest(
  zustaende: Map<string, TopicStateRecord>,
  jetzt = new Date(),
): Digest {
  const reifeWerte: Record<string, number> = {};
  for (const bereich of [...TEIL2_BEREICHE, 'teil1'] as const) {
    reifeWerte[bereich] = reife(zustaende, bereich, jetzt);
  }

  const haeufigsteFehler = fehlerkorbThemen(zustaende, 8).map((atom) => ({
    atomId: atom.id,
    titel: atom.titel,
    quote: zustaende.get(atom.id)?.hitRate ?? 0,
  }));

  // Nur Einträge zählen, die zu einem echten Thema des Lernpfads gehören.
  // Sonst schleppt sich ein einziger verwaister Datensatz in jede Kennzahl.
  const zustaendeDerThemen = [...zustaende.values()].filter((z) => holeAtom(z.topicId));
  const beantwortetGesamt = zustaendeDerThemen.reduce((s, z) => s + z.answered, 0);
  const fehlerquote =
    beantwortetGesamt > 0
      ? zustaendeDerThemen.reduce((s, z) => s + z.answered * (1 - z.hitRate), 0) /
        beantwortetGesamt
      : 0;

  return {
    erstelltAm: jetzt.toISOString(),
    beantwortetGesamt,
    themenBegonnen: zustaendeDerThemen.filter((z) => z.answered > 0).length,
    themenGefestigt: zustaendeDerThemen.filter((z) => {
      const s = effektiverZustand(z, jetzt);
      return s === 'gefestigt' || s === 'pruefungsreif';
    }).length,
    // Verfallen heißt: über die Schwelle gefallen – nicht nur „steht so im
    // gespeicherten Zustand". Der Verfall entsteht durch Zeit, nicht durch
    // eine Antwort, deshalb wird er hier aus dem Datum abgeleitet.
    themenVerfallen: zustaendeDerThemen.filter(
      (z) => effektiverZustand(z, jetzt) === 'ueberfaellig',
    ).length,
    abdeckungQuote: abdeckung(zustaende, undefined, jetzt).quote,
    reife: reifeWerte,
    fehlerquote,
    haeufigsteFehler,
    faelligeThemen: faelligeThemen(zustaende, jetzt).map((a) => a.id),
    offeneFaelligkeit: ATOME.filter((a) => !zustaende.has(a.id)).map((a) => a.id),
  };
}

/**
 * Die Lernüberwachung.
 *
 * Sie erkennt Muster im eigenen Lernverlauf: Fortschritt, Stillstand, Widersprüche
 * zwischen Trefferquote und Selbstvertrauen, verfallendes Wissen und Themen, die
 * immer wieder falsch laufen.
 */
export function ueberwacheLernen(
  zustaende: Map<string, TopicStateRecord>,
  digest: Digest,
  ergebnisse: Pruefungsergebnis[] = [],
): Insight[] {
  const insights: Insight[] = [];
  const jetzt = new Date();
  const gueltigBis = new Date(jetzt.getTime() + 14 * 86_400_000).toISOString();

  const anlegen = (
    typ: InsightTyp,
    topicId: string | null,
    bereich: string,
    text: string,
    konfidenz: number,
  ): Insight => ({
    id: `i_${typ}_${topicId ?? 'all'}_${jetzt.getTime().toString(36)}`,
    typ,
    topicId,
    bereich,
    text,
    konfidenz,
    gueltigBis,
    herkunft: 'auto',
    erstelltAm: jetzt.toISOString(),
  });

  // 1. Widerspruch zwischen richtigen Antworten und fehlendem Selbstvertrauen
  const unaSicher = [...zustaende.values()].filter(
    (z) => holeAtom(z.topicId) && z.hitRate >= 0.8 && z.confidenceRate < 0.5 && z.answered >= 3,
  );
  if (unaSicher.length > 0) {
    insights.push(
      anlegen(
        'lernstrategie',
        unaSicher[0]!.topicId,
        'gesamt',
        `Bei ${unaSicher.length} Thema(r) triffst du fast immer, schätzt dein Wissen aber ` +
          'selbst als unsicher ein. Das ist kein Wissensproblem, sondern ein ' +
          'Wiederholungsproblem: einmal in Ruhe prüfen, ob das wirklich sitzt.',
        0.7,
      ),
    );
  }

  // 2. Widerspruch: hohe Trefferquote bei gleichzeitig hoher Fehlerquote
  if (digest.haeufigsteFehler.length >= 3 && digest.beantwortetGesamt >= 10) {
    const spitze = digest.haeufigsteFehler[0]!;
    const atom = holeAtom(spitze.atomId);
    insights.push(
      anlegen(
        'schwach',
        spitze.atomId,
        atom?.bereich ?? 'gesamt',
        `„${spitze.titel}" ist dein häufigstes Problem ` +
          `(Trefferquote ${Math.round(spitze.quote * 100)} %). ` +
          'Dieses Thema gezielt vorziehen.',
        0.8,
      ),
    );
  }

  // 3. Verfallenes Wissen
  if (digest.themenVerfallen > 0) {
    insights.push(
      anlegen(
        'vergessen',
        null,
        'gesamt',
        `${digest.themenVerfallen} Thema(r) sind aus der Wiederholung gefallen. ` +
          'Das ist der Normalfall nach Wochen – genau dafür ist die Wiederholung da.',
        0.9,
      ),
    );
  }

  // 4. Fortschritt
  if (digest.themenGefestigt > 0 && digest.themenGefestigt >= digest.themenBegonnen * 0.5) {
    insights.push(
      anlegen(
        'fortgeschritten',
        null,
        'gesamt',
        `${digest.themenGefestigt} von ${digest.themenBegonnen} begonnenen Themen sind ` +
          'gefestigt. Das Tempo stimmt.',
        0.8,
      ),
    );
  }

  // 5. Lücke im Stoff
  const nichtBegonnen = ATOME.length - digest.themenBegonnen;
  if (nichtBegonnen > ATOME.length * 0.6 && digest.beantwortetGesamt > 20) {
    insights.push(
      anlegen(
        'neue_luecke',
        null,
        'gesamt',
        `Du hast ${nichtBegonnen} von ${ATOME.length} Themen noch nie gesehen. ` +
          'Breite zuerst schließen, bevor du einzelne Themen vertiefst – die Prüfung ' +
          'fragt breit.',
        0.75,
      ),
    );
  }

  // 6. Abweichung zwischen Simulation und Lernstand
  if (ergebnisse.length > 0) {
    const letzte = ergebnisse[ergebnisse.length - 1]!;
    const lernstand = digest.reife[letzte.bereich] ?? 0;
    const simulationNote = letzte.note;
    if (simulationNote > 3.0 && lernstand > 0.7) {
      insights.push(
        anlegen(
          'lernstrategie',
          null,
          letzte.bereich,
          `Dein Lernstand wirkt besser als deine letzte Simulation (${simulationNote.toFixed(1)}). ` +
            'Entweder rätst du im Training, oder du bist unter Zeitdruck langsamer. ' +
            'Beides ist ein Trainingsziel – die Simulation zählt.',
          0.75,
        ),
      );
    }
  }

  return insights;
}

/** Kurze Notiz für die Startseite, höchstens drei Punkte. */
export function coachNotiz(insights: Insight[]): string[] {
  const rangfolge: Record<InsightTyp, number> = {
    vergessen: 1,
    schwach: 2,
    neue_luecke: 3,
    lernstrategie: 4,
    fortgeschritten: 5,
    wiederholt: 6,
  };
  return [...insights]
    .sort((a, b) => rangfolge[a.typ] - rangfolge[b.typ])
    .slice(0, 3)
    .map((i) => i.text);
}

/** Themen für die nächste Session – verfallen zuerst, dann Schwächen. */
export function naechsteThemen(
  zustaende: Map<string, TopicStateRecord>,
  anzahl = 8,
): string[] {
  const verfallen = faelligeThemen(zustaende).map((a) => a.id);
  const schwach = schwacheThemen(zustaende, anzahl).map((a) => a.id);
  const zusammen = [...new Set([...verfallen, ...schwach])];
  return zusammen.slice(0, anzahl);
}

/** Lerntagebuch-Eintrag für den Tag. */
export function tagesEintrag(
  zustaende: Map<string, TopicStateRecord>,
  heute = new Date(),
): { datum: string; beantwortet: number; richtig: number; texte: string[] } {
  const tagesStart = new Date(heute);
  tagesStart.setHours(0, 0, 0, 0);

  let beantwortet = 0;
  let richtig = 0;
  for (const z of zustaende.values()) {
    // Verwaiste Datensätze ohne zugehöriges Thema nicht mitzählen.
    if (!holeAtom(z.topicId)) continue;
    if (!z.lastSeen || new Date(z.lastSeen) < tagesStart) continue;
    beantwortet += 1;
    if (z.hitRate >= 0.7) richtig += 1;
  }

  const texte: string[] = [];
  if (beantwortet === 0) texte.push('Heute noch nichts bearbeitet.');
  else {
    // Deutsche Mehrzahl statt Klammerkonstruktion – „1 Thema(r)" liest niemand gern.
    const themen = beantwortet === 1 ? 'Thema' : 'Themen';
    texte.push(`${beantwortet} ${themen} bearbeitet · ${richtig} mit guter Trefferquote`);
  }

  return {
    datum: tagesStart.toISOString().slice(0, 10),
    beantwortet,
    richtig,
    texte,
  };
}
