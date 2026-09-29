import { lies, schreib } from '../ui/persistenz.ts';

/**
 * Die Verbindung zum Speicherort.
 *
 * Was hier liegt und was nicht:
 *
 *  - `workerUrl` – Adresse des eigenen Cloudflare-Workers. Kein Geheimnis.
 *  - `kennung`   – der Name des Faches, in dem dein Stand liegt. Zufällig und
 *                  lang, weil er der einzige Schutz des Ortes ist: Wer ihn
 *                  kennt, findet den verschlüsselten Block.
 *  - `passwort`  – bleibt **auf diesem Gerät**. Es wird nie gesendet. Es ist
 *                  das, was den Block auf dem Server unlesbar macht –
 *                  einschließlich für dich selbst, wenn du es vergisst.
 *
 * Auf dem zweiten Gerät trägt man deshalb zwei Dinge ein: den
 * **Verbindungscode** (enthält Adresse und Kennung, kein Geheimnis) und das
 * **Passwort**.
 */

const SCHLUESSEL = 'sync-verbindung';

export interface SyncVerbindung {
  /** Synchronisation eingeschaltet. Ohne sie passiert nichts. */
  aktiv: boolean;
  /** Endpunkt des Cloudflare-Workers, z. B. https://egt-proxy.max.workers.dev */
  workerUrl: string;
  /** Zufälliger Name des Faches auf dem Server. */
  kennung: string;
  /** Passwort für die Verschlüsselung. Bleibt auf dem Gerät. */
  passwort: string;
  /** Zeitpunkt des letzten erfolgreichen Abgleichs. */
  letzterAbgleich: string | null;
  /** Letzter Fehler in Klartext – damit man weiß, was zu tun ist. */
  letzterFehler: string | null;
}

export const LEERE_VERBINDUNG: SyncVerbindung = {
  aktiv: false,
  workerUrl: '',
  kennung: '',
  passwort: '',
  letzterAbgleich: null,
  letzterFehler: null,
};

/** Erzeugt eine neue, nicht ratbare Kennung. */
export function neueKennung(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function holeVerbindung(): SyncVerbindung {
  const roh = lies<Partial<SyncVerbindung>>(SCHLUESSEL);
  if (!roh || typeof roh !== 'object') return { ...LEERE_VERBINDUNG };
  return {
    ...LEERE_VERBINDUNG,
    ...roh,
    // Ein gespeicherter `aktiv`-Schalter ohne Adresse oder Kennung wäre eine
    // Synchronisation, die still nichts tut. Dann lieber sichtbar aus.
    aktiv: Boolean(roh.aktiv) && Boolean(roh.workerUrl) && Boolean(roh.passwort),
  };
}

export function speichereVerbindung(verbindung: SyncVerbindung): void {
  schreib(SCHLUESSEL, verbindung);
}

export function loescheVerbindung(): void {
  speichereVerbindung({ ...LEERE_VERBINDUNG });
}

/**
 * Prüft die Adresse des Workers.
 *
 * Nur `https`, nur eine echte Adresse, und ohne abschließenden Schrägstrich –
 * sonst entstehen beim Zusammensetzen zwei Schrägstriche und der Aufruf
 * scheitert an einer Kleinigkeit. Ausnahme: `localhost` für die Entwicklung,
 * weil dort kein Zertifikat existiert.
 */
export function pruefeWorkerUrl(url: string): { ok: true; url: string } | { ok: false; grund: string } {
  const sauber = url.trim().replace(/\/+$/, '');
  if (sauber === '') return { ok: false, grund: 'Es fehlt die Adresse des Workers.' };
  let geparst: URL;
  try {
    geparst = new URL(sauber);
  } catch {
    return { ok: false, grund: 'Das ist keine gültige Adresse. Sie beginnt mit https://' };
  }
  const lokal = geparst.hostname === 'localhost' || geparst.hostname === '127.0.0.1';
  if (geparst.protocol !== 'https:' && !lokal) {
    return { ok: false, grund: 'Die Adresse muss mit https:// beginnen.' };
  }
  if (geparst.pathname !== '/' && geparst.pathname !== '') {
    return { ok: false, grund: 'Bitte nur die Adresse ohne Pfad eintragen, z. B. https://name.workers.dev' };
  }
  return { ok: true, url: sauber };
}

// ---------------------------------------------------------------------------
// Verbindungscode
// ---------------------------------------------------------------------------

interface CodeInhalt {
  u: string;
  k: string;
}

function base64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function vonBase64Url(text: string): string {
  const auffuellen = text.replace(/-/g, '+').replace(/_/g, '/');
  return atob(auffuellen + '='.repeat((4 - (auffuellen.length % 4)) % 4));
}

/**
 * Packt Adresse und Kennung in einen Code, den man per Nachricht
 * weitergeben kann.
 *
 * Das Passwort ist bewusst **nicht** enthalten: Ein Code, der das
 * Verschlüsselungspasswort mitbringt, hebt die Verschlüsselung auf – wer die
 * Nachricht abfängt, hätte alles. Getrennte Wege sind hier der ganze Punkt.
 */
export function verbindungscode(verbindung: Pick<SyncVerbindung, 'workerUrl' | 'kennung'>): string {
  const inhalt: CodeInhalt = { u: verbindung.workerUrl, k: verbindung.kennung };
  return `EGT1-${base64Url(JSON.stringify(inhalt))}`;
}

export function ausVerbindungscode(code: string): { workerUrl: string; kennung: string } | null {
  const sauber = code.trim();
  if (!sauber.startsWith('EGT1-')) return null;
  try {
    const inhalt = JSON.parse(vonBase64Url(sauber.slice(5))) as Partial<CodeInhalt>;
    if (typeof inhalt.u !== 'string' || typeof inhalt.k !== 'string') return null;
    if (inhalt.u === '' || inhalt.k === '') return null;
    return { workerUrl: inhalt.u, kennung: inhalt.k };
  } catch {
    return null;
  }
}
