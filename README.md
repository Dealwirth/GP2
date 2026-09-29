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
| **KI-Erzeugung** | Groq, direkt und ohne Zwischenstation. Jede Aufgabe wird frisch erzeugt und muss dieselbe Prüfung nehmen: Rezept durch die Rechen-Engine, Faktenbindung, Duplikatsperre, Zweitprüfung. Der Aufgabenstrom mischt alle Prüfungsbereiche und wiederholt sich nicht. |
| **Prüfungssimulation** | Originalzeit, Originalpunkte, keine Rückmeldung vor dem Abgeben, Auswertung nach § 15 ElekAusbV. |
| **Labor** | **Geführter Kundenauftrag** (Wärmepumpe, Wallbox, PV: Planung gegen die Engine, Ausführungsreihenfolge mit Sicherheitsregeln, Fachgespräch), vier animierte Stationen, **Prüfgerät-Simulation**, Stromlaufplan-Prüfung, Messprotokoll, 16-Stunden-Ablauf. |
| **Prüfgerät** | Drehschalter mit acht Messarten, drei Buchsen, sechs Messpunkte, spannungsfrei/unter Spannung. Falsch eingestellt kommt die *echte* Anzeige heraus – 0 V bei falscher Buchse, O.L bei Widerstandsmessung unter Spannung, Kurzschluss bei Strommessung parallel. Gestaffelte Hilfe kostet 15 % Punkte je Stufe. Richtige Werte gehen mit einem Griff ins Prüfprotokoll. |
| **Lerngedächtnis** | Zustandsautomat mit Vergessen, Sicherheitsquote (geraten zählt halb), Digest, Coach-Überwachung. Die Reife **sinkt** bei schlechter Leistung (frisches Fünf-Versuche-Fenster) und **verfällt** nach Stillstand (zustandsabhängige Halbwertszeit: 7 Tage frisch, 21 gefestigt, 45 prüfungsreif). |
| **KI** | Direkt mit Groq, ohne Einrichtung. Aufgabenerzeugung aus dem Lernlager, Lernberatung, Verbindungstest. Jeder Fehler wird in Klartext plus **nächsten Schritt** übersetzt. |
| **Zustand** | Seite, laufende Sitzung, Prüfungsfortschritt samt Restzeit, Laborzustand, Messprotokoll und Filter überleben ein Neuladen. |
| **Bildschirmbreiten** | Telefon: eine Spalte, Navigation unten. Tablet: breiteres Feld, Karten zweispaltig. PC: Navigation als Leiste links, Inhalt zentriert im freien Raum. |
| **Termine** | Sommerprüfung 2027 mit Countdown, Fristen-Wächter und Phasenplan bis zum Prüfungstag. |
| **PWA** | Installierbar, offline nutzbar. |

## Datenhaltung

Standardmäßig liegt alles auf dem eigenen Gerät: Lernstand in `IndexedDB`,
Einstellungen im `localStorage` – kein Account, kein Server. Gelöschte
Browserdaten löschen den Stand mit; dafür gibt es zwei Auswege:

**Backup als Datei.** Der Export verschlüsselt den gesamten Stand mit
AES-GCM (PBKDF2, 150 000 Runden) – ohne Passwort gibt es keinen Export.


Der Stand hat ein eigenes Format mit Versionsnummer und wird fehltolerant
eingelesen – Code-Verbesserungen reißen ihn nicht aus.


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
  crypto/      AES-GCM/PBKDF2 – dieselbe Krypto für Backup und Sync
  storage/     Speicher-Adapter (IndexedDB)
  ui/          Oberfläche, ein React-State-Hook, keine Router-Bibliothek
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

## Veröffentlichen

Die Website läuft automatisch über **GitHub Pages**: Jeder Push auf `main`
wird vom Workflow geprüft, gebaut und auf
<https://dealwirth.github.io/GP2/> veröffentlicht. Diese Adresse eignet sich
für die **Webpage-Karte in Home Assistant** – die Tafel lädt bei jedem
Besuch den aktuellen Stand von GitHub, ohne dass etwas kopiert wird.

## KI-Anbindung

Die Aufgabenerzeugung ruft **Groq direkt** auf – kein Worker, kein Proxy,
keine Einrichtung. Der Schlüssel liegt im Quelltext (`src/ai/client.ts`),
weil der Trainer ein persönliches Lernwerkzeug ist. Wer einen eigenen
Schlüssel will: kostenlos auf [console.groq.com](https://console.groq.com),
dann in den Einstellungen eintragen.

Jede KI-Aufgabe durchläuft dieselbe Pipeline, bevor sie gestellt wird:

1. **Rezept** – die KI wählt eine Rechenvorschrift, die Rechen-Engine
   ermittelt daraus den richtigen Wert. Die KI kennt ihn nie.
2. **Optionsabgleich** – genau eine Antwortmöglichkeit muss zum Ergebnis
   passen; mehrdeutige Aufgaben werden verworfen.
3. **Faktenbindung** – jede Zahl im Aufgabentext muss auf einen
   Faktenbasis-Eintrag verweisen. Freie Zahlen scheitern an der Pipeline.
4. **Duplikatsperre** – dieselbe Aufgabe kommt nicht zweimal.
5. **Zweitprüfung** – ein Modellaufruf prüft Eindeutigkeit und
   Prüfungsnähe und wirft Beanstandetes heraus.

Grundlage jedes Prompts ist das **Lernlager** (`src/content/lernlager.ts`):
Themenbesprechungen, typische Prüfungsfragen und die je Thema erlaubten
Fakten mit Quellen.
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
