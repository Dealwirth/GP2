import { FAKTEN, faktBericht, offeneFakten } from '../src/content/facts/index.ts';
import { QUELLEN } from '../src/content/facts/quellen.ts';

/**
 * Prüfbericht der Faktenbasis.
 *
 * Zweck: Offenlegen, welche Werte noch nicht am Original geprüft sind.
 * Ein Wert mit `verification: 'offen'` darf nicht als gesichert dargestellt
 * werden – deshalb wird er hier sichtbar gemacht, statt stillschweigend
 * mitgeliefert zu werden.
 */
const bericht = faktBericht();

console.log(`\nFaktenbasis v${bericht.version} – ${bericht.gesamt} Einträge\n`);
console.log(`  geprüft : ${bericht.geprueft}`);
console.log(`  offen   : ${bericht.offen}`);

const offene = offeneFakten();
if (offene.length > 0) {
  console.log('\nNoch am Original zu prüfen:\n');
  for (const fakt of offene) {
    const quelle = QUELLEN[fakt.quelleId];
    console.log(`  ${fakt.id}`);
    console.log(`      ${fakt.bezeichnung}`);
    if (fakt.wert !== undefined) console.log(`      Wert: ${fakt.wert} ${fakt.einheit ?? ''}`);
    console.log(`      Quelle: ${quelle?.kennung ?? fakt.quelleId}`);
    if (fakt.bemerkung) console.log(`      Hinweis: ${fakt.bemerkung}`);
    console.log('');
  }
}

// Plausibilitätsprüfungen
const probleme: string[] = [];
for (const fakt of FAKTEN) {
  if (fakt.gueltigBis && new Date(fakt.gueltigBis) < new Date(fakt.gueltigAb)) {
    probleme.push(`${fakt.id}: gültig_bis liegt vor gültig_ab`);
  }
  if (fakt.ersetztDurch && !FAKTEN.some((f) => f.id === fakt.ersetztDurch)) {
    probleme.push(`${fakt.id}: ersetzt_durch "${fakt.ersetztDurch}" existiert nicht`);
  }
}

if (probleme.length > 0) {
  console.log('\nProbleme:\n');
  for (const p of probleme) console.log(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log('Strukturprüfung ohne Befund.');
}
