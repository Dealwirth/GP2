import { FAKTEN, faktBericht, offeneFakten } from '../src/content/facts/index.ts';
import { QUELLEN, quellenBericht } from '../src/content/facts/quellen.ts';

/**
 * Prüfbericht der Faktenbasis.
 *
 * Zweck: Offenlegen, welche Werte noch nicht am Original geprüft sind.
 * Ein Wert mit `verification: 'offen'` darf nicht als gesichert dargestellt
 * werden – deshalb wird er hier sichtbar gemacht, statt stillschweigend
 * mitgeliefert zu werden. Dasselbe gilt für die Quellen: Wer eine Norm
 * zitiert, muss den Bezugsweg nachweisen können.
 */
const bericht = faktBericht();
const quellen = quellenBericht();

console.log(`\nFaktenbasis v${bericht.version} – ${bericht.gesamt} Einträge\n`);
console.log(`  geprüft : ${bericht.geprueft}`);
console.log(`  offen   : ${bericht.offen}`);
console.log(`\nQuellen – ${quellen.gesamt} Einträge`);
console.log(`  am Original geprüft : ${quellen.geprueft}`);
console.log(`  offen               : ${quellen.gesamt - quellen.geprueft}`);
if (quellen.offeneIds.length > 0) {
  console.log(`  ohne Nachweis        : ${quellen.offeneIds.join(', ')}`);
}

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
  if (!QUELLEN[fakt.quelleId]) {
    probleme.push(`${fakt.id}: Quelle "${fakt.quelleId}" fehlt im Quellenverzeichnis`);
  }
  // Ein geprüfter Fakt braucht eine nachgewiesene Quelle – sonst behauptet
  // die App eine Sicherheit, die sie nicht belegen kann.
  if (fakt.verification === 'geprueft' && !QUELLEN[fakt.quelleId]?.geprueft) {
    probleme.push(
      `${fakt.id}: gilt als geprüft, aber Quelle "${fakt.quelleId}" ist nicht am Original nachgewiesen`,
    );
  }
}

if (probleme.length > 0) {
  console.log('\nProbleme:\n');
  for (const p of probleme) console.log(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log('Strukturprüfung ohne Befund.');
}
