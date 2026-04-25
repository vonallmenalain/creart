# Detaillierte Prüfung: CreArt Buchhaltungs-WebApp

Datum der Prüfung: 2026-04-25

## Kurzfazit
Die App ist für eine kleine, operative Buchhaltung bereits **funktionsreich** (Journal, ER/Bilanz, Debitoren, Adressen, Ferienwohnung, Audit-Log, Undo). Die größten Hebel liegen nicht in mehr Features, sondern in:

1. **Sicherheits-/Datenintegritätsschicht** (XSS-Schutz, Undo absichern, serverseitige Regeln),
2. **besserer Nutzerführung** (weniger Alert/Confirm, klarere Formvalidierung, mehr Inline-Hinweise),
3. **Robustheit der Geschäftslogik** (Validierungen für Anteile/Beträge, Race-Conditions bei Nummernvergabe, konsistente Datums-/Zeitzonenbehandlung),
4. **Code-Struktur** (komponentenartige Render-Funktionen statt viel `innerHTML`/inline `onclick`).

---

## 1) Bedienbarkeit / UX (konkrete Beobachtungen + Vorschläge)

### 1.1 Positiv
- Mobile Breakpoints und responsives Verhalten sind in allen Hauptseiten vorhanden.
- Die Tab-Struktur trennt Aufgaben logisch (Erfassung vs. Auswertungen / Verwaltungsmodule).
- Im Debitor-Bereich gibt es bereits nützliche Workflows wie Kundenverknüpfung und Auto-Anlage.

### 1.2 Reibungspunkte für Nutzer

#### A) Zu viele modale/unterbrechende Dialoge (`alert`, `confirm`)
**Beobachtung:** Kritische und normale Aktionen laufen oft über Browser-Standarddialoge (`alert/confirm`) statt über konsistente UI-Feedback-Komponenten. Das wirkt technisch und nicht „app-artig“.

**Konkrete Verbesserung:**
- Einheitliche Toast-/Banner-Komponente für Erfolg/Fehler/Hinweise.
- Confirm-Dialog nur für destruktive Aktionen; normale Erfolge als unaufdringliche Toasts.
- Aktionen mit „Undo 5 Sekunden“ statt harter Confirms.

#### B) Inline-Event-Handler erschweren intuitive Weiterentwicklung
**Beobachtung:** Viele Buttons nutzen `onclick="..."` direkt im HTML. Das macht Verhalten schwerer nachvollziehbar, verringert Testbarkeit und erschwert konsistente UX-Patterns.

**Konkrete Verbesserung:**
- Sukzessive Umstellung auf `addEventListener` in klaren Controller-Blöcken.
- Event-Delegation für Tabellenzeilen und Action-Buttons.

#### C) Form-Validierung ist funktional, aber oft zu spät
**Beobachtung:** Viele Pflichtprüfungen passieren erst beim Speichern und melden generisch (z. B. „Daten fehlen“).

**Konkrete Verbesserung:**
- Feldnahe Live-Validierung (rote Umrandung + Hilfetext unter Feld).
- Präzise Fehltexte („Betrag muss > 0 sein“, „Soll/Haben dürfen nicht identisch sein“).
- Buttons deaktivieren, solange Kernregeln nicht erfüllt sind.

#### D) Tab-/Navigationslogik kann barriereärmer werden
**Beobachtung:** Tabs sind visuell gut, aber es fehlen ARIA-Rollen/Tastatur-Navigation.

**Konkrete Verbesserung:**
- `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`.
- Pfeiltastensteuerung und Fokusmanagement für bessere Accessibility.

---

## 2) Intuitive Seitenstruktur (IA)

### 2.1 Positiv
- `eingabe.html` für Kernbuchungen und `verwaltung.html` für Stammdaten ist grundsätzlich nachvollziehbar.
- Jahresfokus (Jahresauswahl) passt zur Buchhaltungslogik.

### 2.2 Verbesserungspotenzial

#### A) Hohe Funktionsdichte pro Seite
**Problem:** `verwaltung.html` vereint sehr viele Domänen in einer Datei/einem Kontext (Events, Adressen, Debitoren, Ferienwohnung, Export, Duplikate). Für neue Nutzer steigt die kognitive Last.

**Vorschlag (ohne große Neuentwicklung):**
- Start-Dashboard in der Verwaltung mit „Was willst du tun?“-Kacheln.
- Pro Modul Kurzbeschreibung + letzte Aktionen + primäre CTA.
- „Schnellaktionen“ in Header (z. B. „Neue Rechnung“, „Neue Buchung“, „Neue Adresse“).

#### B) Primäre Nutzerpfade nicht hervorgehoben
**Problem:** Experten finden sich zurecht, Gelegenheitsnutzer suchen länger.

**Vorschlag:**
- Progressive Disclosure: Standardansicht reduziert, „Erweitert“ aufklappbar.
- Erste Schritte-/Tooltip-Layer beim ersten Login.

---

## 3) Logik im Hintergrund (Datenqualität, Sicherheit, Konsistenz)

### 3.1 Kritisch priorisieren (P1)

#### A) XSS-/HTML-Injection-Risiko durch viele `innerHTML`-Renderings
**Beobachtung:** Benutzer-/Datenbankinhalte werden wiederholt per Template-Strings in `innerHTML` geschrieben (Journal, Tabellen, Log-Details etc.).

**Risiko:** Eingetragene Texte (z. B. Bemerkungen, Namen) könnten als HTML/Script interpretiert werden.

**Maßnahme:**
- Zentrales `escapeHtml()` einführen und bei allen String-Inhalten anwenden.
- Mittelfristig DOM-APIs (`createElement`, `textContent`) statt String-HTML.
- CSP-Header setzen (falls Hosting dies erlaubt).

#### B) Undo im Admin-Tool ohne zusätzliche Schutzmechanik
**Beobachtung:** Undo setzt bzw. löscht Daten direkt anhand Log-Dokument.

**Risiko:** Fehlbedienung oder Manipulation von Log-Daten kann produktive Daten überschreiben.

**Maßnahme:**
- Undo nur für definierte Rollen + optional 2. Bestätigung bei kritischen Collections.
- „Soft Undo“: Snapshot in `restore_jobs` schreiben, serverseitig prüfen und dann anwenden.
- Immer Audit-Eintrag „UNDO_EXECUTED“ mit User-ID/Zeit/Quelle erzeugen.

### 3.2 Hohe Priorität (P2)

#### C) Firestore-Regeln/Servervalidierung fehlen im Frontend-Kontext
**Beobachtung:** Die App verlässt sich stark auf Frontend-Logik.

**Risiko:** Direkte API-Zugriffe könnten Regeln umgehen, falls Security Rules nicht streng sind.

**Maßnahme:**
- Firestore Security Rules nach Domäne härten (feldweise erlaubte Updates, Rollen, Ownership).
- Kritische Schreibpfade über Cloud Functions kapseln (z. B. Nummernvergabe, Undo, Merge).

#### D) Race-Conditions bei ID-/Nummernvergabe
**Beobachtung:** Kundennummern/Debitornummern werden clientseitig hochgezählt/gesetzt.

**Risiko:** Gleichzeitige Nutzer können doppelte oder kollidierende Nummern erzeugen.

**Maßnahme:**
- Serverseitige sequenzielle Nummernvergabe per Transaction/Counter-Dokument.

#### E) Geld- und Anteilskonsistenz
**Beobachtung:** Geld wird korrekt in Rappen gespeichert, aber Anteilsfelder/gesamtbetragsnahe Logik sollte strenger abgesichert werden.

**Maßnahme:**
- Validierung: `anteil_intern + anteil_privat <= betrag` (oder exakt =, je nach Fachregel).
- Einheitliche Rundungsstrategie dokumentieren (Banker’s rounding vs. kaufmännisch).

### 3.3 Mittlere Priorität (P3)

#### F) Datums-/Zeitzonenkonsistenz
**Beobachtung:** Mischung aus String-Datum (`YYYY-MM-DD`) und Timestamps.

**Risiko:** Grenzfälle bei Tageswechsel/Filter „bis“-Datum.

**Maßnahme:**
- Einheitliche Domänenregel definieren: „fachliches Datum“ vs. „technischer Timestamp“.
- Serverseitige Normalisierung auf UTC + klare UI-Darstellung in lokaler Zeitzone.

#### G) Große Monolith-Dateien erhöhen Fehleranfälligkeit
**Beobachtung:** Sehr lange Einzeldateien erschweren Regression-Tests und Onboarding.

**Maßnahme:**
- Schrittweise aufteilen in Module: `services/`, `ui/`, `state/`, `validators/`.
- Shared Utils für Währungsformat, Datum, Escape, Toasts, Confirm.

---

## 4) Empfohlener Umsetzungsplan

## Phase 1 (1–2 Wochen, größter Hebel)
1. `escapeHtml` + sichere Rendering-Helfer einführen.
2. Toast-System + Inline-Validierung für die Top-3 Formulare (Journal, Debitor, Adresse).
3. Zusätzliche Prüfungen für Betrags-/Anteilskonsistenz.
4. Undo absichern (Rolle + zusätzliche Protokollierung).

## Phase 2 (2–4 Wochen)
1. Nummernvergabe serverseitig transaktional.
2. Firestore Rules-Härtung + kurze Threat-Review.
3. Module schrittweise entkoppeln (erst Utilities, dann Debitor/Adresse).

## Phase 3 (laufend)
1. Accessibility-Verbesserungen (ARIA + Keyboard).
2. Guided UX für neue Nutzer.
3. Kleine E2E-Tests für Kernpfade (Buchen, Debitor speichern, Undo, Filter).

---

## 5) Konkrete „Quick Wins“ (sofort umsetzbar)

1. Alle Erfolgsmeldungen als Toast statt `alert`.
2. Einheitliche Fehlermeldungen je Feld statt Sammelmeldung.
3. „Speichern“-Buttons erst aktivieren, wenn Mindestregeln erfüllt.
4. Escape aller sichtbaren Freitext-Inhalte vor `innerHTML`.
5. Undo-Button mit zusätzlicher Kontextanzeige („Collection / ID / letzter Stand“).

---

## 6) Priorisierte Backlog-Liste

- **P1:** XSS-Schutz + Undo-Schutz + Security-Review.
- **P2:** Nummernvergabe serverseitig + Validierungsregeln härten.
- **P3:** Struktur/Modularisierung + Accessibility + UX-Onboarding.

