/**
 * Zahlenformatierung für die Anzeige.
 *
 * Deutsche Schreibweise mit Komma, ohne überflüssige Nullen. Ein Wert wie
 * 0,3 steht als „0,3" da und nicht als „0,30"; 21 ohne Nachkommastelle.
 * Die Engine hat eine eigene, bewusst starre Formatierung – hier geht es um
 * die lesbare Darstellung im Text.
 */
export function formatiereZahl(wert: number, stellen = 2): string {
  if (!Number.isFinite(wert)) return '—';
  const text = wert.toFixed(stellen);
  const punkt = text.indexOf('.');
  if (punkt < 0) return text;
  const nachkomma = text.slice(punkt + 1).replace(/0+$/, '');
  const ganz = nachkomma === '' ? text.slice(0, punkt) : `${text.slice(0, punkt)}.${nachkomma}`;
  return ganz.replace('.', ',');
}
