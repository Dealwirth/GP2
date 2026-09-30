# EGT-Prüfungstrainer (GP2) – Arbeitsnotizen

## Zuletzt erledigt (30.09., zweite Runde)
- **KI-Erzeugung stabilisiert.** Drei Ursachen behoben: (a) Rezept-Eingänge
  (Last, Länge, Strom, Querschnitt) gelten als gebundene Zahlen
  (`rezeptWerte` in `resolve.ts` → `ValidierungsOptionen.rezeptWerte`); (b) die
  Bezugstemperatur 30 °C steht jetzt im Rechenschritt der Engine; (c) Entwurf
  wird *vor* der Zweitprüfung validiert, Zweitprüfungen laufen nacheinander,
  der Client wartet das Rate-Limit (`retry-after`) bis zu dreimal ab.
  Prompts: Rezeptfelder je `art` ausformuliert, Szenariozahlen erlaubt,
  Zweitprüfung beanstandet gültige Wertantworten nicht mehr.
- **Quellenverzeichnis nachgewiesen.** `quellen.ts` trägt Kennung, Bezugsweg
  und `geprueft`-Status; Leitungsfakten verweisen auf DIN VDE 0298-4.
  `facts:check` und `tests/fakten.test.ts` verlangen: ein geprüfter Fakt
  braucht eine am Original nachgewiesene Quelle.
- **Labor entfernt.** `src/labor/` und die Labor-Seite sind weg; der geführte
  Kundenauftrag (`src/content/kundenauftrag.ts`, `Kundenauftrag.tsx`) deckt den
  Ablauf ab. README und `index.html` sind darauf angeglichen.

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
- **Tempo**: Zweitprüfungen laufen nacheinander (`generator.ts`), verworfene
  Vorschläge werden einmal mit Ablehnungsgrund nachgefasst
  (`nachfassVersuche`), Rate-Limit wartet bis 60 s (dreimal `retry-after`).
- **Tabellen** sind während jeder Aufgabe als Blatt verfügbar
  (`src/ui/TabellenBlatt.tsx`, in `Ueben.tsx` und `Pruefung.tsx`).
- **Fehlergrenze** (`src/ui/Fehlergrenze.tsx`) um `App` in `main.tsx`.

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

### 1. Praktische Geräte- und Anlagenprüfung (fachliche Lücke)
Die Prüfschritte der Anlagen- und Geräteprüfung (VDE 0100-600 bzw.
0701/0702) stehen jetzt als Inhalte unter `src/content/kundenauftrag.ts`
und in der Faktenbasis (`schutz.ts`). Das frühere `src/labor/` wurde
entfernt – der geführte Kundenauftrag deckt den Ablauf ab.

Erledigt am 30.09.:
- Die **Unterscheidung 0701/0702** wird als Fachfrage `f-ka-11` abgefragt
  (0701 nach Instandsetzung/Änderung, 0702 Wiederholungsprüfung, 0100-600
  für die ortsfeste Anlage).
- Die **Prüfschritte der Geräteprüfung** stehen als Inhalte bereit
  (`GERAET_SCHRITTE`: Sichtprüfung, Schutzleiterwiderstand, Riso,
  Ersatzableitstrom, Funktion). Die Geräte-Grenzwerte liegen als Fakten in
  `schutz.ts` (`pe-widerstand-geraet` 0,3 Ω, `riso-geraet-sk1` 1 MΩ,
  `schutzleiterstrom-geraet` 3,5 mA, `beruehrungsstrom-geraet` 0,5 mA).
- Das vierte Kundenauftrags-Szenario `geraetepruefung` (Wiederholungsprüfung
  nach DIN VDE 0702) ist normbasiert und wird über die Fakten geprüft.

Fachliche Korrekturen am 30.09. (gegen die Engine/Faktenbasis geprüft):
- Wallbox-Szenario: `I_z = 4 mm²` war als 25,5 A angegeben, die Faktenbasis
  führt 28 A (Verlegeart C). Verlegeart von A1 auf C korrigiert und die
  Dimensionierung auf den tatsächlich zulässigen Mindestquerschnitt 2,5 mm²
  (I_z = 21 A, B 20 A) umgestellt; 4 mm² bleibt als klügere Reserve im
  Hinblick auf die zweite Wallbox in der Begründung erwähnt.
- PV-Szenario: 4 mm² mit 25,5 A angegeben → 28 A korrigiert; die AC-Absicherung
  benennt jetzt ausdrücklich 10 mm² + B 50 A.
- Wärmepumpe: Betriebsstrom im Text 25,2 A → 25,1 A; Spannungsfall-Antwort
  „0,98 %“ → „1,1 %“ (Engine: 1,06 %).
- Tests: `tests/kundenauftrag.test.ts` prüft jetzt, dass die genannten
  I_z-Werte mit `strombelastbarkeit` übereinstimmen und dass die
  Geräte-Szenario-Grenzwerte in der Faktenbasis stehen.

### 2. KI-Erzeugung – weitgehend geschlossen (30.09., zweite Runde)
Ursachen waren drei, alle behoben:
- **Faktenbindung verwarf Szenariozahlen.** Last, Länge, Strom und Querschnitt
  sind keine Normwerte, sondern Eingänge der Rechnung. Sie gelten jetzt als
  gebunden (`ValidierungsOptionen.rezeptWerte`, gespeist aus `rezeptWerte()` in
  `resolve.ts`). Eine erfundene Normzahl lässt sich so nicht verstecken – sie
  würde als Rezept-Eingang die Rechnung verändern, nicht die Antwort belegen.
  Test: `tests/validation.test.ts`.
- **Bezugstemperatur 30 °C fehlte im Rechenschritt.** Der Wert stand weder in
  den Fakten noch in den Engine-Schritten und fiel deshalb durch. Jetzt nennt
  der Schritt der Strombelastbarkeit die Temperatur.
- **Zweitprüfung urteilte fachlich falsch** („mehrdeutig", weil eine Wertoption
  keinen Zusatzbezug hatte) und **riss das Rate-Limit** (parallele
  Zweitprüfungen). Jetzt: Entwurf wird *vor* der Zweitprüfung validiert
  (spart die zweite Anfrage bei Ausschuss), Zweitprüfungen laufen nacheinander,
  und der Client wartet das `retry-after` bis zu dreimal ab.

Live gemessen: `ka-verteilung-04` liefert weiterhin 2 gültige Aufgaben; die
verbleibenden Verluste im Testlauf waren reines Groq-Minutenkontingent
(429), kein Fachfehler. Offen bleibt: das Kontingent ist gratis begrenzt –
für Dauerbetrieb braucht es den serverseitigen Proxy (siehe 3).

### 3. Der Groq-Schlüssel steckt im öffentlichen Bundle (Sicherheit)
`EINGEBAUTER_SCHLUESSEL` wird zur Bauzeit aus `VITE_GROQ_KEY` eingesetzt und
steht damit in `dist/assets/index-*.js` – im Live-Bundle verifiziert. Die
Begründung im Code („Gratis-Tarif, harmlos") trägt nur, solange niemand das
Kontingent leerräumt. Saubere Variante: dünne Serverless-Funktion davor, die
den Schlüssel hält; die App schickt dorthin. Ändert nichts an der Architektur
– `client.ts` bleibt die einzige Stelle, die den Endpunkt kennt.

### 4. UI ist nicht getestet (Regressionen bleiben unsichtbar)
`vite.config.ts` setzt `environment: 'node'`. Die 13 Testdateien decken
Domäne, Engine, Validierung und Inhalte sehr gut ab – aber keine einzige
Komponente. Genau die Stellen, an denen gerade gearbeitet wurde
(`Ueben.tsx`, `Pruefung.tsx`, `Tabellen.tsx`, `InhaltsverzeichnisBlatt.tsx`),
sind ungeprüft. `jsdom` plus ein paar Render-Tests wären der billigste
Zugewinn an Sicherheit.

### 5. Kein Error Boundary
`main.tsx` rendert `App` inzwischen in `Fehlergrenze` – die Fehlergrenze
existiert und fängt Renderfehler ab. Offen: eigene Render-Tests für die
Oberfläche (siehe 4).

