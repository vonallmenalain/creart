// Firestore mit dauerhaftem Browser-Cache (IndexedDB), den alle offenen Tabs gemeinsam nutzen.
// Nur ein Tab hält die Verbindung zum Server; weitere Tabs lesen dieselben Daten aus dem Cache,
// statt alles erneut vom Server zu laden.
// Der Cache wird nicht automatisch ausgedünnt: Die Seiten lesen ihre Daten daraus und laden
// vom Server nur Änderungen (js/sync.js). Die Datenmenge ist dafür klein genug.
import {
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { app } from "./firebase.js";

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_SIZE_UNLIMITED })
});

export {
    collection, doc, query, where, orderBy, limit,
    onSnapshot, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
    writeBatch, runTransaction, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
