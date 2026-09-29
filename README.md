# EGT-Prüfungstrainer

Lernplattform für die Gesellenprüfung **Teil 2**, Elektroniker/in für Energie- und
Gebäudetechnik (Bayern, Kammerbezirk Schweinfurt).

Statische Web-App. **0 € · keine Kreditkarte · Lerndaten bleiben im Browser.**

## Die eine Regel, auf der alles aufbaut

**Die KI darf nichts wissen, nur vorschlagen.**

`TaskProposal` hat bewusst *kein* Feld für einen Lösungswert. Wer eine korrekte
Antwort erzeugen will, muss durch die Rechen-Engine und die Validierungspipeline.
Der einzige Weg zu einer Aufgabe führt über `baueTask()` – und das wirft, sobald
eine Prüfung fehlschlägt. Die Trennung ist im Typensystem erzwungen, nicht in
einer Konvention.

Jede gespeicherte Antwort trägt `factVersion`, `ruleVersion` und `engineVersion`.
Du kannst damit noch in einem Jahr nachvollziehen, warum etwas so bewertet wurde.

### Zwei Regeln, die leicht zu verletzen sind

**Eine Quellenangabe ist keine Prüfungsangabe.** Die Herkunft einer Zahl
(`Aufgabenstellung`, `Faktenbasis`, `Berufsbildposition 1`) steht neben dem
Aufgabentext, nicht darin – als `verweis` und `herkunft` am `Task`. Stünde sie
im Text, müsste die Faktenbindung die Zahlen einer Literaturangabe als
Sachwerte durchwinken und verlöre damit ihre Schutzwirkung.

**Ein fehlerhafter Datensatz darf nie die Seite leeren.** Die statischen
Sammlungen bauen ihre Einträge einzeln auf (`robust.ts`). Fällt einer aus, wird
er übersprungen und der Grund festgehalten. Zur Laufzeit bleibt die App
bedienbar, im Test muss die Fehlerliste leer sein – Weggucken wäre falsch,
Abstürzen aber auch.

## Was drin ist

| Bereich | Inhalt |
|---|---|
| **Faktenbasis v1.0** | 33 Einträge mit Quelle, Gültigkeitszeitraum, Region und Prüfstatus. 7 Werte sind noch nicht am Original geprüft – sie werden als offen gekennzeichnet, statt als gesichert aufzutauchen. |
| **Rechen-Engine** | Deterministisch. Strombelastbarkeit, Absicherung, Abschaltbedingung, Schleifenwiderstand, Spannungsfall. Jedes Ergebnis nennt die verwendete Regel und liefert Lösungsschritte. |
| **Lernpfad** | 211 Themen in 32 Kapiteln, gegliedert nach den Berufsbildpositionen der Fachrichtung EGT (§ 4 ElekAusbV). |
| **Aufgabenvorrat** | 81 geprüfte Aufgaben in allen drei Antwortformaten der Prüfung: `mc`, `fall` und `strukturiert`/`offen`. Rechen- und Kennwerte aus der Faktenbasis, plus kuratierte Fallaufgaben, Fachfragen und WiSo-Fragen für alle vier Bereiche von Teil 2. |
| **KI-Erzeugung** | Groq über einen kostenlosen Cloudflare-Worker. Schema-Zwang, Gegenrechnung, Zweitprüfung, Duplikatsperre. Fällt der Worker aus, läuft alles ohne KI weiter. |
| **Prüfungssimulation** | Originalzeit, Originalpunkte, keine Rückmeldung vor dem Abgeben, Auswertung nach § 15 ElekAusbV. |
| **Labor** | Vier animierte Stationen, **Prüfgerät-Simulation**, Stromlaufplan-Prüfung, Messprotokoll, 16-Stunden-Ablauf des Kundenauftrags. |
| **Prüfgerät** | Drehschalter mit acht Messarten, drei Buchsen, sechs Messpunkte, spannungsfrei/unter Spannung. Falsch eingestellt kommt die *echte* Anzeige heraus – 0 V bei falscher Buchse, O.L bei Widerstandsmessung unter Spannung, Kurzschluss bei Strommessung parallel. Gestaffelte Hilfe kostet 15 % Punkte je Stufe. Richtige Werte gehen mit einem Griff ins Prüfprotokoll. |
| **Lerngedächtnis** | Zustandsautomat mit Vergessen, Sicherheitsquote (geraten zählt halb), Digest, Coach-Überwachung. Die Reife **sinkt** bei schlechter Leistung (frisches Fünf-Versuche-Fenster) und **verfällt** nach Stillstand (zustandsabhängige Halbwertszeit: 7 Tage frisch, 21 gefestigt, 45 prüfungsreif). |
| **KI** | Kostenlos über Cloudflare Worker oder direkt mit Groq-Schlüssel. Aufgabenerzeugung in der KI-Werkstatt, Lernberatung, Verbindungstest. Jeder Fehler wird in Klartext plus **nächsten Schritt** übersetzt. Die Beratung funktioniert auch ohne KI – dann aus dem Lernstand gerechnet. |
| **Zustand** | Seite, laufende Sitzung, Prüfungsfortschritt samt Restzeit, Laborzustand, Messprotokoll und Filter überleben ein Neuladen. |
| **Überall verfügbar** | Optional: Der Lernstand liegt zusätzlich Ende-zu-Ende verschlüsselt (AES-GCM, PBKDF2) beim eigenen Cloudflare-Worker. Zweites Gerät = Verbindungscode + Passwort. Der Server sieht nur Chiffre, nie Aufgaben oder Lösungen. |
| **Bildschirmbreiten** | Telefon: eine Spalte, Navigation unten. Tablet: breiteres Feld, Karten zweispaltig. PC: Navigation als Leiste links, Inhalt zentriert im freien Raum. |
| **Termine** | Sommerprüfung 2027 mit Countdown, Fristen-Wächter und Phasenplan bis zum Prüfungstag. |
| **PWA** | Installierbar, offline nutzbar. |

## Datenhaltung

Standardmäßig liegt alles auf dem eigenen Gerät: Lernstand in `IndexedDB`,
Einstellungen im `localStorage` – kein Account, kein Server. Gelöschte
Browserdaten löschen den Stand mit; dafür gibt es zwei Auswege:

**Backup als Datei.** Der Export verschlüsselt den gesamten Stand mit
AES-GCM (PBKDF2, 150 000 Runden) – ohne Passwort gibt es keinen Export.

**Überall verfügbar (optional).** In den Einstellungen legt man den Stand
zusätzlich auf den eigenen Cloudflare-Worker – Ende-zu-Ende verschlüsselt,
mit demselben Verfahren. Der Abgleich führt beide Seiten **zusammen**, statt
eine durch die andere zu ersetzen; wer schneller antwortet, gewinnt bei den
Antwortzahlen, ansonsten zählt der jüngere Eintrag. Der Server sieht nur
Chiffre. Auf einem zweiten Gerät genügen der Verbindungscode (`EGT1-…`,
enthält Worker-Adresse und Kennung, **kein Passwort**) und dasselbe Passwort.

Der Stand hat ein eigenes Format mit Versionsnummer und wird fehltolerant
eingelesen – Code-Verbesserungen reißen ihn nicht aus.

Der KI-Proxy speichert nichts. Er prüft Herkunft und Raten und leitet weiter.

## Befehle

```bash
npm install
npm run dev          # Entwicklung
npm run typecheck    # tsc --noEmit
npm test             # Vitest
npm run facts:check  # offene, noch ungeprüfte Werte auflisten
npm run build        # Produktions-Build nach dist/
```

## Aufbau

```
src/
  content/     Faktenbasis, Prüfungsrahmen, Lernpfad, kuratierte Fragenbestände
  domain/      Typen, Zustandsautomat, Termine, Prüfungssimulation
  engine/      Rechenkern
  validation/  Pipeline – der einzige Weg zu einer Aufgabe
  tasks/       Aufgabengeneratoren, Sitzungs-Baukasten, Rezeptauflösung
  ai/          Groq-Client, Prompts, Zweitprüfung
  memory/      Lerngedächtnis, Digest, Coach
  labor/       Stationen, Stromlaufplan, Prüfprotokoll, 16-Stunden-Ablauf
  sync/        Verschlüsselter Abgleich: Merge-Regeln, Transport, Verbindungscode
  crypto/      AES-GCM/PBKDF2 – dieselbe Krypto für Backup und Sync
  storage/     Speicher-Adapter (IndexedDB)
  ui/          Oberfläche, ein React-State-Hook, keine Router-Bibliothek
worker/         Cloudflare-Worker: KI-Proxy + verschlüsselter Sync-Speicher (KV)
```

Der Lerncode ist reines TypeScript ohne React – deshalb ist er ohne Browser
testbar. Die Oberfläche ist austauschbar.

## Prüfungstermine (Stand: 08.09.2026)

Die Gesellenprüfung Teil 2 ist eine **Handwerksprüfung** nach HwO. Prüfende
Stelle ist der Fachverband Elektro- und Informationstechnik Bayern gemeinsam
mit der **Handwerkskammer für Unterfranken** (Rennweger Ring 3, 97074
Würzburg, Tel. 0931 30908-0, Prüfungsreferat -1186) – **nicht** die IHK
Würzburg-Schweinfurt. Die Daten der IHK-Liste dienen nur der Orientierung;
maßgeblich ist allein das Einladungsschreiben.

| | Termin | Herkunft |
|---|---|---|
| Anmeldung Sommerprüfung | 15.01. – 15.02.2027 | Arbeitsannahme |
| Unterweisungsnachweis vollständig | 01.03.2027 | Arbeitsannahme |
| Teil 2 schriftlich | 11.05.2027 | Orientierung (IHK-Liste) |
| Teil 2 praktisch | ab 07.06.2027 | Orientierung (IHK-Liste) |

Termine lassen sich in den Einstellungen überschreiben. Trägt man dort die
Daten aus dem Einladungsschreiben ein, gelten sie in der ganzen App als
amtlich; an jedem Termin steht die Herkunftsstufe daneben, und die Kammer
mit Kontakt ist auf der Stand-Seite vermerkt.

## Veröffentlichen (kostenlos, ohne Kreditkarte)

**1. Website auf Cloudflare Pages**

1. Konto auf dash.cloudflare.com anlegen
2. Workers & Pages → Create → Pages → „Connect to Git"
3. Repository **GP2** auswählen
4. Build-Befehl `npm run build`, Ausgabeverzeichnis `dist`

Private Repositories sind im Gratis-Tarif erlaubt. Es wird nichts aus dem
Quelltext geladen, was nicht Allgemeinwissen ist: keine Schlüssel, kein
Lernstand, keine Notizen.

**1b. Website über GitHub Pages (Alternative)**

Läuft automatisch: Jeder Push auf `main` wird vom Workflow geprüft, gebaut
und auf <https://dealwirth.github.io/GP2/> veröffentlicht. Einrichtung war
einmalig (Settings → Pages → Source: GitHub Actions). Diese Adresse eignet
sich für die **Webpage-Karte in Home Assistant** – die Tafel lädt dann bei
jedem Besuch den aktuellen Stand von GitHub, ohne dass etwas kopiert wird.

**2. Worker: KI-Proxy und Sync-Speicher (einmalig)**

```bash
npx wrangler kv namespace create egt-sync   # erzeugte id in die wrangler.toml eintragen
npx wrangler deploy
npx wrangler secret put GROQ_API_KEY
```

Die Namespace-Id kommt in `wrangler.toml` in den Block `[[kv_namespaces]]`
(dort auskommentiert vorgemerkt). Ohne KV läuft der KI-Proxy, aber kein Sync;
die App zeigt das in den Einstellungen an. Anschließend die Worker-Adresse
(`https://<name>.workers.dev`) in den Einstellungen eintragen. Fällt der
Worker aus, ist nur die Aufgabenerzeugung stumm und der Stand bleibt lokal –
Lernpfad, Wiederholung und Prüfungssimulation laufen ohne KI weiter.

## Zwei Wege, die nicht vermischt werden

Leiterquerschnitt und Absicherung lassen sich über die Referenzwerte I_z oder
über die vereinfachten Absicherungswerte der Berufsschule berechnen. Beide Wege
sind getrennt gepflegt, die Engine rechnet auf Wunsch und schreibt die
verwendete Regel in die Lösung. In der Aufgabe steht, welcher Weg benutzt wurde.

## Was noch offen ist

- 122 der 211 Lernpfad-Themen haben noch keine fertige Aufgabe. Sie werden über
  die KI erzeugt; ohne API-Schlüssel bleiben sie leer. Das ist in der
  Prüfungssimulation sichtbar, statt eine Lücke zu verdecken.
- 7 Werte der Faktenbasis sind noch nicht am Original geprüft: I_z-Tabelle,
  Schultabelle, ρ-Faktor, R_iso-Grenzwert, U₀ für besondere Stromkreise im
  Freien, Spannungsfall mit cos φ.
