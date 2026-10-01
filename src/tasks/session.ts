import type { Task, Session, TopicStateRecord } from '../domain/types.ts';
import {
  berechneNaechsteFaelligkeit,
  effektiverZustand,
  leererZustand,
  wendeVersuchAn,
  reifegrad,
} from '../domain/stateMachine.ts';
import { holeAufgaben, holeAlleAufgaben, bekannteThemen } from './ablage.ts';
import { holeVorrat, markiereBenutzt } from './vorrat.ts';
import { ATOME, atomeVonBereich, holeAtom } from '../content/curriculum/index.ts';
import type { Atom } from '../content/curriculum/types.ts';
import { seedAufgabenFuerAtom, seedAufgabenFuerAtome } from './seed.ts';
import type { ExamArea } from '../domain/types.ts';
import { naechsterTermin, tageBis } from '../domain/termine.ts';
import { storage } from '../storage/index.ts';

/**
 * Sitzungs-Baukasten.
 *
 * Kernidee: Der Nutzer wählt ein ZEITBUDGET, nicht Themen. Die App packt die
 * Session passend – wie ein Trainer, der weiß, dass nur die Pause reicht.
 */

/**
 * Zeitrahmen einer Sitzung.
 *
 * Bewusst zweistufig: Die Pausen-Budgets sind eine feste Auswahl ("5 Minuten"
 * bis "45 Minuten"), eine Prüfung bringt dagegen ihre eigene Dauer mit – 120
 * Minuten für den Systementwurf sind keine Pause, sondern die Originalzeit.
 * Vorher war beides derselbe Typ, und die Prüfung ließ sich gar nicht erst
 * mit ihrer echten Dauer starten.
 */
export interface Sitzungsbudget {
  minuten: number;
  label: string;
}

/** Auswahl für den Pausenmodus. */
export interface Zeitbudget extends Sitzungsbudget {
  minuten: 5 | 10 | 20 | 30 | 45;
}

export const BUDGETS: Zeitbudget[] = [
  { minuten: 5, label: '5 Minuten' },
  { minuten: 10, label: '10 Minuten' },
  { minuten: 20, label: '20 Minuten' },
  { minuten: 30, label: '30 Minuten' },
  { minuten: 45, label: '45 Minuten' },
];

/**
 * Laufende Sitzung.
 *
 * Die Sitzung wird im Arbeitsspeicher gehalten, nicht in React-State: der
 * Aufgabenablauf darf nicht neu gebaut werden, wenn eine Seite neu rendert.
 */
let laufendeSitzung: { sitzung: Session; aufgaben: Task[]; budget: Sitzungsbudget } | null = null;

export function halteSitzung(
  sitzung: Session,
  aufgaben: Task[],  budget: Sitzungsbudget,
  ): void {
  laufendeSitzung = { sitzung, aufgaben, budget };
}

export function holeSitzung(): { sitzung: Session; aufgaben: Task[]; budget: Sitzungsbudget } | null {
  return laufendeSitzung;
}

/** Was eine wiederhergestellte Sitzung enthält. */
export interface Wiederherstellbar {
  sitzung: Session;
  aufgaben: Task[];
  budget: Sitzungsbudget;
}

/**
 * Stellt eine gespeicherte Sitzung nach einem Neuladen wieder her.
 *
 * Vorher stand die laufende Sitzung nur im Arbeitsspeicher. Ein Neuladen – auf
 * dem Telefon der Normalfall, sobald der Browser den Tab aus dem Speicher
 * wirft – ließ eine halb bearbeitete Runde verschwinden, obwohl sie in der
 * Datenbank lag. Genau das darf nicht passieren.
 *
 * Drei Fälle werden unterschieden:
 *  - Die Zeit ist abgelaufen: die Sitzung wird sauber beendet, nicht wieder aufgenommen.
 *  - Eine Aufgabe ist nicht mehr auffindbar: sie wird übersprungen, der Rest läuft.
 *  - Nichts gespeichert: es bleibt bei `null`.
 */
export async function stelleSitzungWieder(): Promise<Wiederherstellbar | null> {
  if (laufendeSitzung) return laufendeSitzung;

  const gespeichert = await storage.laufendeSitzung();
  if (!gespeichert || gespeichert.endedAt) return null;

  const ende = new Date(gespeichert.startedAt).getTime() + gespeichert.budgetSeconds * 1000;
  if (Date.now() >= ende) {
    await storage.sitzungBeenden(gespeichert.sessionId, new Date().toISOString());
    return null;
  }

  // Die Aufgaben liegen in der lokalen Ablage – dort landen alle vom
  // Modell erzeugten Aufgaben.
  const nachId = new Map(holeAlleAufgaben().map((t) => [t.taskId, t]));
  for (const aufgabe of holeAufgaben(gespeichert.taskIds)) {
    nachId.set(aufgabe.taskId, aufgabe);
  }

  const aufgaben = gespeichert.taskIds
    .map((id) => nachId.get(id))
    .filter((t): t is Task => Boolean(t));

  if (aufgaben.length === 0) return null;

  laufendeSitzung = {
    sitzung: gespeichert,
    aufgaben,
    budget: { minuten: Math.round(gespeichert.budgetSeconds / 60), label: 'Fortgesetzt' },
  };
  return laufendeSitzung;
}

export function beendeSitzung(): void {
  laufendeSitzung = null;
}

/**
 * Themen für eine Sitzung – bewusst durchmischt.
 *
 * Gewichtung: fällige Wiederholungen zuerst, dann ein breiter Mix über
 * alle vier Prüfungsbereiche. Innerhalb eines Bereichs entscheidet der
 * Reifegrad (schwächstes zuerst), der Rest wird gemischt, damit keine
 * Sitzung wie die vorige aussieht.
 */
export async function waehleThemen(anzahl: number, bereichFilter?: ExamArea): Promise<string[]> {
  const zustaende = new Map((await storage.alleZustaende()).map((z) => [z.topicId, z]));
  const kandidaten = bereichFilter ? atomeVonBereich(bereichFilter) : ATOME;
  const heute = new Date();
  // Der Termin steuert den Takt: Ist die Prüfung nah, darf mehr Neues kommen,
  // damit nichts unbesehen bleibt. Ist sie fern, wird gebremst. Maßgeblich ist
  // der amtliche Termin; ein eigenes Datum aus den Einstellungen verschiebt
  // den Takt nur um wenige Tage und wird hier bewusst nicht durchgereicht.
  const termin = naechsterTermin(heute);
  const restTage = termin ? tageBis(termin.datum, heute) : null;
  return waehleThemenAus(kandidaten, zustaende, bekannteThemen(), anzahl, heute, restTage);
}

/**
 * Reine Themenauswahl – ohne Speicher, damit sie prüfbar bleibt.
 *
 * Zwei Regeln halten den Stoff bis zur Prüfung am Leben:
 *
 *  1. **Wiederholung zuerst.** Themen, die schon dran waren, füllen die
 *     Auswahl. Verfallenes und Fälliges steht ganz vorn.
 *  2. **Ein reservierter Platz für Neues.** Es bleibt immer mindestens ein
 *     Platz für ein noch unbearbeitetes Thema frei. Ohne diese Reserve könnte
 *     eine Handvoll halb reifer Themen die Auswahl dauerhaft füllen, und der
 *     Rest des Stoffs käme nie an die Reihe.
 *
 * Wie viele frische Themen zusätzlich dazukommen, hängt vom Termin ab: Ist die
 * Prüfung fern, nur eines – sonst wäre der Stoff in wenigen Wochen durch. Ist
 * sie nah, mehr, damit vor dem Termin noch die Breite durchgearbeitet wird.
 */
export function waehleThemenAus(
  kandidaten: Atom[],
  zustaende: Map<string, TopicStateRecord>,
  schonDran: Set<string>,
  anzahl: number,
  jetzt: Date,
  /** Tage bis zur Prüfung. `null` heißt unbekannt – dann gilt ein fester Takt. */
  tageBisPruefung: number | null = null,
): string[] {
  const offen = kandidaten.filter((a) => !schonDran.has(a.id)).length;
  // „Offene Themen / Resttage" ist der Takt, in dem Neues eingeführt werden
  // darf, wenn eine Sitzung am Tag angenommen wird. Ist die Prüfung nah, wird
  // der Takt größer – dann muss die Breite noch durch. Mindestens eines, damit
  // immer etwas Neues dazukommt.
  const takt = tageBisPruefung && tageBisPruefung > 0 ? offen / tageBisPruefung : offen / 8;
  const neuesLimit = Math.max(1, Math.ceil(takt));

  const bewertet = kandidaten.map((atom) => {
    const z = zustaende.get(atom.id);
    const reif = z ? reifegrad(z, jetzt) : 0;
    // Fällige Wiederholungen drängen nach vorn, verfallenes Wissen noch
    // stärker. Der Zufallsanteil mischt – keine Sitzung wie die vorige.
    const faelligBonus = z?.nextDue && new Date(z.nextDue) <= jetzt ? 6 : 0;
    const verfallBonus = z && effektiverZustand(z, jetzt) === 'ueberfaellig' ? 8 : 0;
    const zufall = Math.random() * 3;
    const score = reif * 10 - atom.gewicht - faelligBonus - verfallBonus - zufall;
    return { id: atom.id, score, neu: !schonDran.has(atom.id) };
  });

  bewertet.sort((a, b) => a.score - b.score);

  const bekannt = bewertet.filter((e) => !e.neu);
  const frisch = bewertet.filter((e) => e.neu);

  // Platz für Neues ist reserviert – aber nur, wenn die Runde mehr als ein
  // Thema fasst. Eine Ein-Thema-Runde geht an die Wiederholung: Sie ist die
  // dringendere, und ein frisches Thema käme in der nächsten Runde ohnehin.
  const reserviert = anzahl >= 2 && frisch.length > 0 ? 1 : 0;

  const gewaehlt = bekannt.slice(0, anzahl - reserviert).map((e) => e.id);
  // Neues auffüllen – höchstens bis zum Takt und höchstens bis zur Anzahl.
  for (const e of frisch.slice(0, neuesLimit)) {
    if (gewaehlt.length >= anzahl) break;
    gewaehlt.push(e.id);
  }
  // Reichte der Takt nicht, um die reservierte Stelle zu besetzen, wird sie
  // mit einem weiteren bekannten Thema gefüllt – eine kürzere Runde ist
  // besser als eine leere.
  if (gewaehlt.length < anzahl && reserviert > 0) {
    for (const e of bekannt.slice(anzahl - reserviert)) {
      if (gewaehlt.length >= anzahl) break;
      gewaehlt.push(e.id);
    }
  }

  return gewaehlt;
}

/**
 * Baut eine Session für ein Zeitbudget.
 *
 * Alles entsteht auf dem Gerät: zuerst aus dem Vorrat (fertige, geprüfte
 * Aufgaben), dann – wenn der nicht reicht – direkt aus dem eingebauten
 * Bestand. Es gibt keinen Netzaufruf und keine Wartezeit; die einzige
 * Verzögerung ist die Rechenzeit der Engine, und die liegt im
 * Millisekundenbereich.
 *
 * Das Budget wird zu rund 90 % gefüllt. Der Timer ordnet die Sitzung nur ein
 * – er ist kein hartes Limit. Wer zügig ist, hat Luft; wer grübelt, wird
 * nicht mitten in einer Aufgabe abgeschnitten.
 */
export async function baueSession(
  budget: Zeitbudget,
  bereichFilter?: ExamArea,
): Promise<Task[]> {
  const zielSekunden = budget.minuten * 60 * 0.9;
  const auswahl: Task[] = [];
  const bekannt = new Set(holeAlleAufgaben().map((t) => t.proposal.prompt));
  const schonInSitzung = new Set<string>();
  let budgetSekunden = zielSekunden;

  // 1. Aus dem Vorrat nehmen – in einem Zug.
  const vorrat = bereichFilter
    ? holeVorrat().filter((t) => t.proposal.examArea === bereichFilter)
    : holeVorrat();
  for (const t of vorrat) {
    if (budgetSekunden <= 0) break;
    if (schonInSitzung.has(t.proposal.prompt)) continue;
    auswahl.push(t);
    schonInSitzung.add(t.proposal.prompt);
    budgetSekunden -= t.proposal.estimatedSeconds;
  }

  // 2. Reicht der Vorrat nicht, die gewählten Themen direkt aufbereiten.
  if (budgetSekunden > 0) {
    const themenAnzahl = Math.max(3, Math.min(6, Math.round(budget.minuten / 2.5)));
    const themen = await waehleThemen(themenAnzahl, bereichFilter);

    for (const topicId of themen) {
      if (budgetSekunden <= 0) break;
      const atom = holeAtom(topicId);
      if (!atom) continue;
      for (const t of seedAufgabenFuerAtom(atom)) {
        if (budgetSekunden <= 0) break;
        if (schonInSitzung.has(t.proposal.prompt)) continue;
        if (bekannt.has(t.proposal.prompt)) continue; // Keine Wiederholung aus früheren Sitzungen.
        if (t.proposal.estimatedSeconds > budgetSekunden) continue;
        auswahl.push(t);
        schonInSitzung.add(t.proposal.prompt);
        budgetSekunden -= t.proposal.estimatedSeconds;
      }
    }
  }

  // 3. Letzte Stufe: ein breiter Durchgang über alle Themen des Bereichs.
  //    Nötig, wenn die gewählten Themen schon durchgearbeitet sind – eine
  //    Sitzung mit wenigen Aufgaben wäre besser als keine, aber eine volle
  //    ist besser als eine kurze.
  if (auswahl.length === 0 || budgetSekunden > zielSekunden * 0.5) {
    const themenIds = bereichFilter
      ? ATOME.filter((a) => a.bereich === bereichFilter).map((a) => a.id)
      : ATOME.map((a) => a.id);
    const seed = seedAufgabenFuerAtome(
      themenIds.map((id) => holeAtom(id)).filter((a): a is Atom => Boolean(a)),
    );
    for (const t of seed) {
      if (budgetSekunden <= 0) break;
      if (schonInSitzung.has(t.proposal.prompt)) continue;
      if (t.proposal.estimatedSeconds > budgetSekunden) continue;
      auswahl.push(t);
      schonInSitzung.add(t.proposal.prompt);
      budgetSekunden -= t.proposal.estimatedSeconds;
    }
  }

  markiereBenutzt(auswahl.map((t) => t.taskId));
  return auswahl;
}

export function startSitzung(tasks: Task[], budget: Sitzungsbudget, mode: Session['mode']): Session {
  const sitzung: Session = {
    sessionId: `s_${Date.now().toString(36)}`,
    mode,
    budgetSeconds: budget.minuten * 60,
    startedAt: new Date().toISOString(),
    endedAt: null,
    taskIds: tasks.map((t) => t.taskId),
  };
  halteSitzung(sitzung, tasks, budget);
  void storage.sitzungStarten(sitzung);
  return sitzung;
}

/**
 * Verbucht eine Antwort: schreibt den Versuch, aktualisiert den Lernzustand
 * und legt den nächsten Termin fest. Jede Zeile landet sofort im Speicher –
 * ein Absturz verliert nichts.
 */
export async function verbucheAntwort(params: {
  task: Task;
  korrekt: boolean;
  sicherheit: 'sicher' | 'geraten' | 'unsicher' | null;
  zeitMs: number;
  sessionId: string | null;
}): Promise<TopicStateRecord[]> {
  const jetzt = new Date();
  const { task, korrekt, sicherheit, zeitMs, sessionId } = params;

  await storage.protokolliereVersuch({
    attemptId: `a_${task.taskId}_${jetzt.getTime().toString(36)}`,
    taskId: task.taskId,
    sessionId,
    topicIds: task.proposal.topicIds,
    examArea: task.proposal.examArea,
    correct: korrekt,
    partialCredit: korrekt ? 1 : 0,
    timeSpentMs: zeitMs,
    sicherheit,
    fehlerklasse: korrekt
      ? 'keine'
      : task.proposal.stufe >= 4
        ? 'rechnen'
        : 'wissen',
    factVersion: task.factVersion,
    ruleVersion: task.ruleVersion,
    engineVersion: task.engineVersion,
    createdAt: jetzt.toISOString(),
  });

  const aktualisiert: TopicStateRecord[] = [];
  for (const topicId of task.proposal.topicIds) {
    const alt = (await storage.leseZustand(topicId)) ?? leererZustand(topicId);
    const neu = wendeVersuchAn(
      alt,
      { type: korrekt ? 'richtig' : 'falsch', sicherheit },
      jetzt,
    );
    const faelligkeit = berechneNaechsteFaelligkeit(neu.state, jetzt);
    const mitTermin = { ...neu, nextDue: faelligkeit?.toISOString() ?? null };
    await storage.schreibeZustand(mitTermin);
    aktualisiert.push(mitTermin);
  }
  return aktualisiert;
}
