// Delta-Synchronisation der Daten.
//
// Die Seiten lesen ihre Daten aus dem lokalen Firestore-Cache – das kostet keine
// Lesevorgänge. Vom Server wird pro Sammlung nur abgefragt, was sich seit dem letzten
// Abgleich geändert hat (Feld "geaendert_am", das js/daten.js bei jedem Speichern setzt).
// Löschungen anderer Geräte kommen über Löschmarken in der Sammlung "geloescht".
//
// Ein vollständiger Abgleich (alle Dokumente) läuft nur, wenn ein Gerät die Sammlung zum
// ersten Mal lädt, wenn der Cache geleert wurde, oder zur Sicherheit alle 30 Tage.
import { db, collection, query, where, onSnapshot, Timestamp } from './firestore.js';
import { LOESCHMARKEN } from './daten.js';

const VOLL_ABGLEICH_MS = 30 * 24 * 60 * 60 * 1000;
const UEBERLAPPUNG_MS = 2 * 60 * 1000;               // kurz vor dem letzten Stand nochmals abfragen
const ERSTER_STAND_PUFFER_MS = 24 * 60 * 60 * 1000;  // falls noch kein Dokument "geaendert_am" hat
const NEU_VERBINDEN_NACH_MS = 30 * 60 * 1000;        // Abfragefenster nach längerer Pause verkleinern
const META_PREFIX = 'creart-sync-';

function metaLaden(name) {
    try { return JSON.parse(localStorage.getItem(META_PREFIX + name)) || null; } catch (e) { return null; }
}
function metaSpeichern(name, meta) {
    try { localStorage.setItem(META_PREFIX + name, JSON.stringify(meta)); } catch (e) { /* privater Modus */ }
}
function zeitVon(daten) {
    const t = daten?.geaendert_am;
    return t && typeof t.toMillis === 'function' ? t.toMillis() : 0;
}

// Ohne gespeicherten Stand oder bei geleertem Cache muss alles vom Server geladen werden.
function brauchtVollAbgleich(meta, anzahlImCache) {
    return !meta
        || Date.now() - (meta.voll || 0) > VOLL_ABGLEICH_MS
        || (anzahlImCache === 0 && (meta.anzahl || 0) > 0);
}

// Hält eine Server-Abfrage für eine Sammlung aktuell: zuerst vollständig (falls nötig),
// danach nur noch Änderungen. Ruft beiAktuell() nach jeder Antwort des Servers auf.
// Die Dokumente selbst landen im Cache und erreichen die Seite über die Cache-Abfrage.
function serverAbgleich(name, anzahlImCache, beiAktuell, beiFehler) {
    let abo = null;
    let gestartetAm = 0;
    const starte = () => {
        if (abo) abo();
        const meta = metaLaden(name);
        const voll = brauchtVollAbgleich(meta, anzahlImCache());
        const seit = voll ? 0 : (meta.seit || 0);
        const q = voll
            ? collection(db, name)
            : query(collection(db, name), where('geaendert_am', '>', Timestamp.fromMillis(Math.max(0, seit - UEBERLAPPUNG_MS))));
        gestartetAm = Date.now();
        // includeMetadataChanges: Auch die Antwort "nichts geändert" des Servers melden. Ohne diese
        // Option bliebe es beim Stand aus dem Cache, wenn sich seit dem letzten Mal nichts geändert hat.
        abo = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
            if (snap.metadata.fromCache) return;
            let hoechste = seit;
            snap.docs.forEach(d => { hoechste = Math.max(hoechste, zeitVon(d.data())); });
            if (voll) {
                metaSpeichern(name, { seit: hoechste || Date.now() - ERSTER_STAND_PUFFER_MS, voll: Date.now(), anzahl: snap.size });
                beiAktuell();
                starte();   // ab jetzt nur noch Änderungen abfragen
                return;
            }
            metaSpeichern(name, { ...meta, seit: hoechste, anzahl: anzahlImCache() });
            beiAktuell();
        }, beiFehler);
    };
    starte();
    const beiSichtbar = () => {
        if (!document.hidden && Date.now() - gestartetAm > NEU_VERBINDEN_NACH_MS) starte();
    };
    document.addEventListener('visibilitychange', beiSichtbar);
    return () => {
        if (abo) abo();
        document.removeEventListener('visibilitychange', beiSichtbar);
    };
}

// ---------- Löschmarken (eine gemeinsame Verbindung für alle Sammlungen) ----------
const marken = new Map();          // "sammlung/id" -> Zeitpunkt der Löschung (ms)
const markenHoerer = new Set();
let markenGestartet = false;
let markenBereit = false;

function starteLoeschmarken() {
    if (markenGestartet) return;
    markenGestartet = true;
    onSnapshot(collection(db, LOESCHMARKEN), { source: 'cache' }, (snap) => {
        let geaendert = !markenBereit;
        snap.docs.forEach(d => {
            const daten = d.data({ serverTimestamps: 'estimate' });
            const schluessel = `${daten.sammlung}/${daten.dok_id}`;
            const zeit = zeitVon(daten) || Date.now();
            if ((marken.get(schluessel) || 0) < zeit) { marken.set(schluessel, zeit); geaendert = true; }
        });
        if (!markenBereit) {
            markenBereit = true;
            serverAbgleich(LOESCHMARKEN, () => marken.size, () => {}, (e) => console.error('Löschmarken (Server):', e));
        }
        if (geaendert) markenHoerer.forEach(f => f());
    }, (e) => console.error('Löschmarken (Cache):', e));
}

// ---------- Öffentliche Schnittstelle ----------

// Liefert alle Dokumente einer Sammlung an beiDaten(dokumente, info), sofort aus dem Cache und
// erneut bei jeder Änderung. Rückgabe: Funktion zum Beenden.
// info: { serverAktuell, ausstehend, nurStatus }
//   serverAktuell: der Server hat geantwortet, der Cache ist auf dem neuesten Stand
//   ausstehend:    es gibt lokal gespeicherte, noch nicht übertragene Änderungen
//   nurStatus:     die Dokumente sind unverändert, nur serverAktuell/ausstehend haben sich geändert
export function abonniere(name, beiDaten, beiFehler = (e) => console.error(e)) {
    starteLoeschmarken();
    let dokumente = [];
    const zeiten = new Map();
    let cacheGeladen = false;
    let ausgegeben = false;
    let serverAktuell = false;
    let ausstehend = false;
    let stopServer = null;

    // Gelöschte Dokumente bleiben im Cache, wenn die Löschung über eine Löschmarke bekannt wurde.
    const sichtbareDokumente = () => dokumente.filter(d => {
        const marke = marken.get(`${name}/${d.id}`);
        return marke === undefined || (zeiten.get(d.id) || 0) > marke;
    });
    const ausgeben = (nurStatus) => {
        if (!cacheGeladen || !markenBereit) return;
        // Neues Gerät oder geleerter Cache: nicht kurz "keine Einträge" zeigen, sondern auf den Server warten.
        if (!ausgegeben && !serverAktuell && dokumente.length === 0 && navigator.onLine) {
            const meta = metaLaden(name);
            if (!meta || (meta.anzahl || 0) > 0) return;
        }
        beiDaten(sichtbareDokumente(), { serverAktuell, ausstehend, nurStatus: ausgegeben && nurStatus });
        ausgegeben = true;
    };
    const beiNeuenMarken = () => ausgeben(false);
    markenHoerer.add(beiNeuenMarken);

    const stopCache = onSnapshot(collection(db, name), { source: 'cache', includeMetadataChanges: true }, (snap) => {
        const nurStatus = cacheGeladen && snap.docChanges().length === 0;
        ausstehend = snap.metadata.hasPendingWrites;
        if (!nurStatus) {
            dokumente = snap.docs.map(d => {
                const daten = d.data({ serverTimestamps: 'estimate' });
                zeiten.set(d.id, zeitVon(daten));
                return { id: d.id, ...daten };
            });
        }
        const ersterAufruf = !cacheGeladen;
        cacheGeladen = true;
        ausgeben(nurStatus);
        if (ersterAufruf) {
            stopServer = serverAbgleich(name, () => sichtbareDokumente().length, () => {
                const neu = !serverAktuell;
                serverAktuell = true;
                if (neu) ausgeben(true);
            }, beiFehler);
        }
    }, beiFehler);

    return () => {
        stopCache();
        if (stopServer) stopServer();
        markenHoerer.delete(beiNeuenMarken);
    };
}

// Stand des Abgleichs pro Sammlung auf diesem Gerät (für die Anzeige im Log).
export function abgleichStatus() {
    const status = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const schluessel = localStorage.key(i);
            if (schluessel && schluessel.startsWith(META_PREFIX)) {
                const name = schluessel.slice(META_PREFIX.length);
                status[name] = metaLaden(name);
            }
        }
    } catch (e) { /* privater Modus */ }
    return status;
}

// Erzwingt beim nächsten Öffnen der Seiten einen vollständigen Abgleich aller Sammlungen.
export function vollstaendigNeuLaden() {
    Object.keys(abgleichStatus()).forEach(name => {
        try { localStorage.removeItem(META_PREFIX + name); } catch (e) { /* privater Modus */ }
    });
}
