import type { Atom } from './curriculum/types.ts';
import { FAKTEN, holeFakt } from './facts/index.ts';

/**
 * Welche Fakten zu einem Thema gehören.
 *
 * Sie ist die Brücke zwischen Faktenbasis und Lernpfad. Ohne sie bliebe eine
 * Aufgabe ohne belegte Werte.
 *
 * Zwei Wege: über den fachlichen Zuschnitt des Themas (Fakten-Tags) und über
 * die Grundfakten, die für Rechen- und Normenthemen immer gelten.
 */
export function relevanteFakten(atom: Atom): string[] {
  const tags = new Set<string>([atom.fachlich, atom.kapitelId.split('-')[1] ?? '']);
  const ids = new Set<string>();

  for (const fakt of FAKTEN) {
    if (fakt.tags.some((t) => tags.has(t))) ids.add(fakt.id);
  }

  if (atom.fachlich === 'norm' || atom.fachlich === 'rechnen') {
    for (const id of [
      'idn-personenschutz',
      'idn-feuchteraum',
      'abschaltzeit-0-3s',
      'iz-tabelle-verlegeart-c',
      'absicherung-schultabelle',
      'iz-temperatur-bezug',
      'ls-kennlinie-b-magnetisch-min',
      'ls-kennlinie-c-magnetisch-min',
      'ls-kennlinie-d-magnetisch-min',
      're-grenzwert',
    ]) {
      if (holeFakt(id)) ids.add(id);
    }
  }
  return [...ids];
}
