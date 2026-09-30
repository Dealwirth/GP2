# EGT-Prüfungstrainer (GP2) – Arbeitsnotizen

## Zuletzt erledigt (30.09.)
- **Duplikatsperre repariert.** Der Parameter-Hash landete schon beim Bestehen
  der Prüfliste im modulweiten Speicher – auch wenn der Vorschlag danach an
  der Zweitprüfung scheiterte. Er blockierte dann für den Rest der Sitzung
  seine eigene Kombination: die Aufgabenerzeugung klappte „beim ersten Mal,
  danach nie wieder". Jetzt vergibt `baueTask` den Hash erst nach gelungenem
  Bau; `merkeHash` und `setzeBekannteHashes` sind exportiert. `ablage.ts`
  meldet gespeicherte Aufgaben an die Sperre, damit sie ein Neuladen
  übersteht. Regressionstest: `tests/duplikatsperre.test.ts`.
- **Vorrat** (`src/tasks/vorrat.ts`): hält mindestens `einstellungen.vorrat`
  (Voreinstellung 10) fertige Aufgaben bereit und füllt im Hintergrund nach.
  `baueSession` nimmt zuerst aus dem Vorrat – der Start ist dann ein Zugriff,
  kein Warten. Anzeige: `src/ui/Vorratszeile.tsx` im Kopf.
- **Tempo**: Zweitprüfungen laufen parallel (`Promise.all` in
  `generator.ts`), verworfene Vorschläge werden einmal mit Ablehnungsgrund
  nachgefasst (`nachfassVersuche`), Rate-Limit wartet bis 30 s.
- **Tabellen** sind während jeder Aufgabe als Blatt verfügbar
  (`src/ui/TabellenBlatt.tsx`, in `Ueben.tsx` und `Pruefung.tsx`).
- **Fehlergrenze** (`src/ui/Fehlergrenze.tsx`) um `App` in `main.tsx`.
- **Messgerät**: Drehschalter/Buchsenwechsel setzt die Anzeige zurück –
  vorher liefen angezeigter Wert und Bewertung auseinander.

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

## Offene Punkte (Stand: Analyse 2026-09-30)

Nach Dringlichkeit, nicht nach Aufwand sortiert.

### 1. Praktische Geräte- und Anlagenprüfung fehlt (fachliche Lücke)
`labor/pruefprotokoll.ts` deckt nur die Anlagenprüfung nach VDE 0100-600 ab
(Durchgang PE/Leiter, Riso, Schleifenwiderstand, RCD-Auslösezeit,
Spannungsfall). Es fehlt die **Geräteprüfung** – und damit ein ganzer
Prüfungsteil:

- VDE 0701-0702: Sichtprüfung, Schutzleiterwiderstand, **Isolationswiderstand
  und Ersatzableitstrom**, Funktion.
- Die Unterscheidung 0701 (Reparatur/Änderung) gegen 0702
  (Wiederholungsprüfung) wird nirgends abgefragt.
- Ableitstrom als Messart fehlt in `messgeraet.ts` (`MESSARTEN` hat mA/A, aber
  keine Ableitstrommessung am Gerät).
- `kundenauftrag.ts` hat nur drei Szenarien (Wärmepumpe, Wallbox, PV) – alle
  sind *Installationen*, keine *Wiederholungsprüfung eines Betriebsmittels*.

### 2. KI-Erzeugung ist intermittierend (Produktkern wackelt)
Gemessen an Läufen: 1–3 Aufgaben, teils 0. `erzeugeAufgaben` hat **einen**
Versuch ohne Nachfassen; jeder abgelehnte Vorschlag ist endgültig verloren.
Bekannte Ablehnungsgründe: „Keine Option passt zum Rechenergebnis",
„Ungebundene Zahlen", „zweitpruefung: mehrdeutig", „Rate-Limit".
Ansatzpunkte: verworfene Vorschläge einmal mit dem Ablehnungsgrund
zurückgeben und nachbessern lassen; Zweitprüfungs-Ausfall (Netzfehler) von
einem inhaltlichen „verworfen" trennen; Rate-Limit im Client über
`retry-after` hinaus abwarten statt sofort aufzugeben.

### 3. Der Groq-Schlüssel steckt im öffentlichen Bundle (Sicherheit)
`EINGEBAUTER_SCHLUESSEL` wird zur Bauzeit aus `VITE_GROQ_KEY` eingesetzt und
steht damit in `dist/assets/index-*.js` – im Live-Bundle verifiziert. Die
Begründung im Code („Gratis-Tarif, harmlos") trägt nur, solange niemand das
Kontingent leerräumt. Saubere Variante: dünne Serverless-Funktion davor, die
den Schlüssel hält; die App schickt dorthin. Ändert nichts an der Architektur
– `client.ts` bleibt die einzige Stelle, die den Endpunkt kennt.

### 4. UI ist nicht getestet (Regressionen bleiben unsichtbar)
`vite.config.ts` setzt `environment: 'node'`. Die 14 Testdateien decken
Domäne, Engine, Validierung und Inhalte sehr gut ab – aber keine einzige
Komponente. Genau die Stellen, an denen gerade gearbeitet wurde
(`Ueben.tsx`, `Pruefung.tsx`, `Tabellen.tsx`, `InhaltsverzeichnisBlatt.tsx`),
sind ungeprüft. `jsdom` plus ein paar Render-Tests wären der billigste
Zugewinn an Sicherheit.

### 5. Kein Error Boundary
`main.tsx` rendert `App` ohne Fehlergrenze. Die README verspricht, dass ein
fehlerhafter Datensatz nie die Seite leert – das gilt für die Datensammlungen
(`robust.ts`), nicht für einen Renderfehler. Eine Error Boundary um `App`
würde das Versprechen auch für die Oberfläche einlösen.

