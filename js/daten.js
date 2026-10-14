// Zentrale Schreibzugriffe auf Firestore.
// Firestore speichert jede Änderung sofort im lokalen Cache und überträgt sie, sobald eine
// Verbindung besteht. Damit Knöpfe ohne Verbindung nicht hängen bleiben, wird höchstens
// WARTEZEIT_MS auf die Bestätigung des Servers gewartet; danach gilt die Änderung als lokal
// gespeichert und wird im Hintergrund übertragen.
import { db, collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from './firestore.js';
import { toast } from './ui.js';

const WARTEZEIT_MS = 4000;
let ausstehend = 0;

function meldeAusstehend() {
    document.dispatchEvent(new CustomEvent('creart:ausstehend', { detail: ausstehend }));
}

// Liefert 'ok' (vom Server bestätigt) oder 'lokal' (offline gespeichert, wird übertragen).
// Fehler, die innerhalb der Wartezeit auftreten, werden an den Aufrufer weitergegeben.
async function mitWartezeit(vorgang) {
    const zeitlimit = new Promise(resolve => setTimeout(() => resolve('lokal'), WARTEZEIT_MS));
    const ergebnis = await Promise.race([vorgang.then(() => 'ok'), zeitlimit]);
    if (ergebnis === 'lokal') {
        ausstehend += 1;
        meldeAusstehend();
        toast('Ohne Verbindung lokal gespeichert – wird übertragen, sobald das Gerät wieder online ist.', 'warning', 6000);
        vorgang
            .then(() => { ausstehend -= 1; meldeAusstehend(); if (ausstehend === 0) toast('Offline-Änderungen wurden übertragen.', 'success'); })
            .catch(fehler => {
                ausstehend -= 1; meldeAusstehend();
                console.error(fehler);
                toast(`Eine offline gespeicherte Änderung wurde abgelehnt: ${fehler.message}`, 'error', 10000);
            });
    }
    return ergebnis;
}

export function neueId(sammlung) {
    return doc(collection(db, sammlung)).id;
}

// Neues Dokument mit Erfassungszeitpunkt; die ID ist sofort bekannt (auch offline).
export async function anlegen(sammlung, daten, id = neueId(sammlung)) {
    await mitWartezeit(setDoc(doc(db, sammlung, id), { ...daten, erstellt_am: serverTimestamp() }));
    return id;
}

export function aendern(sammlung, id, daten) {
    return mitWartezeit(updateDoc(doc(db, sammlung, id), daten));
}

export function setzen(sammlung, id, daten) {
    return mitWartezeit(setDoc(doc(db, sammlung, id), daten));
}

export function loeschen(sammlung, id) {
    return mitWartezeit(deleteDoc(doc(db, sammlung, id)));
}

// Mehrere Änderungen gemeinsam: entweder werden alle gespeichert oder keine.
// aktionen: [{ art: 'setzen' | 'aendern' | 'loeschen', sammlung, id, daten }]
export function stapel(aktionen) {
    const batch = writeBatch(db);
    aktionen.forEach(({ art, sammlung, id, daten }) => {
        const ref = doc(db, sammlung, id);
        if (art === 'setzen') batch.set(ref, daten);
        else if (art === 'aendern') batch.update(ref, daten);
        else if (art === 'loeschen') batch.delete(ref);
        else throw new Error(`Unbekannte Aktion: ${art}`);
    });
    return mitWartezeit(batch.commit());
}
