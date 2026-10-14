# Firestore-Regeln

Die gültigen Regeln stehen in `firestore.rules`. Änderungen laufen über einen
Pull Request:

1. **PR:** Die GitHub Action „Firestore-Regeln“ prüft die Regeln gegen den
   Firestore-Emulator. Beide berechtigten Konten müssen alles lesen und
   schreiben können, fremde und nicht angemeldete Zugriffe müssen scheitern.
   Schlägt ein Test fehl, wird nichts veröffentlicht.
2. **Merge auf `main`:** Die Action veröffentlicht die Regeln im Projekt
   `buchhaltung-9c1c9`. Sind sie bereits aktuell, passiert nichts.

Wichtig: Regeln, die direkt in der Firebase-Konsole geändert werden, werden
beim nächsten Veröffentlichen aus dem Repository überschrieben. Änderungen
deshalb immer hier vornehmen.

## Einmalige Einrichtung: Schlüssel hinterlegen

1. Firebase-Konsole → Projekt **buchhaltung-9c1c9** → Zahnrad →
   **Projekteinstellungen** → Reiter **Dienstkonten** →
   **Neuen privaten Schlüssel generieren**. Es wird eine JSON-Datei
   heruntergeladen.
2. GitHub → Repository **creart** → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: den gesamten Inhalt der JSON-Datei einfügen
3. Die heruntergeladene JSON-Datei danach löschen. Der Schlüssel hat vollen
   Zugriff auf das Firebase-Projekt und gehört nirgends sonst hin.
4. Test: GitHub → **Actions** → **Firestore-Regeln** → **Run workflow**.

Ohne Secret läuft der Test trotzdem; das Veröffentlichen wird mit einer Warnung
übersprungen.

## Lokal ausführen

```bash
cd firebase
npm ci
npm run test:rules          # braucht Java 11+
FIREBASE_SERVICE_ACCOUNT="$(cat schluessel.json)" npm run deploy:rules
```
