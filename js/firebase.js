// Gemeinsame Firebase-Initialisierung (App + Login) für alle Seiten.
// Die SDK-Version steht nur hier und in js/firestore.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC4TnJ2SHBPwaB2E_NS_SYE0jZM2yZTjTs",
    authDomain: "buchhaltung-9c1c9.firebaseapp.com",
    projectId: "buchhaltung-9c1c9",
    storageBucket: "buchhaltung-9c1c9.firebasestorage.app",
    messagingSenderId: "401277655088",
    appId: "1:401277655088:web:0ed07c93e335524ffe35f5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export {
    onAuthStateChanged, signOut, signInWithEmailAndPassword,
    setPersistence, browserLocalPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
