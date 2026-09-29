import { entschluessle, istHuelle, verschluessle } from '../crypto/krypto.ts';
import { normalisiereStand, type SyncStand } from './typen.ts';
import type { SyncVerbindung } from './verbindung.ts';

/**
 * Der Weg zum Server.
 *
 * Ein Grundsatz: **Der Worker sieht nur Chiffre.** Was hier hineingeht, ist
 * bereits mit dem Passwort verschlüsselt; was zurückkommt, wird erst auf dem
 * Gerät wieder lesbar. Der Server kann also nichts auswerten, nichts
 * weitergeben und nichts an einen Betreiber melden – er bewahrt einen
 * Datenblock auf, mehr nicht. Deshalb braucht diese Schicht auch kein
 * Vertrauen: Selbst ein Zugriff auf die abgelegten Daten zeigt nur Salz, IV
 * und Chiffretext.
 *
 * Fehler werden hier in **Grund + nächster Schritt** übersetzt. Ein nacktes
 * „Netzwerkfehler" hilft niemandem: Ob die Adresse falsch ist, der Worker
 * noch nicht veröffentlicht wurde oder das Passwort nicht passt, verlangt
 * vier verschiedene Reaktionen.
 */

export interface SyncFehler {
  grund: string;
  naechsterSchritt: string;
}

export class SyncNichtMoeglich extends Error {
  readonly grund: string;
  readonly naechsterSchritt: string;

  constructor(fehler: SyncFehler) {
    super(fehler.grund);
    this.name = 'SyncNichtMoeglich';
    this.grund = fehler.grund;
    this.naechsterSchritt = fehler.naechsterSchritt;
  }
}

/** Der Pfad zum eigenen Fach. Kennung als Pfadsegment, keine Abfrageparameter. */
export function syncAdresse(verbindung: Pick<SyncVerbindung, 'workerUrl' | 'kennung'>): string {
  return `${verbindung.workerUrl.replace(/\/+$/, '')}/v1/sync/${encodeURIComponent(verbindung.kennung)}`;
}

/**
 * Übersetzt einen fehlgeschlagenen Aufruf in eine Handlungsanweisung.
 *
 * Die Statuscodes sind bewusst einzeln behandelt. Sie treten bei der
 * Einrichtung in einer festen Reihenfolge auf – erst die Adresse, dann die
 * Herkunft, dann die Datenmenge –, und man soll nicht raten müssen, an
 * welcher Stelle man steht.
 */
function deuteStatus(status: number, text: string): SyncFehler {
  switch (status) {
    case 400:
      return {
        grund: 'Der Worker hat die Anfrage abgelehnt (400).',
        naechsterSchritt: 'Prüfe, ob die Adresse auf den Worker zeigt und nicht auf die Webseite.',
      };
    case 401:
    case 403:
      return {
        grund: 'Der Worker erlaubt diese Adresse nicht (403).',
        naechsterSchritt:
          'Trage im Worker bei ERLAUBTE_HERKUNFT deine Seitenadresse ein – oder lasse die Variable leer.',
      };
    case 404:
      // Tritt nur beim Schreiben oder Löschen auf. Beim Lesen bedeutet 404
      // „hier liegt noch nichts" – und das ist kein Fehler, sondern der
      // Normalfall beim ersten Gerät.
      return {
        grund: 'Der Worker kennt die Sync-Route nicht (404).',
        naechsterSchritt:
          'Der Worker muss nach dem Update neu veröffentlicht werden – die Sync-Funktion ist neu.',
      };
    case 413:
      return {
        grund: 'Der Lernstand ist für ein einzelnes Fach zu groß (413).',
        naechsterSchritt: 'Entferne alte Versuche in den Einstellungen oder nutze den Datei-Export.',
      };
    case 429:
      return {
        grund: 'Zu viele Abgleiche in kurzer Zeit (429).',
        naechsterSchritt: 'Warte eine Minute und versuche es erneut.',
      };
    default:
      return {
        grund: `Abgleich fehlgeschlagen (${status})${text ? `: ${text.slice(0, 160)}` : ''}`,
        naechsterSchritt: 'Später erneut versuchen. Der Lernstand auf diesem Gerät bleibt erhalten.',
      };
  }
}

async function ruf(
  verbindung: SyncVerbindung,
  methode: 'GET' | 'PUT' | 'DELETE',
  koerper?: string,
  signal?: AbortSignal,
  /** 404 durchreichen statt zu werfen – nur beim Lesen sinnvoll. */
  erlaube404 = false,
): Promise<{ status: number; text: string }> {
  let antwort: Response;
  try {
    antwort = await fetch(syncAdresse(verbindung), {
      method: methode,
      headers: koerper ? { 'Content-Type': 'application/json' } : undefined,
      body: koerper,
      signal,
    });
  } catch (fehler) {
    if (fehler instanceof DOMException && fehler.name === 'AbortError') throw fehler;
    throw new SyncNichtMoeglich({
      grund: 'Der Worker ist nicht erreichbar.',
      naechsterSchritt:
        'Prüfe die Adresse im Browser und ob du gerade online bist. Ohne Verbindung läuft alles weiter – der Abgleich holt es später nach.',
    });
  }

  const text = await antwort.text();
  if (!antwort.ok && !(erlaube404 && antwort.status === 404)) {
    throw new SyncNichtMoeglich(deuteStatus(antwort.status, text));
  }
  return { status: antwort.status, text };
}

/**
 * Liest den Stand vom Server.
 *
 * `null` bedeutet: dort liegt noch nichts. Das ist kein Fehler, sondern der
 * Normalfall beim ersten Gerät – und der Grund, warum diese Funktion nicht
 * wirft, wenn das Fach leer ist.
 */
export async function holeFerne(
  verbindung: SyncVerbindung,
  signal?: AbortSignal,
): Promise<SyncStand | null> {
  // 404 heißt hier „es liegt noch nichts in diesem Fach" – nicht „falsche
  // Adresse". Ein leerer erster Abgleich muss deshalb durchlaufen und den
  // lokalen Stand hochladen, statt an einem vermeintlichen Fehler zu hängen.
  const { status, text } = await ruf(verbindung, 'GET', undefined, signal, true);
  if (status === 404 || status === 204 || text.trim() === '') return null;

  let huelle: unknown;
  try {
    huelle = JSON.parse(text);
  } catch {
    throw new SyncNichtMoeglich({
      grund: 'Der Server hat etwas anderes zurückgegeben als einen Lernstand.',
      naechsterSchritt: 'Prüfe, ob die Adresse auf den Worker zeigt und nicht auf eine Webseite.',
    });
  }
  if (!istHuelle(huelle)) {
    throw new SyncNichtMoeglich({
      grund: 'Die abgelegten Daten haben nicht das erwartete Format.',
      naechsterSchritt: 'Lösche das Fach im Worker (Trennen) und lade neu hoch.',
    });
  }

  let klartext: string;
  try {
    klartext = await entschluessle(huelle, verbindung.passwort);
  } catch {
    throw new SyncNichtMoeglich({
      grund: 'Das Passwort passt nicht zu den abgelegten Daten.',
      naechsterSchritt:
        'Gib dasselbe Passwort ein wie auf dem anderen Gerät. Vergessene Passwörter lassen sich nicht zurücksetzen.',
    });
  }

  try {
    return normalisiereStand(JSON.parse(klartext));
  } catch {
    throw new SyncNichtMoeglich({
      grund: 'Der Lernstand ließ sich nicht lesen.',
      naechsterSchritt: 'Nichts überschreiben – bitte den Datei-Export als Sicherung nutzen.',
    });
  }
}

/** Schreibt den Stand. Ein vorhandener Stand wird ersetzt. */
export async function schreibeFerne(verbindung: SyncVerbindung, stand: SyncStand): Promise<void> {
  const huelle = await verschluessle(JSON.stringify(stand), verbindung.passwort);
  await ruf(verbindung, 'PUT', JSON.stringify(huelle));
}

/**
 * Löscht den abgelegten Stand.
 *
 * Nur auf ausdrücklichen Wunsch und mit derselben Wirkung wie das Löschen im
 * Browser: Die Lerndaten sind danach weg, und kein Gerät holt sie zurück.
 * Der lokale Stand bleibt unangetastet – wer das Fach auf dem Server löscht,
 * will meist nur aufhören zu synchronisieren, nicht verlieren, was hier liegt.
 */
export async function loescheFerne(verbindung: SyncVerbindung): Promise<void> {
  await ruf(verbindung, 'DELETE');
}
