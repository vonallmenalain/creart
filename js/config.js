// Stammdaten, die mehrere Seiten gemeinsam nutzen.

export const objekte = ["Creart", "Photographic", "Ferienwohnung"];

// Unterobjekte pro Objekt. Buchungen ohne Auswahl bleiben dem Objekt selbst
// zugewiesen (unterobjekt = "").
export const unterobjekte = {
    "Ferienwohnung": ["2-Zimmer", "Studio"]
};

export const kontenplan = [
    { id: "1000", name: "Kasse", typ: "Aktiv" },
    { id: "1020", name: "Bankkonto", typ: "Aktiv" },
    { id: "1030", name: "Bankkonto Privat", typ: "Aktiv" },
    { id: "1100", name: "Debitoren", typ: "Aktiv" },
    { id: "1300", name: "Transitorische Aktiven", typ: "Aktiv" },
    { id: "1500", name: "Inventar", typ: "Aktiv" },
    { id: "1530", name: "Fahrzeuge", typ: "Aktiv" },
    { id: "1550", name: "Mobiliar", typ: "Aktiv" },

    { id: "2000", name: "Privat", typ: "Passiv" },
    { id: "2100", name: "Hypothek", typ: "Passiv" },
    { id: "2300", name: "Transitorische Passiven", typ: "Passiv" },

    { id: "3000", name: "Mieteinnahmen", typ: "Ertrag" },
    { id: "3100", name: "Kaution", typ: "Ertrag" },
    { id: "3200", name: "Verkaufserlöse", typ: "Ertrag" },
    { id: "3400", name: "Sonstiger Ertrag", typ: "Ertrag" },

    { id: "4000", name: "Waren und Material", typ: "Aufwand" },
    { id: "4050", name: "Anschaffungen", typ: "Aufwand" },
    { id: "5000", name: "Personalaufwand", typ: "Aufwand" },
    { id: "5050", name: "AHV", typ: "Aufwand" },
    { id: "6000", name: "Strom", typ: "Aufwand" },
    { id: "6050", name: "Mietaufwand", typ: "Aufwand" },
    { id: "6100", name: "Unterhalt, Reparaturen", typ: "Aufwand" },
    { id: "6200", name: "Verpflegung", typ: "Aufwand" },
    { id: "6250", name: "Fahrzeug, Transport", typ: "Aufwand" },
    { id: "6300", name: "Werbeaufwand", typ: "Aufwand" },
    { id: "6400", name: "Dienstleistungen und Gebühren", typ: "Aufwand" },
    { id: "6500", name: "Kurtaxen", typ: "Aufwand" },
    { id: "6600", name: "Provisionen", typ: "Aufwand" },
    { id: "6700", name: "Zinsaufwand", typ: "Aufwand" },
    { id: "6800", name: "Abschreibungsaufwand", typ: "Aufwand" },
    { id: "6900", name: "Sonstiger Aufwand", typ: "Aufwand" }
];

// Produkte für Verkäufe / Events (Reihenfolge = Spalten der Jahresübersicht)
export const produkte = [
    "Magnet Broschen", "Magnet Blumen", "Foulardketten",
    "Rüschenketten", "Schnurketten", "Kleider",
    "Schals", "Rundschals", "Mittli", "Diverses"
];

// Erstes Jahr mit Daten; die Auswahl reicht bis ins nächste Kalenderjahr.
export const ERSTES_JAHR = 2026;

export function initJahresAuswahl(select) {
    const aktuell = new Date().getFullYear();
    const jahre = [];
    for (let j = ERSTES_JAHR; j <= Math.max(aktuell + 1, ERSTES_JAHR); j++) jahre.push(j);
    select.innerHTML = jahre.map(j => `<option value="${j}">${j}</option>`).join('');
    select.value = String(Math.max(aktuell, ERSTES_JAHR));
}
