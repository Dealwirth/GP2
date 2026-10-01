# EGT-Prüfungstrainer

Lernplattform für die Gesellenprüfung **Teil 2**, Elektroniker/in für Energie- und
Gebäudetechnik (Bayern, Kammerbezirk Schweinfurt).

Statische Web-App. **0 € · keine Kreditkarte · Lerndaten bleiben im Browser.**

## Die eine Regel, auf der alles aufbaut

**Keine Zahl ohne Beleg.**

`TaskProposal` hat bewusst *kein* Feld für einen Lösungswert. Wer eine korrekte
Antwort erzeugen will, muss durch die Rechen-Engine und die Validierungspipeline.
Der einzige Weg zu einer Aufgabe führt über `baueTask()` – und das wirft, sobald
eine Prüfung fehlschlägt. Die Trennung ist im Typensystem erzwungen, nicht in
einer Konvention.

Die App ist vollständig statisch: keine KI, kein Modellaufruf, kein
API-Schlüssel. Alle Aufgaben entstehen aus der Faktenbasis, der Rechen-Engine
und dem kuratierten Fragenbestand – auf dem Gerät, ohne Netz.

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
| **Faktenbasis v1.0** | Werte mit Quelle, Gültigkeitszeitraum, Region und Prüfstatus. Jeder Fakt verweist auf ein Quellenverzeichnis mit Kennung und Bezugsweg; offene Werte werden als offen gekennzeichnet, statt als gesichert aufzutauchen. |
| **Rechen-Engine** | Deterministisch. Strombelastbarkeit, Absicherung, Abschaltbedingung, Schleifenwiderstand, Spannungsfall. Jedes Ergebnis nennt die verwendete Regel und liefert Lösungsschritte. |
| **Lernpfad** | 216 Themen in 33 Kapiteln, gegliedert nach den Berufsbildpositionen der Fachrichtung EGT (§ 4 ElekAusbV). |
| **Aufgabenvorrat** | 224 geprüfte Aufgaben in allen Antwortformaten der Prüfung: `mc`, `fall`, `strukturiert`/`offen` sowie die interaktiven Formate `wahr-falsch`, `zuordnung`, `reihenfolge`, `luecke` und `zahl`. Rechen- und Kennwerte aus der Faktenbasis, plus kuratierte Fallaufgaben, Fachfragen, Verfahrensfragen, interaktive Aufgaben und WiSo-Fragen für alle vier Bereiche von Teil 2. Aus den Themen entstehen darüber hinaus mehrere tausend Aufgaben (Faktenwert-, Wissens- und Verfahrensfragen). |
| **Validierungspipeline** | Jede Aufgabe – ob gerechnet oder kuratiert – nimmt dieselbe Prüfung: Rezept durch die Rechen-Engine, Faktenbindung, Duplikatsperre, Gültigkeitsprüfung. Der Aufgabenstrom mischt alle Prüfungsbereiche und wiederholt sich nicht. |
| **Prüfungssimulation** | Originalzeit, Originalpunkte, keine Rückmeldung vor dem Abgeben, Auswertung nach § 15 ElekAusbV. |
| **Kundenauftrag** | Geführter Kundenauftrag zur praktischen Prüfung (Wärmepumpe, Wallbox, PV, Geräteprüfung): Planung gegen die Engine, Ausführungsreihenfolge mit den fünf Sicherheitsregeln, Prüf- und Messergebnisse, Fachgespräch – bewertet nach dem PAL-Schema. |
| **Lerngedächtnis** | Zustandsautomat mit Vergessen, Sicherheitsquote (geraten zählt halb), Digest, Coach-Überwachung. Die Reife **sinkt** bei schlechter Leistung (frisches Fünf-Versuche-Fenster) und **verfällt** nach Stillstand (zustandsabhängige Halbwertszeit: 7 Tage frisch, 21 gefestigt, 45 prüfungsreif). |
| **Interaktive Formate** | Richtig/Falsch, Zuordnung, Reihenfolge, Zahleneingabe und Lückentext. Teilpunkte statt Schwarz-Weiß: Wer vier von fünf Paaren richtig zuordnet, hat den Stoff weitgehend verstanden. |
| **Zustand** | Seite, laufende Sitzung, Prüfungsfortschritt samt Restzeit und Filter überleben ein Neuladen. |
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
  memory/      Lerngedächtnis, Digest, Coach
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

## Die Validierungspipeline

Jede Aufgabe – ob gerechnet oder kuratiert – durchläuft dieselbe Pipeline,
bevor sie gestellt wird:

1. **Rezept** – wo eine Zahl gefragt ist, führt die Rechen-Engine die
   Rechenvorschrift aus. Sie ermittelt den richtigen Wert deterministisch.
2. **Optionsabgleich** – genau eine Antwortmöglichkeit muss zum Ergebnis
   passen; mehrdeutige Aufgaben werden verworfen.
3. **Faktenbindung** – jede Zahl im Aufgabentext muss auf einen
   Faktenbasis-Eintrag zurückgehen. Freie Zahlen scheitern an der Pipeline.
4. **Duplikatsperre** – dieselbe Aufgabe kommt nicht zweimal.
5. **Gültigkeitsprüfung** – zitierte Fakten müssen existieren und im
   Gültigkeitszeitraum liegen.

Kuratierten Aufgaben liegt das **Lernlager** (`src/content/lernlager.ts`)
zugrunde: Themenbesprechungen, typische Prüfungsfragen und die je Thema
erlaubten Fakten mit Quellen.
## Zwei Wege, die nicht vermischt werden

Leiterquerschnitt und Absicherung lassen sich über die Referenzwerte I_z oder
über die vereinfachten Absicherungswerte der Berufsschule berechnen. Beide Wege
sind getrennt gepflegt, die Engine rechnet auf Wunsch und schreibt die
verwendete Regel in die Lösung. In der Aufgabe steht, welcher Weg benutzt wurde.

## Was noch offen ist

- Nicht zu jedem der 216 Lernpfad-Themen liegt bereits eine kuratierte
  Aufgabe vor. Jedes Thema trägt aber mindestens eine Aufgabe aus der
  Faktenbasis, dem interaktiven Bestand oder den Verfahrensfragen. Was fehlt,
  ist in der Prüfungssimulation sichtbar, statt eine Lücke zu verdecken.
- 7 Werte der Faktenbasis sind noch nicht am Original geprüft: I_z-Tabelle,
  Schultabelle, ρ-Faktor, R_iso-Grenzwert, U₀ für besondere Stromkreise im
  Freien, Spannungsfall mit cos φ.
