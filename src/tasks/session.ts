import type { Task, Session, TopicStateRecord } from '../domain/types.ts';
import { berechneNaechsteFaelligkeit, leererZustand, wendeVersuchAn } from '../domain/stateMachine.ts';
import { statischeGrundaufgaben } from './generator.ts';
import { holeAufgaben } from './ablage.ts';
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

  // Erst im statischen Vorrat suchen, dann in der lokalen Ablage – dort liegen
  // die vom Modell erzeugten Aufgaben.
  const nachId = new Map(statischeGrundaufgaben().map((t) => [t.taskId, t]));
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

/** Aufgaben nach geschätztem Aufwand gruppiert. */
function gruppiere(nachStufe: (stufe: 1 | 2 | 3 | 4 | 5) => Task[]): Task[][] {
  return [1, 2, 3, 4, 5].map((s) => nachStufe(s as 1 | 2 | 3 | 4 | 5));
}

/**
 * Baut eine Session für ein Zeitbudget.
 *
 * Zusammensetzung:
 *   – zuerst Themen, die fällig sind ("vergessen" zuerst)
 *   – dann neue Aufgaben der kurzen Stufen, bis das Budget aufgebraucht ist
 *   – zuletzt Rechenaufgaben, wenn noch Zeit übrig ist
 */
export async function baueSession(budget: Zeitbudget): Promise<Task[]> {
  const zustaende = new Map((await storage.alleZustaende()).map((z) => [z.topicId, z]));
  const heute = new Date();

  const faellig = (t: Task): boolean => {
    for (const id of t.proposal.topicIds) {
      const z = zustaende.get(id);
      if (!z) return false;
      if (!z.nextDue) continue;
      if (new Date(z.nextDue) <= heute) return true;
    }
    return false;
  };

  const vergessen = (t: Task): boolean =>
    t.proposal.topicIds.some((id) => zustaende.get(id)?.state === 'ueberfaellig');

  // Kandidaten sammeln. Doppelte Parameter werden von der Pipeline abgewiesen –
  // deshalb wird hier defensiv gefiltert.
  let pool: Task[] = [];
  for (let versuch = 0; versuch < 3 && pool.length < 6; versuch += 1) {
    try {
      pool = statischeGrundaufgaben();
      break;
    } catch {
      pool = [];
    }
  }

  const sortiert = [...pool].sort((a, b) => {
    const aVergessen = vergessen(a) ? 0 : 1;
    const bVergessen = vergessen(b) ? 0 : 1;
    if (aVergessen !== bVergessen) return aVergessen - bVergessen;
    const aFaellig = faellig(a) ? 0 : 1;
    const bFaellig = faellig(b) ? 0 : 1;
    if (aFaellig !== bFaellig) return aFaellig - bFaellig;
    return a.proposal.stufe - b.proposal.stufe;
  });

  const [stufe1 = [], stufe2 = [], stufe3 = [], stufe4 = [], stufe5 = []] = gruppiere((s) =>
    sortiert.filter((t) => t.proposal.stufe === s),
  );

  const auswahl: Task[] = [];
  let budgetSekunden = budget.minuten * 60;
  const nimm = (kandidaten: Task[], maxAnzahl: number): void => {
    for (const t of kandidaten) {
      if (auswahl.length >= maxAnzahl) return;
      if (t.proposal.estimatedSeconds > budgetSekunden) continue;
      auswahl.push(t);
      budgetSekunden -= t.proposal.estimatedSeconds;
    }
  };

  switch (budget.minuten) {
    case 5:
      nimm(stufe1, 5);
      break;
    case 10:
      nimm(stufe1, 5);
      nimm(stufe2, 2);
      break;
    case 20:
      nimm(stufe1, 6);
      nimm(stufe2, 3);
      nimm(stufe3, 1);
      break;
    case 30:
      nimm(stufe1, 6);
      nimm(stufe2, 3);
      nimm(stufe3, 1);
      nimm(stufe4, 1);
      break;
    case 45:
      nimm(stufe1, 6);
      nimm(stufe2, 3);
      nimm(stufe3, 2);
      nimm(stufe4, 2);
      nimm(stufe5, 1);
      break;
  }

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
