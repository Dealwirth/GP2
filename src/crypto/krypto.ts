/**
 * Verschlüsselung – an einer Stelle.
 *
 * Zwei Dinge in dieser Anwendung müssen mit einem Passwort geschützt werden,
 * und beide brauchen exakt dieselbe Mechanik:
 *
 *  1. der **Backup-Export** (eine Datei, die man weitergibt),
 *  2. die **Synchronisation** (ein Datenblock, der auf einem fremden Server
 *     liegt).
 *
 * Vorher stand die Krypto beim Export. Sie hierher zu ziehen hat einen Grund,
 * der über Aufräumen hinausgeht: Beide Wege müssen dasselbe Format lesen
 * können. Wäre das zweimal geschrieben, könnte ein Update den einen Weg
 * verändern und den anderen stillschweigend unlesbar machen – genau der
 * Fehler, der die Lerndaten kosten würde.
 *
 * Verfahren: PBKDF2-SHA-256 mit 150 000 Runden und 16 Byte Salz leitet einen
 * AES-256-GCM-Schlüssel ab. GCM authentifiziert zusätzlich, ein verfälschter
 * Datenblock fällt also beim Entschlüsseln auf. Zusätzlich wird eine
 * SHA-256-Prüfsumme des **Klartexts** mitgeführt: Das ist keine Sicherheit,
 * sondern eine Diagnose – sie unterscheidet „falsches Passwort" von
 * „beschädigter Datei", und GCM allein kann das nicht.
 */

export interface Huellen {
  formatVersion: number;
  salt: string;
  iv: string;
  pruefsumme: string;
  daten: string;
}

/** Aktuelles Format. Bleibt 1, solange sich Salz-, IV- und Datenlänge nicht ändern. */
export const KRYPTO_FORMAT = 1;

export function toBase64(bytes: Uint8Array): string {
  let binaer = '';
  for (const byte of bytes) binaer += String.fromCharCode(byte);
  return btoa(binaer);
}

export function vonBase64(text: string): Uint8Array {
  const binaer = atob(text);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i += 1) bytes[i] = binaer.charCodeAt(i);
  return bytes;
}

/** Leitet den Schlüssel ab. Absichtlich langsam – das ist der Schutz gegen Raten. */
export async function schluesselAusPasswort(passwort: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passwort),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 150_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function pruefsumme(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource)));
}

/** Verschlüsselt Klartext zu einer Hülle, die als JSON abgelegt werden kann. */
export async function verschluessle(klartext: string, passwort: string): Promise<Huellen> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const schluessel = await schluesselAusPasswort(passwort, salt);
  const chiffre = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    schluessel,
    new TextEncoder().encode(klartext) as BufferSource,
  );

  return {
    formatVersion: KRYPTO_FORMAT,
    salt: toBase64(salt),
    iv: toBase64(iv),
    pruefsumme: await pruefsumme(klartext),
    daten: toBase64(new Uint8Array(chiffre)),
  };
}

/** Prüft, ob ein beliebiger Wert die Form einer Hülle hat. */
export function istHuelle(wert: unknown): wert is Huellen {
  if (!wert || typeof wert !== 'object') return false;
  const h = wert as Record<string, unknown>;
  return (
    typeof h.salt === 'string' &&
    typeof h.iv === 'string' &&
    typeof h.daten === 'string' &&
    typeof h.pruefsumme === 'string'
  );
}

/**
 * Entschlüsselt eine Hülle.
 *
 * Die Fehlermeldungen sind hier bewusst nach Ursache getrennt: „falsches
 * Passwort" und „Daten beschädigt" verlangen zwei völlig verschiedene
 * Reaktionen, und wer nur „Fehler" liest, versucht das Falsche.
 */
export async function entschluessle(huelle: Huellen, passwort: string): Promise<string> {
  const salt = vonBase64(huelle.salt);
  const schluessel = await schluesselAusPasswort(passwort, salt);

  let klartext: string;
  try {
    const koerper = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: vonBase64(huelle.iv) as BufferSource },
      schluessel,
      vonBase64(huelle.daten) as BufferSource,
    );
    klartext = new TextDecoder().decode(koerper);
  } catch {
    throw new Error('Passwort falsch oder Daten beschädigt.');
  }

  if ((await pruefsumme(klartext)) !== huelle.pruefsumme) {
    throw new Error('Prüfsumme stimmt nicht – Passwort falsch oder Daten beschädigt.');
  }
  return klartext;
}
