// Einheitliche Meldungen (Toasts) und Bestätigungsdialoge statt alert()/confirm().
import { escapeHtml } from './utils.js';

function toastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }
    return container;
}

// typ: 'success' | 'error' | 'warning' | 'info'
export function toast(text, typ = 'info', dauer = 3800) {
    const el = document.createElement('div');
    el.className = `toast ${typ}`;
    el.setAttribute('role', typ === 'error' ? 'alert' : 'status');
    el.textContent = text;
    toastContainer().appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 200);
    }, dauer);
}

// Zeigt einen Dialog und liefert true (bestätigt) oder false (abgebrochen).
// Bei gefahr=true ist "Abbrechen" vorausgewählt, damit Enter nichts löscht.
export function bestaetigen({ titel = 'Bitte bestätigen', text = '', ok = 'OK', abbrechen = 'Abbrechen', gefahr = false } = {}) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'ui-dialog';
        dialog.innerHTML = `
            <div class="ui-dialog-body">
                <h2>${escapeHtml(titel)}</h2>
                <p>${escapeHtml(text)}</p>
            </div>
            <div class="ui-dialog-actions">
                <button type="button" class="btn btn-outline ui-dialog-abbrechen">${escapeHtml(abbrechen)}</button>
                <button type="button" class="btn ${gefahr ? 'btn-danger' : 'btn-primary'} ui-dialog-ok">${escapeHtml(ok)}</button>
            </div>`;
        document.body.appendChild(dialog);
        const fertig = (wert) => { dialog.close(); dialog.remove(); resolve(wert); };
        dialog.querySelector('.ui-dialog-ok').addEventListener('click', () => fertig(true));
        dialog.querySelector('.ui-dialog-abbrechen').addEventListener('click', () => fertig(false));
        dialog.addEventListener('cancel', (ev) => { ev.preventDefault(); fertig(false); });
        dialog.showModal();
        dialog.querySelector(gefahr ? '.ui-dialog-abbrechen' : '.ui-dialog-ok').focus();
    });
}
