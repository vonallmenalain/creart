# Analyse: Hohe Firestore-Lesezugriffe in der Buchhaltungs-Webapp

## Kurzfazit
Die App nutzt an mehreren Stellen **dauerhafte `onSnapshot`-Listener** auf großen Collections. Das ist funktional praktisch, kann aber bei mehreren offenen Tabs, vielen Dokumenten und häufigen Änderungen schnell zu sehr vielen Lesevorgängen führen.

Zusätzlich gibt es Stellen, wo komplette Collections ohne Einschränkung geladen werden (z. B. `kunden_adressen`, `debitoren`).

---

## Beobachtungen im aktuellen Code

1. **Echtzeit-Listener auf Jahresdaten im Journal (`eingabe.html`)**
   - `buchungen` mit Jahresfilter + Sortierung via `onSnapshot`.
   - `eroeffnungsbilanz` mit Jahresfilter via `onSnapshot`.
   - Das ist korrekt für Realtime, erzeugt aber bei jedem Tab eine dauerhafte Verbindung und Re-Syncs.

2. **Admin-Log als Realtime-Listener (`admin.html`)**
   - Audit-Logs werden mit `onSnapshot` (inkl. Filter, Datum, Limit) geladen.
   - Für Admin-Auswertungen reicht häufig auch ein explizites Nachladen/Refresh (statt permanenter Realtime).

3. **Verwaltung lädt große Datenmengen in Realtime (`verwaltung.html`)**
   - `onSnapshot(collection(db, 'kunden_adressen'))`
   - `onSnapshot(collection(db, 'debitoren'))`
   - Beide aktuell ohne Jahres-/Status-Grenzen → potenziell viele Dokumente.

4. **Automatische Korrektur-Updates direkt im Snapshot-Flow (`verwaltung.html`)**
   - `ensureKundenNummern()` und `ensureDebitorIds()` schreiben `updateDoc(...)` innerhalb des Listener-Flows bei fehlenden IDs.
   - Diese Writes triggern wiederum Listener-Updates (also zusätzliche Reads/Writes).

5. **Offline-Cache war uneinheitlich aktiviert**
   - In `verwaltung.html` war IndexedDB-Persistence bereits aktiv.
   - In `eingabe.html` und `admin.html` war sie nicht aktiv.

---

## Bereits umgesetzte Sofortmaßnahme

Ich habe IndexedDB-Persistence (Firestore Browser-Cache) zusätzlich in folgenden Seiten aktiviert:

- `eingabe.html`
- `admin.html`

Das reduziert typischerweise Netzwerk-Lesezugriffe bei wiederholten Besuchen, Reloads und kurzfristigen Navigationswechseln deutlich.

---

## Konkrete Optimierungsvorschläge (Priorisiert)

## P1 – Große Hebel (meist sofort spürbar)

1. **Realtime nur dort nutzen, wo sie wirklich nötig ist**
   - Admin-Log von `onSnapshot` auf `getDocs` + "Aktualisieren"-Button umstellen.
   - Ergebnis: Weniger dauerhafte Listener, deutlich weniger Hintergrund-Reads.

2. **Listener lifecycle steuern (Page Visibility API)**
   - Wenn Tab nicht sichtbar: Listener sauber unsubscriben.
   - Beim Zurückkommen: neu subscriben.
   - Ergebnis: Offene, inaktive Tabs erzeugen kaum noch Live-Reads.

3. **Debitoren/Adressen nicht als komplette Collection streamen**
   - Entweder:
     - auf Paging (`limit`, `startAfter`) umstellen, oder
     - auf filterbare Ansichten (z. B. nach Jahr/Status), oder
     - in vielen Fällen `getDocs` statt `onSnapshot`.

## P2 – Datenmodell / Query-Design

4. **Dokumente für häufige Listen denormalisieren**
   - Eine "List-View"-Collection mit nur benötigten Feldern kann Reads billiger machen.

5. **Summen serverseitig voraggregieren**
   - Für Dashboards/Matrix/Jahressummen statt alle Rohdaten zu laden:
     - z. B. Cloud Function/Batch schreibt monatliche oder jährliche Summendokumente.

6. **Nur notwendige Zeitfenster laden**
   - Nicht immer direkt ganzes Jahr.
   - Standard z. B. "letzte 90 Tage", optional "ganzes Jahr".

## P3 – Betriebs- und UX-Maßnahmen

7. **"Lazy loading" für schwere Tabs**
   - Listener erst starten, wenn Tab tatsächlich geöffnet wird.

8. **Automatische Nummernvergabe aus Listenern herauslösen**
   - Einmalige Migration oder Cloud Function bei Create.
   - Verhindert Write-Read-Schleifen.

9. **Monitoring einbauen**
   - Firebase Usage + Performance Monitoring + Logging je View:
     - Anzahl aktive Listener
     - geladene Dokumente pro Screen
     - Reads pro Benutzer/Tag

---

## Browser-Cache: Was konkret sinnvoll ist

1. **Firestore IndexedDB Persistence überall aktivieren** (jetzt in allen drei Hauptseiten umgesetzt).
2. **Service Worker für statische Assets** (HTML/CSS/JS) einsetzen:
   - `stale-while-revalidate` für App-Shell.
   - reduziert Ladezeit und indirekt erneute Initial-Reads.
3. **Cache invalidation klar definieren**
   - Firestore übernimmt Datenkonsistenz der Dokumente,
   - statische Assets versionieren (z. B. `app.v3.js`).
4. **Mehrtab-Szenario bewusst handhaben**
   - Bei vielen parallel geöffneten Tabs steigen Listener und Re-Syncs.
   - Nutzerhinweis oder aktive Begrenzung pro Rolle kann helfen.

---

## Vorschlag für nächste Umsetzungsetappe

1. Admin-Log von Realtime auf manuelles Nachladen + Intervall optional (z. B. alle 60s) umstellen.
2. Adress-/Debitorenlisten auf Paging + Suchfilter umbauen (keine Voll-Collection-Streams mehr).
3. Visibility-basierte Unsubscribe/Resubscribe-Logik zentral implementieren.
4. Nummernvergabe serverseitig (Cloud Function) statt im Client-Listener.

Wenn du willst, kann ich im nächsten Schritt direkt **P1.1 + P1.2** in Code umsetzen (mit minimalem Risiko und klar messbarem Effekt bei den Reads).
