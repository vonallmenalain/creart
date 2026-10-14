// Fortlaufende Kunden- und Debitornummern.
// Die letzte vergebene Nummer steht in einem Zähler-Dokument (Sammlung "zaehler") und wird in
// einer Transaktion zusammen mit dem neuen Datensatz geschrieben. Zwei Geräte oder ein
// Doppelklick können so nie dieselbe Nummer erhalten.
// Ohne Verbindung sind Transaktionen nicht möglich: Dann wird der Datensatz ohne Nummer
// gespeichert und die Nummer automatisch nachgetragen, sobald wieder eine Verbindung besteht.
import { db, doc, collection, runTransaction, serverTimestamp } from './firestore.js';
import { anlegen } from './daten.js';

function nummerAus(code) {
    const treffer = String(code || '').match(/(\d+)(?!.*\d)/);
    return treffer ? parseInt(treffer[1], 10) : 0;
}

export const KUNDEN = {
    zaehler: 'kunden',
    sammlung: 'kunden_adressen',
    feld: 'kundennummer',
    format: (n) => `K${String(n).padStart(4, '0')}`,
    hoechste: (liste) => liste.reduce((max, a) => Math.max(max, nummerAus(a.kundennummer)), 0)
};

// Debitor-IDs zählen pro Jahr des Rechnungsdatums: D-2026-001, D-2026-002, …
export function debitorenFuer(jahr) {
    const muster = new RegExp(`^D-${jahr}-(\\d+)$`);
    return {
        zaehler: `debitoren_${jahr}`,
        sammlung: 'debitoren',
        feld: 'debitor_id',
        format: (n) => `D-${jahr}-${String(n).padStart(3, '0')}`,
        hoechste: (liste) => liste.reduce((max, d) => {
            const treffer = String(d.debitor_id || '').match(muster);
            return treffer ? Math.max(max, parseInt(treffer[1], 10)) : max;
        }, 0)
    };
}

// Liest den Zähler, erhöht ihn und gibt die neue Nummer zurück. "bekannteHoechste" stellt sicher,
// dass ein neuer (oder veralteter) Zähler nie unter bereits vorhandenen Nummern liegt.
async function naechsteNummer(tx, art, bekannteHoechste) {
    const zaehlerRef = doc(db, 'zaehler', art.zaehler);
    const snap = await tx.get(zaehlerRef);
    const letzte = Math.max(snap.exists() ? Number(snap.data().letzte) || 0 : 0, bekannteHoechste);
    tx.set(zaehlerRef, { letzte: letzte + 1, aktualisiert_am: serverTimestamp() });
    return art.format(letzte + 1);
}

function istVerbindungsfehler(fehler) {
    return ['unavailable', 'deadline-exceeded', 'failed-precondition'].includes(fehler?.code);
}

// Legt einen Datensatz mit neuer Nummer an. Rückgabe: { id, nummer } – nummer ist '' wenn offline.
export async function anlegenMitNummer(art, daten, bekannteListe) {
    if (navigator.onLine) {
        const ref = doc(collection(db, art.sammlung));
        try {
            const nummer = await runTransaction(db, async (tx) => {
                const neu = await naechsteNummer(tx, art, art.hoechste(bekannteListe));
                tx.set(ref, { ...daten, [art.feld]: neu, erstellt_am: serverTimestamp(), geaendert_am: serverTimestamp() });
                return neu;
            });
            return { id: ref.id, nummer };
        } catch (fehler) {
            if (!istVerbindungsfehler(fehler)) throw fehler;
            // Verbindung unterbrochen: wie offline weiter (die Transaktion hat nichts geschrieben).
        }
    }
    const id = await anlegen(art.sammlung, { ...daten, [art.feld]: '' });
    return { id, nummer: '' };
}

// Trägt eine fehlende Nummer nach. Rückgabe: neue Nummer oder null (bereits vorhanden).
export function nummerNachtragen(art, id, bekannteListe) {
    const ref = doc(db, art.sammlung, id);
    return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists() || snap.data()[art.feld]) return null;
        const neu = await naechsteNummer(tx, art, art.hoechste(bekannteListe));
        tx.update(ref, { [art.feld]: neu, geaendert_am: serverTimestamp() });
        return neu;
    });
}
