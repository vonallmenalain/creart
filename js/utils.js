// Gemeinsame Hilfsfunktionen für alle Seiten.

export function escapeHtml(text) {
    return String(text ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// Rappen (Ganzzahl) als Schweizer Betrag, z.B. 123456 -> 1’234.56
export function formatCHF(rappen) {
    const wert = Number(rappen || 0) / 100;
    return wert.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// YYYY-MM-DD -> TT.MM.JJJJ (unerwartete Werte werden sicher escaped zurückgegeben)
export function formatDatumCH(datum) {
    if (!datum) return '-';
    const teile = String(datum).split('-');
    if (teile.length !== 3) return escapeHtml(datum);
    return `${teile[2]}.${teile[1]}.${teile[0]}`;
}

// Heutiges Datum als YYYY-MM-DD in lokaler Zeit (toISOString() würde UTC liefern).
export function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Sortiert Texte nach Schweizer Regeln (Umlaute korrekt, Zahlen numerisch).
export const textVergleich = new Intl.Collator('de-CH', { sensitivity: 'base', numeric: true }).compare;

export function verzoegert(fn, ms = 150) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}
