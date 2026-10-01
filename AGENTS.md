# EGT-Prüfungstrainer (GP2) – Arbeitsnotizen

## Zuletzt erledigt (30.09., achte Runde) – Auswertung der interaktiven Formate
- **Fehler gefunden.** Die Prüfungsseite verglich die gewählte Antwort mit
  `correctOptionId`. Die interaktiven Formate haben keine Optionskennung; jede
  wahr/falsch-, Zuordnungs-, Reihenfolge- und Lückentext-Aufgabe galt damit als
  falsch, egal was eingetragen war. Richtig beantwortete interaktive Aufgaben
  wurden nicht gezählt.
- **Bewertung an einer Stelle.** Neu in `domain/exam/simulation.ts`:
  `bilanzieren()` (richtig / falsch / offen / Wiederholungsthemen) sowie
  `leseAntwort()` und `schreibeAntwort()`. Die Bewertung liegt ausschließlich
  bei `bewerte()`; die Seite hält keine eigene Kopie der Logik mehr. Eine
  unlesbare gespeicherte Antwort zählt als falsch statt die Auswertung zu
  sprengen.
- **Wahr/Falsch ohne Prüfknopf.** Der Bestätigungsschritt war beim Umbau
  versehentlich auch im Üben gelandet und hätte dort einen Klick mehr gekostet.
  Der Übungsbetrieb ist wieder wie vorher; in der Prüfung melden alle Formate
  sofort über `onVerlauf`, damit nichts verloren geht.
- **Tests.** Neu `tests/pruefung.test.ts` (14): Speichern/Lesen der Antworten,
  je Format eine richtige Antwort, teilweise richtige Zuordnung zählt nicht,
  falsch vs. offen, unlesbare Antwort, Verteilung nach Bereich und Format.
  Neu `tests/ui/pruefung-interaktiv.test.tsx` (4): sofortige Meldung,
  Reihenfolge erst bei Bewegung, Übernahme einer gespeicherten Antwort,
  gesperrte Eingabe nach der Abgabe.
- **Stand:** `tsc` sauber, 22 Testdateien / 230 Tests grün, `npm run build` ok.
  Manuell geprüft: Ein Durchgang mit einer wahr/falsch-Aufgabe zählt die
  Antwort (2/12 statt 1/12).

## Zuletzt erledigt (01.10., siebte Runde) – Abgleich zwischen Geräten
- **Prüfung ohne Schlüssel-Scope.** Der Gist-Weg scheiterte an HTTP 403, weil
  dem Token der `gist`-Scope fehlte. In der Oberfläche steht jetzt der direkte
  Anlege-Link mit gesetztem Scope; ein falscher Token wird über „Token prüfen"
  mit klarer Meldung abgewiesen (Name bei Erfolg, sonst der GitHub-Fehlertext).
- **Abgleichs-UI in den Einstellungen fertig.** Abschnitt „Auf mehreren Geräten
  üben": Token, „Token prüfen", „Jetzt abgleichen", Anzeige von Gist-Kennung und
  letztem Abgleich, „Ablage trennen". Kein automatischer Abgleich und kein
  gespeichertes Passwort – das Passwort wird für jeden Lauf neu abgefragt und
  nirgends abgelegt.
- **Datenschutz-Aussagen korrigiert.** „Der Lernstand verlässt das Gerät nicht"
  stimmt mit dem Abgleich nicht mehr; beide Stellen sagen jetzt, dass er nur bei
  ausdrücklich eingeschaltetem Abgleich verschlüsselt in den eigenen Gist geht.
- **Tests (`tests/sync.test.ts`, 11).** Zusammenführen (je Thema der weiter
  geübte Stand, Gleichstand bleibt lokal, Versuche/Sitzungen ohne Dubletten),
  Einstellungen, und der volle Abgleich gegen einen Gist-Server im Speicher:
  Anlegen, Verschlüsselung (kein Klartext im Gist), Zusammenführen mit einem
  fremden Stand, falsches Passwort, zu kurzes Passwort, Übernahme in die Ablage.
- **Stand:** `tsc` sauber, 23 Testdateien / 244 Tests grün, `npm run build` ok.
  Hilfsskripte `scripts/_*.mts` entfernt – `tsc --noEmit` prüft `scripts/` mit,
  sie hatten den Build blockiert.

## Zuletzt erledigt (01.10., sechste Runde) – KI-Anbieter frei wählbar
- **Ursache „KI antwortet nicht" gefunden.** Der eingebaute Schlüssel kommt
  beim Bau aus dem Secret `VITE_GROQ_KEY`. Ist das Secret nicht gesetzt (oder
  abgelaufen), ist `EINGEBAUTER_SCHLUESSEL` leer – und die App konnte gar
  keinen Anbieter erreichen. Der Selbsttest sagte das auch („Kein
  Groq-Schlüssel hinterlegt"), nur war Groq bis dahin der *einzige* Weg.
- **Anbieterliste (`src/ai/anbieter.ts`, neu).** Sechs kostenlose,
  OpenAI-kompatible Anbieter an einer Stelle: Groq, Google Gemini, Cerebras,
  OpenRouter, GitHub Models, Mistral. Je Anbieter: Endpunkt, Schlüssel-Seite,
  Modelle, Schema-Modus, Token-Feld, Gratis-Kontingent. Wechsel = andere
  Adresse + Schlüssel + Modell; der restliche Code bleibt.
- **Client passt sich an (`client.ts`).** `frage` baut die Anfrage je Anbieter:
  `max_completion_tokens` vs. `max_tokens`, `reasoning_effort` nur wo erlaubt,
  strenges `json_schema` (Groq, Cerebras) vs. weiches `json_object` mit Schema
  im Text (Gemini, OpenRouter, Mistral, GitHub). Schlüssel werden je Anbieter
  aus `VITE_<ANBIETER>_KEY` gelesen (`EINGEBAUTE_SCHLUESSEL`).
  Neu: `listeModelle()` holt die aktuelle Modellliste beim Anbieter – die feste
  Liste veraltet sonst (Google hat 2.0 Flash abgeschaltet).
- **Einstellungen mit Anbieterauswahl (`einstellungen.ts`, `Einstellungen.tsx`).**
  Neues Feld `kiAnbieter`; beim Wechsel wandern Endpunkt und Modellliste mit.
  Knopf „Modelle vom Anbieter laden". Feldname `groqKey` bleibt (Bestandsdaten
  und Exporte), trägt aber den Schlüssel des gewählten Anbieters.
- **Fehlertexte anbieterneutral (`KiStatus.tsx`).** Statt „Groq ist nicht
  erreichbar" jetzt „Der Anbieter ist …"; der nächste Schritt nennt
  „Einstellungen" statt einer festen URL.
- **Deploy (`deploy.yml`, `vite-env.d.ts`).** Weitere Secrets
  `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`,
  `GITHUB_MODELS_KEY`, `MISTRAL_API_KEY` durchgereicht; fehlt eines, ist der
  Wert leer und die App meldet es sauber.
- **Empfehlung (Kontingent):** Gemini 2.5 Flash-Lite (~1 000 Anfragen/Tag,
  250 000 Token/Min) und Cerebras (1 Mio. Token/Tag, 30 Anfragen/Min) sind
  Groq (8 000 Token/Min, ~60 Aufgaben/Tag) weit überlegen. Groq bleibt schnell,
  ist aber das engste Kontingent.
- Tests: 226 grün (neu: `tests/anbieter.test.ts`, `tests/ki-anbieter-anfrage.test.ts`),
  `tsc` sauber, `npm run build` ok.
- **Lehre:** `localhost`-Freigabe hier liefert für `models.github.ai` nur ein
  Platzhalter-„OK" (content-type text/plain), keinen echten Modellaufruf –
  Live-Tests gegen GitHub Models sind aus dieser Umgebung nicht aussagekräftig.

## Zuletzt erledigt (30.09., fünfte Runde) – KI-Ausfall behoben
- **Aufgaben-Vorrat ohne KI (`src/tasks/seed.ts`).** Ursache von „0 bereit":
  Die KI war der einzige Weg zu Aufgaben, und bei leerem Groq-Kontingent stand
  die App still. Neu: Der Vorrat wird zuerst aus Faktenbasis + Rechen-Engine
  gebaut – ohne Netz, ohne Schlüssel, in Millisekunden. `seedAufgabenFuerAtom`
  erzeugt je Thema Rechen-Varianten (Strombelastbarkeit, Abschaltbedingung,
  Schleifenwiderstand, Strom ein-/dreiphasig) plus Kennwert-Fragen aus den
  Fakten; jede läuft durch dieselbe Validierung wie KI-Aufgaben
  (`validierungsOptionen: { duplikatPruefen: false }`). ~1 135 Aufgaben,
  215/216 Themen. Tests: `tests/seed.test.ts`.
- **Rotierender Seed-Vorrat (`vorrat.ts`).** Die Ablage ist ein Ringpuffer (60),
  deshalb deckt jeder Durchgang ein Themenfenster (12) ab und rückt weiter;
  der Stand liegt unter `seed-rotation` im localStorage. So geht der Stoff
  nicht aus und dieselbe Aufgabe wiederholt sich nicht sofort. `App.tsx`
  wärmt den Vorrat beim Start vor; `fuellung()` legt höchstens 2 KI-Aufgaben
  nach (`KI_NACHLEGEN_MAX`) und meldet bei KI-Ausfall nur einen Hinweis.
- **Sitzung fällt nie leer aus (`session.ts`).** Reicht der Vorrat nach KI und
  Nachfordern nicht, baut `baueSession` die passenden Seed-Aufgaben direkt
  (Schritt 3). Eine Wiederholung ist besser als eine leere Sitzung.
- **KI-Vorschläge werden repariert statt verworfen (`generator.ts`,
  `prompts.ts`).** `normalisiereRezept` füllt fehlende Pflichtfelder
  (u0FactId, idnFactId, kennlinie, weg, cosPhi); erfundene Fakt-Kennungen
  werden verworfen; `rendereVorlage` baut den Aufgabentext für Rechen-Themen
  selbst aus Vorlage + Rezept und liefert die zugehörigen `factRefs` mit –
  damit kann die Faktenbindung nicht mehr an einer erfundenen Zahl scheitern.
  Scheitert ein Vorschlag trotzdem, liefert `baueEinenAufgabe` die
  Engine-Aufgabe zum selben Thema (Lücke statt Ausfall).
- **Faktenbindung: Bezeichnung zählt mit (`validation/pipeline.ts`).** Zahlen
  in `fakt.bezeichnung` (z. B. „Prüfspannung 500 V DC") sind belegt wie die
  in `fakt.bemerkung`.
- **Messung (live, Groq):** Vorher 0 Aufgaben in ~59 s/Thema (429). Jetzt
  6/8 Aufgaben in 29 s mit `openai/gpt-oss-20b`. gpt-oss-20b liefert mit dem
  kompakten Schema jetzt zuverlässig und ist schneller als `qwen/qwen3.8-27b`
  (4/8, 92 s) → Standard bleibt gpt-oss-20b.
- Tests: 214 grün, `tsc` sauber.

## Zuletzt erledigt (30.09., vierte Runde)
- **Lern-Takt: Stoff bis zur Prüfung.** `waehleThemen` deckelte frische Themen
  nicht – die Auswahl nahm reifste Themen zuerst und zog den Stoff in wenigen
  Sitzungen durch. Jetzt reine, testbare Funktion `waehleThemenAus` in
  `session.ts`: Wiederholung zuerst, **ein reservierter Platz für ein neues
  Thema**, und der Takt für weitere neue Themen kommt aus „offene Themen /
  Resttage" (bei ferner Prüfung ~1, bei naher mehr). `bekannteThemen()` in
  `ablage.ts` liefert, welche Themen schon eine Aufgabe haben. Tests:
  `tests/pacing.test.ts`.
- **Freier KI-Anbieter erreichbar gemacht.** `client.ts` rief immer
  `einstellungen.proxyUrl` auf, die Seite setzte ihn aber fest auf Groq – ein
  anderes Gratis-Kontingent war damit nicht nutzbar. Neues Feld
  `kiEndpunkt` in `src/ui/einstellungen.ts` (leer = Groq) mit Eingabefeld in
  den Einstellungen; `aiEinstellungenAus` reicht es als `proxyUrl` durch.
  Test: `tests/ki-endpunkt.test.ts`.
- **Umlaut-Korruption in `resolve.ts` repariert.** Die Datei war durch einen
  früheren Editor-Schreibvorgang doppelt kodiert (`RezeptauflûÑsung` statt
  `Rezeptauflösung`). Folge: die Zeichenklassen in `zerlegeOption`/`einheitPasst`
  passten nicht mehr, und fünf `Optionsabgleich`-Tests fielen um. Datei aus
  HEAD wiederhergestellt und die eigenen Änderungen byte-sicher neu
  eingespielt. **Lehre: `src/`-Dateien mit Umlauten/Ω nur über Python
  (`pathlib.write_text(..., encoding='utf-8')`) bearbeiten, nie über einen
  Editor, der die Kodierung nicht hält.**
- **KI-Tempo (Fortsetzung).** Standardmodell bleibt `openai/gpt-oss-20b`
  (live ~2 s/Anfrage). Veraltete Texte angeglichen: Einstellungen (Modell- und
  Vorrat-Beschreibung: Standard 4, nicht 10), `Heute.tsx` („ohne
  Wiederholungen" stimmte nicht mehr), `KiStatus.tsx`-Modellhinweise.

## Zuletzt erledigt (30.09., dritte Runde)
- **KI-Erzeugung wirklich repariert – Ursache war das Modell.** Der echte
  Grund, warum keine Aufgaben entstanden: Groq wurde mit `openai/gpt-oss-120b`
  aufgerufen. Das ist ein Denkmodell; beim strengen JSON-Schema dieses Trainers
  verbraucht es sein Antwortbudget für den Denkweg und antwortet mit
  `400 json_validate_failed` bzw. „max completion tokens reached" – es kommt
  gar kein Inhalt zurück. Live gemessen: GPT-OSS 120b/20b scheitern
  reproduzierbar am Schema, **`qwen/qwen3.8-27b` liefert es zuverlässig**.
  Standardmodell ist deshalb jetzt Qwen; GPT-OSS bleibt als Ausweich.
  Zusätzlich setzt `client.ts` ein festes `max_completion_tokens: 4096`, damit
  ein Denkmodell überhaupt Platz für eine Antwort hat. Live verifiziert:
  `erzeugeAufgaben` liefert 2 Aufgaben, beide 5/5 Prüfungen grün.
- **KI-Selbsttest** (`src/ai/selbsttest.ts`, `scripts/ki-selbsttest.ts`).
  Prüft die Kette Stufe für Stufe (Verbindung → Vorschlag → Rechnung →
  Validierung) und nennt bei Fehlschlag die Stelle plus den Rohtext des
  Modells. In der KI-Werkstatt als Knopf, auf der Kommandozeile über
  `GROQ_KEY=gsk_… npm run ki:test` (optional `GROQ_MODELL=…`).
- **Oberfläche ist getestet** (`tests/ui/`, jsdom). `vite.config.ts` fährt
  jetzt zwei getrennte Projekte: `domaene` (Node, `tests/*.test.ts`) und
  `oberflaeche` (jsdom, `tests/ui/**/*.test.tsx`). Erste Render-Tests decken
  Tabellenblatt, Inhaltsverzeichnis-Blatt und Fehlergrenze ab.
- **Labor restlos entfernt.** Letzte Textstelle (`KiStatus.tsx`, „… und Labor
  brauchen keine Verbindung") auf Kundenauftrag umgestellt. Messgerät-Begriffe
  im Lerninhalt bleiben – das sind Prüfungsinhalte, kein Labor-Rest.

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
- `npm test` – Vitest (Projekt `domaene`: `tests/*.test.ts`; Projekt
  `oberflaeche`: `tests/ui/**/*.test.tsx` in jsdom)
- `npm run facts:check` – prüft die Faktenbasis (`src/content/facts`)
- `npm run ki:test` – KI-Selbsttest von der Kommandozeile
  (`GROQ_KEY=gsk_… npm run ki:test`, optional `GROQ_MODELL=…`)
- `npm run build` – Vite-Build nach `dist/`
Alle laufen in der CI vor dem Deploy.

## Fallstricke
- **Das Modell entscheidet über Erfolg oder Ausfall.** Die GPT-OSS-Modelle von
  Groq sind Denkmodelle und scheitern reproduzierbar am strengen JSON-Schema
  (`400 json_validate_failed`). `qwen/qwen3.8-27b` ist der Standard, weil es
  liefert. Wer das Modell wechselt, prüft zuerst mit `npm run ki:test` – sonst
  sucht man den Fehler in der Pipeline, obwohl er am Modell liegt.
- **Antwortbudget nicht vergessen.** `client.ts` setzt `max_completion_tokens`
  fest. Ohne das endet ein Denkmodell mit „max completion tokens reached" und
  liefert gar nichts. Wer das Budget senkt, muss den Selbsttest laufen lassen.
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

### 4. UI ist getestet (30.09., dritte Runde)
`vite.config.ts` fährt jetzt zwei getrennte Projekte: `domaene` (Node,
`tests/*.test.ts`) und `oberflaeche` (jsdom, `tests/ui/**/*.test.tsx`, mit
`tests/ui/setup.ts`). Erste Render-Tests decken Tabellenblatt,
Inhaltsverzeichnis-Blatt und Fehlergrenze ab. Offen bleibt: mehr Komponenten
(`Ueben.tsx`, `Pruefung.tsx`, `Tabellen.tsx`, `KiWerkstatt.tsx`) direkt
rendern – die Blaetter sind erst der Anfang.

### 5. Fehlergrenze mit Render-Test (30.09., dritte Runde)
`main.tsx` rendert `App` in `Fehlergrenze`; ein Test in
`tests/ui/blaetter.test.tsx` löst einen echten Renderwurf aus und prüft, dass
statt einer leeren Seite die verständliche Ansicht erscheint.


## Umgesetzt 01.10. (zweite Analyse-Runde)

Die offenen Punkte oben sind bis auf den Termin-Takt abgearbeitet:

1. **Kaltstart** – `fuelleVorratMitSeed` läuft jetzt in `requestIdleCallback`
   (Fallback `setTimeout`); der erste Anstrich wartet nicht mehr darauf.
2. **Doppelarbeit** – die Runden-Schleife in `fuellung()` bricht ab, sobald
   `holeVorrat().length >= ziel`; kein Überbauen mehr.
3. **Wartezeit** – die KI-Nachfüllung holt beide Aufgaben nebenläufig
   (`Promise.allSettled`) statt nacheinander. Zwei Aufgaben kosten jetzt eine
   Netz-Runde statt zweier.
4. **Vorratsgrenzen** – `VORRAT_MINIMUM = 4`, `VORRAT_MAXIMUM = 60` passend zu
   `ablage.MAX = 60`, `KI_NACHLEGEN_MAX = 2`.

### Der Vorratsfehler und seine Ursache
`bereit` fiel über Zyklen zusammen (39 → … → 15 → 4 → 13), obwohl die Ablage
voll war. Grund: Die Füllung maß den Stand an der **Ablage**, nicht an den
wirklich **bereitliegenden** Aufgaben. Die Ablage ist ein Ringpuffer und zählte
alte, längst gestellte Aufgaben mit. Fix: alles misst `holeVorrat().length`.
Repro und Regressionsschutz in `tests/vorrat.test.ts` (20 Zyklen, stabil).

### Aufgabenbestand (das eigentliche Wachstum)
- Wissensfragen aus der Faktenbasis: `src/tasks/fragen.ts` (Wert- und
  Aussagefragen, Distraktoren aus Nachbarwerten).
- Verfahrensfragen: `src/tasks/wissen-prozess.ts` – kuratierte Sammlung für
  Funktionsanalyse, Fehlersuche, Messverfahren, Systementwurf. Diese Themen
  fragen kein Rechnen, sondern das Vorgehen; aus Fakten ist das nicht
  erzeugbar. Rund 90 Fragen.
- Smart-Distraktoren: `src/tasks/distraktoren.ts` erzeugt je Rezeptart die
  **echten** Denkfehler (√3 vergessen, cos φ vergessen, Faktor 1,45 falsch).
- Bestand: 332 → **1 798** verschiedene Aufgaben (über Frageform-Runden).
  Verteilung: Kundenauftrag 834, Systementwurf 320, WiSo 279, Teil 1 263,
  Funktionsanalyse 102.

### Zwei Fehler in der Aufgabenqualität, gefixt
- **Null-Antworten.** Distraktoren wie „richtig / 1000" wurden als „0,00"
  angezeigt (z. B. 2 kWh). `distraktorenFuer` verwirft jetzt alles, was als
  null erscheint, und alles außerhalb des Zwanzigfachen – sonst greift die
  Ersatzregel (doppelter/halber Wert).
- **Doppelte Fragetexte.** „Welchen Wert nennt die Norm für U₀?" entstand
  unter jedem Normthema neu. `seedAufgabenFuerAtome` und die Füllschleife
  führen jetzt ein Textgedächtnis über die Themen hinweg.

### Quellen
- `dguv4` war falsch betitelt („Arbeitsmedizinische Vorsorge" – das ist
  Vorschrift 7). Korrigiert auf „Elektrische Anlagen und Betriebsmittel".
- `schultabelle` bleibt bewusst **ungeprüft**: Es ist eine Berufsschul-/
  ZVEH-Konvention, kein Normwert; die Fakten sind mit `verification: 'offen'`
  gekennzeichnet. 46 von 47 Quellen sind am Original geprüft.

### Wissensbasis
224 Fakten, 47 Quellen. `formel` an `FaktOptionen`; neue Faktmodule
`hilfe.ts`, `tabellen.ts`, `wissen-technik.ts`, `wissen-gebaeude.ts`,
`wissen-wiso.ts`; Engine um Drehstromstrom, Spannungsfall mit cos φ,
Temperatur/Häufung, Scheinleistung, Isolations-/Widerstandswerte, Energie und
Kosten erweitert.

### Testlage
249 Tests in 24 Dateien, alle grün. Neu: `tests/vorrat.test.ts` (Stabilität),
`tests/seed.test.ts` um drei Qualitätszusicherungen erweitert.

### Offen
- Termin-Takt gegen die tatsächliche Sitzungszahl kalibrieren (Punkt 5 oben).
- Nutzeranforderung „Aufgab…" ist im Log abgeschnitten – Wortlaut erfragen.
