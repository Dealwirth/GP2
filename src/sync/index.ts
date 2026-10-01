import type { Attempt, Session, TopicStateRecord } from '../domain/types.ts';
import type { Pruefungsergebnis } from '../domain/exam/simulation.ts';
import { entschluessle, istHuelle, verschluessle, type Huellen } from '../crypto/krypto.ts';
import { storage } from '../storage/index.ts';
import { ladeErgebnisse, speichereErgebnisse } from '../storage/ergebnisse.ts';

/**
 * Geräteübergreifende Ablage.
 *
 * Das Problem: Der Lernstand liegt im Browser. Wer am Rechner übt und am
 * Telefon weitermachen will, hat zwei getrennte Stände – oder verliert alles,
 * wenn der Browser seine Daten wegräumt.
 *
 * Die Lösung ist bewusst schlicht: ein **privater GitHub-Gist** als Ablage.
 * Kein eigener Server, kein Konto bei uns, keine laufenden Kosten. Der Gist
 * gehört dem Lernenden, liegt in dessen GitHub-Konto und lässt sich dort
 * jederzeit löschen oder einsehen.
 *
 * Zwei Entscheidungen, die man begründen muss:
 *
 *  1. **Verschlüsselt, bevor etwas hochgeht.** Der Gist liegt bei GitHub und
 *     ist dort einsehbar (GitHub-Mitarbeiter, ein kompromittiertes Konto). Der
 *     Inhalt verlässt das Gerät deshalb erst als AES-256-GCM-Chiffre mit
 *     PBKDF2-abgeleitetem Schlüssel – dieselbe Krypto wie der Datei-Export.
 *     Ohne Passwort verlässt nichts das Gerät.
 *  2. **Zusammenführen statt ersetzen.** Beim Abgleich wird vereinigt, nicht
 *     überschrieben. Sonst löschte ein Gerät mit älterem Stand die Fortschritte
 *     des anderen. Der Lernstand hat keine Uhr, die man trauen könnte; deshalb
 *     gilt je Thema der weiter fortgeschrittene Datensatz.
 */

const GIST_API = 'https://api.github.com/gists';
const DATEI = 'egt-lernstand.json';

/** Kennungen des Abgleichs liegen in `localStorage` – klein und ohne Schema. */
const EINSTELLUNG_SCHLUESSEL = 'egt:sync';

export interface SyncEinstellungen {
  /** Fein granuliertes GitHub-Token mit Gists-Berechtigung. */
  token: string;
  /** Kennung des angelegten Gists. Leer = noch keiner vorhanden. */
  gistId: string;
  /** Wann zuletzt abgeglichen wurde (ISO), für die Anzeige. */
  letzterAbgleich: string | null;
}

export const SYNC_STANDARD: SyncEinstellungen = {
  token: '',
  gistId: '',
  letzterAbgleich: null,
};

export function ladeSyncEinstellungen(): SyncEinstellungen {
  try {
    const roh = localStorage.getItem(EINSTELLUNG_SCHLUESSEL);
    if (!roh) return { ...SYNC_STANDARD };
    return { ...SYNC_STANDARD, ...(JSON.parse(roh) as Partial<SyncEinstellungen>) };
  } catch {
    return { ...SYNC_STANDARD };
  }
}

export function speichereSyncEinstellungen(einstellungen: SyncEinstellungen): void {
  try {
    localStorage.setItem(EINSTELLUNG_SCHLUESSEL, JSON.stringify(einstellungen));
  } catch {
    /* Speicher voll oder gesperrt – der Abgleich läuft trotzdem manuell. */
  }
}

/** Der verschlüsselte Inhalt eines Abgleichs. */
export interface SyncInhalt {
  zustaende: TopicStateRecord[];
  versuche: Attempt[];
  sitzungen: Session[];
  ergebnisse: Pruefungsergebnis[];
}

/**
 * Führt zwei Lernstände zusammen.
 *
 * Regel je Thema: Der Datensatz mit mehr beantworteten Aufgaben gewinnt. Das
 * ist grob, aber ehrlich – ein Zeitstempel ließe sich zwischen zwei Geräten
 * nicht verlässlich vergleichen, und „mehr Versuche" heißt in jedem Fall
 * „weiter geübt". Bei Gleichstand gewinnt der lokale Stand, damit ein
 * Abgleich ohne Änderung nichts verschiebt.
 *
 * Versuche, Sitzungen und Ergebnisse tragen eindeutige Kennungen; hier wird
 * schlicht vereinigt. Doppelte Einträge sind dadurch ausgeschlossen.
 */
export function fuehreZusammen(lokal: SyncInhalt, fremd: SyncInhalt): SyncInhalt {
  const nachThema = new Map<string, TopicStateRecord>();
  for (const z of fremd.zustaende) nachThema.set(z.topicId, z);
  for (const z of lokal.zustaende) {
    const alt = nachThema.get(z.topicId);
    if (!alt || z.answered >= alt.answered) nachThema.set(z.topicId, z);
  }

  const vereinige = <T>(a: T[], b: T[], schluessel: (x: T) => string): T[] => {
    const map = new Map<string, T>();
    for (const x of a) map.set(schluessel(x), x);
    for (const x of b) if (!map.has(schluessel(x))) map.set(schluessel(x), x);
    return [...map.values()];
  };

  return {
    zustaende: [...nachThema.values()],
    versuche: vereinige(lokal.versuche, fremd.versuche, (v) => v.attemptId),
    sitzungen: vereinige(lokal.sitzungen, fremd.sitzungen, (s) => s.sessionId),
    ergebnisse: vereinige(lokal.ergebnisse, fremd.ergebnisse, (e) => e.pruefungId),
  };
}

/** Sammelt den hiesigen Lernstand ein. */
export async function sammleStand(): Promise<SyncInhalt> {
  const [zustaende, versuche, sitzungen, ergebnisse] = await Promise.all([
    storage.alleZustaende(),
    storage.versuche(),
    storage.sitzungen(),
    ladeErgebnisse(),
  ]);
  return { zustaende, versuche, sitzungen, ergebnisse };
}

export class SyncFehler extends Error {
  constructor(
    message: string,
    /** HTTP-Status, falls der Fehler von GitHub kam. */
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SyncFehler';
  }
}

function kopf(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** Prüft das Token und liefert den GitHub-Namen – auch eine Diagnose. */
export async function pruefeToken(token: string): Promise<string> {
  const antwort = await fetch('https://api.github.com/user', { headers: kopf(token) });
  if (antwort.status === 401) {
    throw new SyncFehler('Das Token wurde abgelehnt. Ist es richtig kopiert?', 401);
  }
  if (!antwort.ok) {
    throw new SyncFehler(`GitHub antwortete mit ${antwort.status}.`, antwort.status);
  }
  const daten = (await antwort.json()) as { login?: string };
  return daten.login ?? 'unbekannt';
}

/** Liest den verschlüsselten Inhalt eines Gists, falls vorhanden. */
async function holeInhalt(token: string, gistId: string): Promise<Huellen | null> {
  const antwort = await fetch(`${GIST_API}/${gistId}`, { headers: kopf(token) });
  if (antwort.status === 404) return null;
  if (!antwort.ok) throw new SyncFehler(`GitHub antwortete mit ${antwort.status}.`, antwort.status);
  const gist = (await antwort.json()) as {
    files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
  };
  const datei = gist.files?.[DATEI];
  if (!datei) return null;
  let roh = datei.content ?? '';
  // GitHub kürzt große Dateien in der API-Antwort; dann über die Rohadresse.
  if (datei.truncated && datei.raw_url) {
    const rohAntwort = await fetch(datei.raw_url, { headers: kopf(token) });
    if (!rohAntwort.ok) throw new SyncFehler(`Rohdaten nicht lesbar (${rohAntwort.status}).`);
    roh = await rohAntwort.text();
  }
  if (!roh.trim()) return null;
  const geparst: unknown = JSON.parse(roh);
  return istHuelle(geparst) ? geparst : null;
}

/** Legt einen neuen privaten Gist an und gibt seine Kennung zurück. */
async function legeGistAn(token: string, inhalt: Huellen): Promise<string> {
  const antwort = await fetch(GIST_API, {
    method: 'POST',
    headers: { ...kopf(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'EGT-Prüfungstrainer – verschlüsselter Lernstand',
      public: false,
      files: { [DATEI]: { content: JSON.stringify(inhalt) } },
    }),
  });
  if (antwort.status === 403) {
    throw new SyncFehler(
      'Das Token darf keine Gists anlegen. Fehlt die Berechtigung „gist"?',
      403,
    );
  }
  if (!antwort.ok) throw new SyncFehler(`GitHub antwortete mit ${antwort.status}.`, antwort.status);
  const gist = (await antwort.json()) as { id?: string };
  if (!gist.id) throw new SyncFehler('GitHub hat keine Gist-Kennung geliefert.');
  return gist.id;
}

/** Schreibt den verschlüsselten Inhalt in einen vorhandenen Gist. */
async function schreibeGist(token: string, gistId: string, inhalt: Huellen): Promise<void> {
  const antwort = await fetch(`${GIST_API}/${gistId}`, {
    method: 'PATCH',
    headers: { ...kopf(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [DATEI]: { content: JSON.stringify(inhalt) } } }),
  });
  if (antwort.status === 404) {
    throw new SyncFehler('Der Gist existiert nicht mehr. Bitte neu anlegen.', 404);
  }
  if (!antwort.ok) throw new SyncFehler(`GitHub antwortete mit ${antwort.status}.`, antwort.status);
}

export interface AbgleichErgebnis {
  /** Wie viele Themen vom anderen Gerät übernommen wurden. */
  uebernommen: number;
  /** Wie viele Themen vom anderen Gerät kamen insgesamt. */
  fremdeThemen: number;
  /** Stand nach dem Abgleich. */
  stand: SyncInhalt;
  gistId: string;
}

/**
 * Ein vollständiger Abgleich.
 *
 * Ablauf: hiesigen Stand sammeln, verschlüsselt hochladen, den dortigen
 * entschlüsseln, zusammenführen, das Ergebnis zurückschreiben. So steht am
 * Ende auf beiden Geräten dasselbe.
 *
 * Der Gist wird beim ersten Mal angelegt. Ist `gistId` leer und das Token
 * gültig, entsteht er; sonst wird der vorhandene fortgeschrieben.
 */
export async function gleicheAb(
  einstellungen: SyncEinstellungen,
  passwort: string,
): Promise<AbgleichErgebnis> {
  const token = einstellungen.token.trim();
  if (!token) throw new SyncFehler('Kein GitHub-Token eingetragen.');
  if (passwort.length < 8) throw new SyncFehler('Das Passwort muss mindestens 8 Zeichen haben.');

  const lokal = await sammleStand();
  let gistId = einstellungen.gistId.trim();

  // Was liegt drüben? Ohne Gist gibt es nichts zu holen.
  let fremd: SyncInhalt | null = null;
  if (gistId) {
    const huelle = await holeInhalt(token, gistId);
    if (huelle) {
      let klartext: string;
      try {
        klartext = await entschluessle(huelle, passwort);
      } catch {
        throw new SyncFehler(
          'Der Lernstand ließ sich nicht entschlüsseln. Stimmt das Passwort mit dem des anderen Geräts überein?',
        );
      }
      fremd = JSON.parse(klartext) as SyncInhalt;
    }
  }

  const zusammen = fremd ? fuehreZusammen(lokal, fremd) : lokal;
  const huelle = await verschluessle(JSON.stringify(zusammen), passwort);

  if (!gistId) {
    gistId = await legeGistAn(token, huelle);
  } else {
    await schreibeGist(token, gistId, huelle);
  }

  const uebernommen = fremd
    ? zusammen.zustaende.filter((z) => {
        const eigen = lokal.zustaende.find((l) => l.topicId === z.topicId);
        return !eigen || z.answered > eigen.answered;
      }).length
    : 0;

  speichereSyncEinstellungen({
    ...einstellungen,
    gistId,
    letzterAbgleich: new Date().toISOString(),
  });

  return {
    uebernommen,
    fremdeThemen: fremd?.zustaende.length ?? 0,
    stand: zusammen,
    gistId,
  };
}

/** Schreibt einen zusammengeführten Stand in die lokalen Speicher. */
export async function uebernehmeStand(stand: SyncInhalt): Promise<void> {
  for (const z of stand.zustaende) await storage.schreibeZustand(z);
  for (const v of stand.versuche) await storage.protokolliereVersuch(v);
  for (const s of stand.sitzungen) await storage.schreibeSitzung(s);
  await speichereErgebnisse(stand.ergebnisse);
}
