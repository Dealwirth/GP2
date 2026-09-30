/**
 * KI-Selbsttest von der Kommandozeile.
 *
 *   GROQ_KEY=gsk_… npm run ki:test
 *
 * Prüft die ganze Kette (Verbindung → Vorschlag → Rechnung → Validierung) und
 * gibt je Stufe aus, woran es lag. Läuft dieselbe Logik wie die Schaltfläche
 * „KI-Selbsttest" in der App (`src/ai/selbsttest.ts`).
 */

import { STANDARD_MODELLE, STANDARD_MODELL, type AiEinstellungen } from '../src/ai/client.ts';
import { selbsttest } from '../src/ai/selbsttest.ts';

const schluessel = (process.env.GROQ_KEY ?? '').trim();
if (!schluessel) {
  console.error('Kein GROQ_KEY gesetzt. Aufruf: GROQ_KEY=gsk_… npm run ki:test');
  process.exit(1);
}

const modell = process.env.GROQ_MODELL ?? STANDARD_MODELL;
if (!Object.values(STANDARD_MODELLE).includes(modell)) {
  console.warn(
    `Hinweis: „${modell}" steht nicht in der Modell-Liste. Verfügbar: ${Object.values(STANDARD_MODELLE).join(', ')}`,
  );
}

const einstellungen: AiEinstellungen = {
  proxyUrl: 'https://api.groq.com/openai/v1/chat/completions',
  apiKey: schluessel,
  modell,
  aktiv: true,
  zweitpruefung: false,
};

console.log(`KI-Selbsttest · Modell ${modell}\n`);

const ergebnis = await selbsttest(einstellungen, AbortSignal.timeout(90_000));

for (const stufe of ergebnis.stufen) {
  const zeichen = stufe.ok ? '✓' : '✗';
  const zeit = stufe.dauerMs ? ` (${stufe.dauerMs} ms)` : '';
  console.log(`${zeichen} ${stufe.name.padEnd(12)}${zeit}`);
  console.log(`   ${stufe.detail}`);
  if (stufe.roh) console.log(`   Rohtext: ${stufe.roh}`);
}

console.log('');
if (ergebnis.ok && ergebnis.task) {
  console.log('Ergebnis: Die KI liefert eine vollständige, geprüfte Aufgabe.');
  console.log(`Aufgabe: ${ergebnis.task.proposal.prompt}`);
  console.log(
    `Optionen: ${ergebnis.task.proposal.options?.map((o) => o.text).join(' | ') ?? '–'}`,
  );
  console.log(`Richtig ist: ${ergebnis.task.correctOptionId}`);
  process.exit(0);
}

const letzte = ergebnis.stufen.at(-1);
console.log(`Ergebnis: abgebrochen bei „${letzte?.name}": ${letzte?.detail}`);
process.exit(1);
