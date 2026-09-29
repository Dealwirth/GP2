import { statischeGrundaufgaben } from '../src/tasks/generator.ts';
import { ATOME } from '../src/content/curriculum/index.ts';

const alle = statischeGrundaufgaben();
const abgedeckt = new Set(alle.flatMap((t) => t.proposal.topicIds));
const zaehler: Record<string, { aufgaben: number; themen: number; abgedeckt: number }> = {};

for (const atom of ATOME) {
  const z = (zaehler[atom.bereich] ??= { aufgaben: 0, themen: 0, abgedeckt: 0 });
  z.themen += 1;
  if (abgedeckt.has(atom.id)) z.abgedeckt += 1;
}
for (const t of alle) zaehler[t.proposal.examArea]!.aufgaben += 1;

console.log(`Aufgaben gesamt: ${alle.length}\n`);
console.log('Bereich                 Aufgaben  Themen  davon mit Aufgabe');
console.log('---------------------------------------------------------------');
for (const [bereich, z] of Object.entries(zaehler)) {
  console.log(
    `${bereich.padEnd(24)} ${String(z.aufgaben).padStart(6)} ${String(z.themen).padStart(8)} ${String(z.abgedeckt).padStart(20)}`,
  );
}
console.log('---------------------------------------------------------------');
console.log(
  `Summe                   ${String(alle.length).padStart(6)} ${String(ATOME.length).padStart(8)} ${String(abgedeckt.size).padStart(20)}`,
);
console.log(
  `\nAbdeckung: ${Math.round((abgedeckt.size / ATOME.length) * 100)} % der Lernpfad-Themen haben eine fertige Aufgabe.`,
);
console.log('Der Rest wird von der KI erzeugt und durch dieselbe Pipeline geprüft.');
