/**
 * Einstellungen.
 *
 * Alles liegt im Browser. Es gibt keinen Server, keinen Account und keine
 * Synchronisation – außer derjenigen, die der Nutzer ausdrücklich aktiviert.
 */

import {
  entschluessle,
  istHuelle,
  KRYPTO_FORMAT,
  verschluessle,
} from '../crypto/krypto.ts';

const SCHLUESSEL = 'egt-einstellungen';

export interface Einstellungen {
  /**
   * Wie viele Aufgaben im Vorrat bereitliegen sollen.
   *
   * Ein Vorrat macht den Start einer Runde schnell. Da die Aufgaben auf dem
   * Gerät entstehen, kostet er nichts außer etwas Rechenzeit.
   */
  vorrat: number;
  /** Prüfungstermine überschreiben, falls sich die Termine ändern. */
  pruefungsdatumSchriftlich: string;
  pruefungsdatumPraktisch: string;
  /** Erinnerung an die tägliche Session. */
  taeglicheErinnerung: boolean;
}

export const STANDARDEINSTELLUNGEN: Einstellungen = {
  vorrat: 6,
  pruefungsdatumSchriftlich: '2027-05-11',
  pruefungsdatumPraktisch: '2027-06-07',
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
  einstellungen: Einstellungen;
  zustaende: unknown;
  versuche: unknown;
  sitzungen: unknown;
  ergebnisse: unknown;
  pruefsumme: string;
}

export type ExportEinstellungen = Einstellungen;

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
