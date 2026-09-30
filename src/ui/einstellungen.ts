/**
 * Einstellungen.
 *
 * Alles liegt im Browser. Es gibt keinen Server, keinen Account und keine
 * Synchronisation – außer derjenigen, die der Nutzer ausdrücklich aktiviert.
 */

import {
  DIRECT_GROQ_URL,
  EINGEBAUTER_SCHLUESSEL,
  STANDARD_MODELL,
  type AiEinstellungen,
} from '../ai/client.ts';
import {
  entschluessle,
  istHuelle,
  KRYPTO_FORMAT,
  verschluessle,
} from '../crypto/krypto.ts';

const SCHLUESSEL = 'egt-einstellungen';

export interface Einstellungen {
  /** Optionaler eigener Schlüssel. Ohne ihn gilt der eingebaute. */
  groqKey: string;
  modelle: string[];
  /** KI-Aufgaben erzeugen lassen. */
  kiAktiv: boolean;
  /** Zweitprüfung durch ein zweites Modell – kostet Zeit, spart Fehler. */
  zweitpruefung: boolean;
  /**
   * Wie viele Aufgaben im Hintergrund bereitliegen sollen.
   *
   * Ein Vorrat macht den Start einer Runde schnell, kostet aber beim ersten
   * Öffnen Anfragen. Wer sein Kontingent schonen will, stellt hier kleiner.
   */
  vorrat: number;
  /** Prüfungstermine überschreiben, falls die IHK sie ändert. */
  pruefungsdatumSchriftlich: string;
  pruefungsdatumPraktisch: string;
  /** Eigenen Korrekturhinweis der KI geben. */
  eigenerCoachHinweis: string;
  /** Erinnerung an die tägliche Session. */
  taeglicheErinnerung: boolean;
}

export const STANDARDEINSTELLUNGEN: Einstellungen = {
  groqKey: EINGEBAUTER_SCHLUESSEL,
  modelle: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
  kiAktiv: true,
  zweitpruefung: true,
  vorrat: 10,
  pruefungsdatumSchriftlich: '2027-05-11',
  pruefungsdatumPraktisch: '2027-06-07',
  eigenerCoachHinweis: '',
  taeglicheErinnerung: false,
};

export function holeEinstellungen(): Einstellungen {
  if (typeof localStorage === 'undefined') return STANDARDEINSTELLUNGEN;
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return STANDARDEINSTELLUNGEN;
    const geparst = JSON.parse(roh) as Partial<Einstellungen>;
    return { ...STANDARDEINSTELLUNGEN, ...geparst };
  } catch {
    return STANDARDEINSTELLUNGEN;
  }
}

export function speichereEinstellungen(einstellungen: Einstellungen): void {
  localStorage.setItem(SCHLUESSEL, JSON.stringify(einstellungen));
}

/** Ist die KI überhaupt nutzbar? Sonst stellt sie keine Aufgaben. */
export function kiBereit(einstellungen: Einstellungen): boolean {
  return einstellungen.kiAktiv;
}

/**
 * Übersetzt die Seiteneinstellungen in die Einstellungen der KI-Schicht.
 *
 * Es gibt bewusst zwei Typen: Die Seite kennt Formularfelder, die KI-Schicht
 * nur, was sie zum Aufrufen braucht. Die Umrechnung steht an einer Stelle –
 * sonst müsste jeder Aufruf wissen, welches Feld wohin gehört, und ein
 * umbenanntes Feld bräche die KI an mehreren Stellen gleichzeitig.
 */
export function aiEinstellungenAus(einstellungen: Einstellungen): AiEinstellungen {
  return {
    proxyUrl: DIRECT_GROQ_URL,
    apiKey: einstellungen.groqKey.trim() || EINGEBAUTER_SCHLUESSEL,
    modell: einstellungen.modelle[0] ?? STANDARD_MODELL,
    aktiv: kiBereit(einstellungen),
    zweitpruefung: einstellungen.zweitpruefung,
    zweitModell: einstellungen.modelle[1],
  };
}

/**
 * Verschlüsselter Export.
 *
 * Der Export enthält Lernstand, Versuche und Einstellungen – also Daten, die
 * niemand außer dir sehen sollten. Ohne Passwort wird er gar nicht erst
 * angeboten.
 */
export interface ExportPaket {
  formatVersion: 1;
  erstelltAm: string;
  einstellungen: Omit<Einstellungen, 'groqKey'>;
  zustaende: unknown;
  versuche: unknown;
  sitzungen: unknown;
  ergebnisse: unknown;
  pruefsumme: string;
}

/** Ein Backup enthält den Schlüssel nicht – er steht im Quellcode. */
export type ExportEinstellungen = Omit<Einstellungen, 'groqKey'>;

export async function erzeugeExport(
  daten: Omit<ExportPaket, 'formatVersion' | 'erstelltAm' | 'pruefsumme'>,
  passwort: string,
): Promise<string> {
  const huelle = await verschluessle(JSON.stringify(daten), passwort);
  // Reihenfolge der Felder wie bisher: Ein alter Export bleibt lesbar, und
  // ein neuer ist mit einer älteren Fassung der App ebenfalls lesbar – beide
  // Seiten benutzen dieselbe Krypto aus `src/crypto/krypto.ts`.
  return JSON.stringify({
    formatVersion: KRYPTO_FORMAT,
    erstelltAm: new Date().toISOString(),
    salt: huelle.salt,
    iv: huelle.iv,
    pruefsumme: huelle.pruefsumme,
    daten: huelle.daten,
  });
}

export async function leseExport(
  text: string,
  passwort: string,
): Promise<Omit<ExportPaket, 'formatVersion' | 'erstelltAm' | 'pruefsumme'>> {
  const huelle: unknown = JSON.parse(text);
  if (!istHuelle(huelle)) {
    throw new Error('Das ist keine Backup-Datei dieses Trainers.');
  }
  const klartext = await entschluessle(huelle, passwort);
  return JSON.parse(klartext) as Omit<ExportPaket, 'formatVersion' | 'erstelltAm' | 'pruefsumme'>;
}
