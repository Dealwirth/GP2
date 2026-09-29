import type { Quelle } from '../../domain/types.ts';

const ABGERUFEN = '2026-09-28';

export const QUELLEN: Record<string, Quelle> = {
  elekausbv: {
    id: 'elekausbv',
    titel: 'Verordnung über die Berufsausbildung zum Elektroniker und zur Elektronikerin (ElekAusbV)',
    herausgeber: 'Bundesministerium für Wirtschaft und Klimaschutz',
    kennung: 'BGBl. I 2021 S. 662, 699 – Art. 4',
    ausgabe: '30.03.2021, gültig ab 01.08.2021',
    url: 'https://www.gesetze-im-internet.de/elekausbv/',
    abgerufen: ABGERUFEN,
  },
  vde0100: {
    id: 'vde0100',
    titel: 'Errichten von Niederspannungsanlagen',
    herausgeber: 'DIN VDE / VDE FNN',
    kennung: 'DIN VDE 0100-100,-200,-410,-430,-510,-600,-701,-702,-710',
    ausgabe: null,
    url: null,
    abgerufen: ABGERUFEN,
  },
  vde0105: {
    id: 'vde0105',
    titel: 'Betrieb von elektrischen Anlagen',
    herausgeber: 'DIN VDE / VDE FNN',
    kennung: 'DIN VDE 0105',
    ausgabe: null,
    url: null,
    abgerufen: ABGERUFEN,
  },
  trbs1201: {
    id: 'trbs1201',
    titel: 'Wiederkehrende Prüfungen von ortsveränderlichen elektrischen Betriebsmitteln und Anlagen',
    herausgeber: 'Baua Arbeitsschutz',
    kennung: 'TRBS 1201 / DGUV Information 203-072',
    ausgabe: null,
    url: null,
    abgerufen: ABGERUFEN,
  },
  dguv3: {
    id: 'dguv3',
    titel: 'Elektrische Anlagen und Betriebsmittel',
    herausgeber: 'DGUV',
    kennung: 'DGUV Vorschrift 3 / DGUV Regel 100-500',
    ausgabe: null,
    url: null,
    abgerufen: ABGERUFEN,
  },
  schultabelle: {
    id: 'schultabelle',
    titel: 'Strombelastbarkeitstabelle nach Berufsschul-/ZVEH-Systematik',
    herausgeber: 'ZVEH / Berufsschule',
    kennung: 'vereinfachte Absicherungswerte',
    ausgabe: null,
    url: null,
    abgerufen: ABGERUFEN,
  },
};
