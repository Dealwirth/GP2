import type { Quelle } from '../../domain/types.ts';

/**
 * Die Quellen, auf die sich die Faktenbasis stützt.
 *
 * Jeder Fakt verweist über `quelleId` hierher. Wo eine Norm kostenpflichtig
 * ist (VDE/DIN), steht die Verlagsseite als Bezugsnachweis; wo eine amtliche
 * Quelle frei zugänglich ist (Gesetze, DGUV, BAuA), steht der Direktlink.
 *
 * `geprueft` bedeutet: Titel, Kennung und Bezugsweg wurden am Original
 * abgeglichen (Abruf siehe `abgerufen`). Nicht geprüfte Quellen tragen
 * `geprueft: false` und werden im Bericht ausgewiesen.
 */
const ABGERUFEN = '2026-09-30';

export interface QuelleNachweis extends Quelle {
  /** true, wenn Titel, Kennung und Bezugsweg am Original geprüft wurden. */
  geprueft: boolean;
}

export const QUELLEN: Record<string, QuelleNachweis> = {
  elekausbv: {
    id: 'elekausbv',
    titel: 'Verordnung über die Berufsausbildung zum Elektroniker und zur Elektronikerin (ElekAusbV)',
    herausgeber: 'Bundesministerium für Wirtschaft und Klimaschutz',
    kennung: 'BGBl. I 2021 S. 662, 699 – Art. 4',
    ausgabe: '30.03.2021, gültig ab 01.08.2021',
    url: 'https://www.gesetze-im-internet.de/elekausbv/',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  vde0100: {
    id: 'vde0100',
    titel: 'Errichten von Niederspannungsanlagen',
    herausgeber: 'DIN VDE / VDE Verlag',
    kennung: 'DIN VDE 0100-410:2018-10, DIN VDE 0100-600:2017-06, DIN VDE 0100-100,-200,-430,-510,-701,-702,-710',
    ausgabe: 'Reihe DIN VDE 0100, Einzelteile mit eigenem Ausgabedatum',
    url: 'https://vde-verlag.de/p/normen/din-vde-0100-600-vde-0100-600-2017-06/0100382-DE-PR',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  vde0105: {
    id: 'vde0105',
    titel: 'Betrieb von elektrischen Anlagen – Teil 100: Allgemeine Festlegungen',
    herausgeber: 'DIN VDE / VDE Verlag',
    kennung: 'DIN VDE 0105-100:2015-10 (enthält EN 50110-1:2013), Änderung A1:2017-06',
    ausgabe: '2015-10',
    url: 'https://www.dinmedia.de/de/norm/din-vde-0105-100/238330555',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  vde0298: {
    id: 'vde0298',
    titel: 'Verwendung von Kabeln und isolierten Leitungen für Starkstromanlagen – Strombelastbarkeit',
    herausgeber: 'DIN VDE / VDE Verlag',
    kennung: 'DIN VDE 0298-4:2013-06 (Neufassung 2023-06)',
    ausgabe: '2013-06',
    url: 'https://www.dinmedia.de/de/norm/din-vde-0298-4/180878163',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  vde0701: {
    id: 'vde0701',
    titel: 'Prüfung nach Instandsetzung, Änderung elektrischer Geräte – Wiederholungsprüfung elektrischer Geräte',
    herausgeber: 'DIN VDE / VDE Verlag',
    kennung: 'DIN VDE 0701-0702:2008-06',
    ausgabe: '2008-06',
    url: 'https://vde-verlag.de/p/normen/din-vde-0701-0702-vde-0701-0702-2008-06/0701018-DE-PR',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  trbs1201: {
    id: 'trbs1201',
    titel: 'Prüfungen und Kontrollen von Arbeitsmitteln und überwachungsbedürftigen Anlagen (TRBS 1201)',
    herausgeber: 'Bundesanstalt für Arbeitsschutz und Arbeitsmedizin (BAuA), Ausschuss für Betriebssicherheit',
    kennung: 'TRBS 1201, Ausgabe März 2019, GMBl 2019 S. 229, zuletzt geändert GMBl 2025 S. 702',
    ausgabe: '2019-03',
    url: 'https://www.baua.de/DE/Angebote/Regelwerk/TRBS/TRBS-1201',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  dguv3: {
    id: 'dguv3',
    titel: 'Elektrische Anlagen und Betriebsmittel (Unfallverhütungsvorschrift)',
    herausgeber: 'Deutsche Gesetzliche Unfallversicherung (DGUV)',
    kennung: 'DGUV Vorschrift 3, Ausgabe April 1979, Fassung Januar 1997',
    ausgabe: '1997-01',
    url: 'https://publikationen.dguv.de/regelwerk/dguv-vorschriften/1052/elektrische-anlagen-und-betriebsmittel',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  dguv203072: {
    id: 'dguv203072',
    titel: 'Wiederkehrende Prüfungen elektrischer Anlagen und ortsfester Betriebsmittel – Fachwissen für Prüfpersonen',
    herausgeber: 'Deutsche Gesetzliche Unfallversicherung (DGUV)',
    kennung: 'DGUV Information 203-072 (Webcode p203072)',
    ausgabe: '2021-04',
    url: 'https://publikationen.dguv.de/regelwerk/dguv-informationen/2879/wiederkehrende-pruefungen-elektrischer-anlagen-und-ortsfester-betriebsmittel-fachwissen-fuer-pruefper',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  betrsichv: {
    id: 'betrsichv',
    titel: 'Verordnung über Sicherheit und Gesundheitsschutz bei der Verwendung von Arbeitsmitteln (Betriebssicherheitsverordnung – BetrSichV)',
    herausgeber: 'Bundesministerium der Justiz / Bundesamt für Justiz',
    kennung: 'BetrSichV, insbesondere § 14 (Prüfung von Arbeitsmitteln)',
    ausgabe: '2015, zuletzt geändert 2021',
    url: 'https://www.gesetze-im-internet.de/betrsichv_2015/__14.html',
    abgerufen: ABGERUFEN,
    geprueft: true,
  },
  schultabelle: {
    id: 'schultabelle',
    titel: 'Strombelastbarkeitstabelle nach Berufsschul-/ZVEH-Systematik',
    herausgeber: 'ZVEH / Berufsschule',
    kennung: 'vereinfachte Absicherungswerte (kein Normwert)',
    ausgabe: null,
    url: null,
    abgerufen: ABGERUFEN,
    geprueft: false,
  },
};

/** Anzahl der am Original geprüften Quellen – für den Bericht. */
export function quellenBericht(): { gesamt: number; geprueft: number; offeneIds: string[] } {
  const alle = Object.values(QUELLEN);
  const offen = alle.filter((q) => !q.geprueft);
  return {
    gesamt: alle.length,
    geprueft: alle.length - offen.length,
    offeneIds: offen.map((q) => q.id),
  };
}
