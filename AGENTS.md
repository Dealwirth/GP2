# EGT-Prüfungstrainer (GP2) – Arbeitsnotizen

## Projekt
Lern-App für die Gesellenprüfung Teil 2 (Elektroniker Energie-/Gebäudetechnik,
Bayern/Schweinfurt). React + TypeScript + Vite, Tests mit Vitest, kein Backend.
Deployment über GitHub Pages aus `main` (`.github/workflows/deploy.yml`).

## Grundregel des Produkts
Die KI **schlägt nur vor**. Ob eine Antwort richtig ist, entscheidet
ausschließlich die Engine (`src/tasks/resolve.ts`, `rechne`) plus die
Validierung (`src/validation/pipeline.ts`). Diese Trennung darf nie umgangen
werden – kein Wert aus einem KI-Vorschlag wird ungeprüft übernommen.

## Befehle
- `npm run typecheck` – `tsc --noEmit`
- `npm test` – Vitest, `tests/**/*.test.ts`
- `npm run facts:check` – prüft die Faktenbasis (`src/content/facts`)
- `npm run build` – Vite-Build nach `dist/`
Alle vier laufen in der CI vor dem Deploy.

## Fallstricke
- **Duplikatsperre** (`src/validation/pipeline.ts`) ist ein *modulweiter*
  Speicher. In Tests, die mehrfach dieselben Parameter erzeugen, vorher
  `leereDuplikatspeicher()` aufrufen – sonst verschwindet die zweite Aufgabe
  und der Test sieht wie ein Produktfehler aus.
- **Antwortposition wird gemischt** (`baueOptionen` in `src/tasks/generator.ts`).
  `correctOptionId` ist nicht mehr fest `'a'`. Begründungen deshalb über
  `begruendungen(...)` zuordnen, nicht über feste Schlüssel `b`/`c`.
- **Verfall ist abgeleitet, nicht gespeichert.** `effektiverZustand()` in
  `src/domain/stateMachine.ts` rechnet `ueberfaellig` aus dem Datum. Wer den
  Zustand eines Themas anzeigt oder auswertet, nimmt `effektiverZustand()`,
  nicht `record.state`.
- **Einheiten** werden in `gleicheOptionenAb` verglichen und Vorsätze
  aufgelöst („300 mA" = „0,3 A"). Neue Optionen darauf prüfen.
- Faktenbasis und Aufgabenvorrat sind Inhalte, nicht Code: Änderungen dort
  zuerst mit `facts:check` und `tests/fakten.test.ts` absichern.
