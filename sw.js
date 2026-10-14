// Service Worker der CreArt-App.
// - App-Dateien (HTML/CSS/JS/Icons): zuerst aus dem Netz, damit immer die aktuelle
//   Version läuft. Ohne Verbindung oder bei sehr langsamem Netz aus dem Cache – so
//   startet die App auch offline.
// - Firebase- und Excel-Bibliothek: Adressen enthalten die Version und ändern sich nie,
//   deshalb dauerhaft aus dem Cache.
// - Datenbank- und Login-Anfragen werden nicht angefasst (Firestore hat einen eigenen Cache).
const APP_CACHE = 'creart-app-v1';
const LIB_CACHE = 'creart-lib-v1';
const NETZ_TIMEOUT_MS = 3500;
const APP_DATEIEN = [
    './', 'index.html', 'eingabe.html', 'verwaltung.html', 'admin.html',
    'css/styles.css',
    'js/firebase.js', 'js/firestore.js', 'js/utils.js', 'js/config.js', 'js/ui.js', 'js/daten.js', 'js/pwa.js',
    'manifest.webmanifest',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then(cache => cache.addAll(APP_DATEIEN.map(pfad => new Request(pfad, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(namen => Promise.all(namen.filter(n => ![APP_CACHE, LIB_CACHE].includes(n)).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const anfrage = event.request;
    if (anfrage.method !== 'GET') return;
    const url = new URL(anfrage.url);
    if (url.origin === self.location.origin) {
        event.respondWith(netzZuerst(anfrage));
    } else if ((url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) || url.hostname === 'cdnjs.cloudflare.com') {
        event.respondWith(cacheZuerst(anfrage));
    }
});

async function netzZuerst(anfrage) {
    const cache = await caches.open(APP_CACHE);
    const ausNetz = fetch(anfrage).then(antwort => {
        if (antwort.ok && antwort.type === 'basic') cache.put(anfrage, antwort.clone());
        return antwort;
    });
    const ausCache = () => cache.match(anfrage, { ignoreSearch: true })
        .then(treffer => treffer || (anfrage.mode === 'navigate' ? cache.match('index.html') : undefined));

    // Langsames Netz: nach NETZ_TIMEOUT_MS die gespeicherte Version zeigen, das Netz-Ergebnis
    // landet trotzdem im Cache für das nächste Mal.
    const zeitlimit = new Promise(resolve => setTimeout(() => resolve('zeitlimit'), NETZ_TIMEOUT_MS));
    try {
        const erstes = await Promise.race([ausNetz, zeitlimit]);
        if (erstes !== 'zeitlimit') return erstes;
        const gespeichert = await ausCache();
        return gespeichert || await ausNetz;
    } catch (fehler) {
        const gespeichert = await ausCache();
        if (gespeichert) return gespeichert;
        throw fehler;
    }
}

async function cacheZuerst(anfrage) {
    const cache = await caches.open(LIB_CACHE);
    const treffer = await cache.match(anfrage);
    if (treffer) return treffer;
    const antwort = await fetch(anfrage);
    if (antwort.ok) cache.put(anfrage, antwort.clone());
    return antwort;
}
