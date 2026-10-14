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

// Liest einen Betrag in CHF und gibt Rappen (Ganzzahl) zurück, z.B. "12.50", "12,50",
// "1'234.5" oder "-5". Kaufmännisch auf Rappen gerundet, ohne Rundungsfehler von
// Kommazahlen. Leere oder ungültige Eingaben ergeben NaN.
export function parseRappen(text) {
    const s = String(text ?? '').trim().replace(/[\s'’]/g, '').replace(',', '.');
    const m = s.match(/^(-?)(\d*)(?:\.(\d*))?$/);
    if (!m || (m[2] === '' && !m[3])) return NaN;
    const nachkomma = m[3] || '';
    let rappen = parseInt(m[2] || '0', 10) * 100 + parseInt((nachkomma + '00').slice(0, 2), 10);
    if (nachkomma.length > 2 && Number(nachkomma[2]) >= 5) rappen += 1;
    return m[1] === '-' ? -rappen : rappen;
}
