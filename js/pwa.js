// Installierbare App: Service Worker registrieren, Offline-Anzeige und Hinweis auf neue Versionen.

function banner() {
    let el = document.getElementById('netzBanner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'netzBanner';
        el.className = 'netz-banner';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }
    return el;
}

// --- Offline-Anzeige ---------------------------------------------------------
let ausstehend = 0;
let neueVersion = false;

function zeigeStatus() {
    const el = banner();
    if (neueVersion) {
        el.className = 'netz-banner update';
        el.innerHTML = 'Neue Version verfügbar <button type="button" class="netz-banner-knopf">Neu laden</button>';
        el.querySelector('button').onclick = () => location.reload();
        el.hidden = false;
    } else if (!navigator.onLine) {
        el.className = 'netz-banner offline';
        el.textContent = ausstehend > 0
            ? `Offline – ${ausstehend} Änderung${ausstehend === 1 ? '' : 'en'} warten auf Übertragung`
            : 'Offline – Änderungen werden gespeichert und später übertragen';
        el.hidden = false;
    } else if (ausstehend > 0) {
        el.className = 'netz-banner offline';
        el.textContent = `${ausstehend} Änderung${ausstehend === 1 ? '' : 'en'} werden übertragen…`;
        el.hidden = false;
    } else {
        el.hidden = true;
    }
}

window.addEventListener('online', () => { zeigeStatus(); if (!geladeneKennung) pruefeNeueVersion(); });
window.addEventListener('offline', zeigeStatus);
document.addEventListener('creart:ausstehend', (e) => { ausstehend = e.detail; zeigeStatus(); });

// --- Hinweis auf neue Version --------------------------------------------------
// Vergleicht die Kennung (ETag / Last-Modified) der geladenen Seite mit der aktuellen
// auf dem Server, wenn die App wieder in den Vordergrund kommt.
const PRUEF_ABSTAND_MS = 10 * 60 * 1000;
let geladeneKennung = null;
let letztePruefung = 0;

async function seitenKennung() {
    const antwort = await fetch(location.pathname, { method: 'HEAD', cache: 'no-store' });
    return antwort.headers.get('etag') || antwort.headers.get('last-modified');
}

async function pruefeNeueVersion() {
    if (neueVersion || !navigator.onLine) return;
    if (geladeneKennung && Date.now() - letztePruefung < PRUEF_ABSTAND_MS) return;
    letztePruefung = Date.now();
    try {
        const aktuell = await seitenKennung();
        // Wurde die Seite offline geöffnet, gilt die erste erfolgreiche Abfrage als Ausgangsstand.
        if (!geladeneKennung) { geladeneKennung = aktuell; return; }
        if (aktuell && aktuell !== geladeneKennung) {
            neueVersion = true;
            zeigeStatus();
        }
    } catch (e) { /* offline oder Server nicht erreichbar: später erneut */ }
}

window.addEventListener('load', async () => {
    zeigeStatus();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service Worker nicht registriert:', err));
    }
    try { geladeneKennung = await seitenKennung(); letztePruefung = Date.now(); } catch (e) { /* offline */ }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) pruefeNeueVersion(); });
