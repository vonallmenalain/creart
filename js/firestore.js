// Firestore mit dauerhaftem Browser-Cache (IndexedDB), den alle offenen Tabs gemeinsam nutzen.
// Nur ein Tab hält die Verbindung zum Server; weitere Tabs lesen dieselben Daten aus dem Cache,
// statt alles erneut vom Server zu laden.
import {
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { app } from "./firebase.js";

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export {
    collection, doc, query, where, orderBy, limit,
    onSnapshot, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
    serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
