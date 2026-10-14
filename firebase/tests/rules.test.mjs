// Prüft die Firestore-Regeln gegen den Emulator, bevor sie live gehen.
// Schützt davor, sich mit einer fehlerhaften Regel selbst auszusperren.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const BERECHTIGT = ['SUfUFLsAwRWOjVvH7mZZaZhVkL82', '3pSUg80ZVbUZ9Rolzjxe0xbj2883'];
const COLLECTIONS = ['buchungen', 'eroeffnungsbilanz', 'kunden_adressen', 'debitoren', 'verkaeufe_events', 'ferienwohnung_buchungen', 'audit_logs', 'zaehler', 'geloescht'];

const env = await initializeTestEnvironment({
  projectId: 'demo-creart',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
});

let fehler = 0;
async function pruefe(name, fn) {
  try { await fn(); console.log(`  ✔ ${name}`); }
  catch (e) { fehler++; console.error(`  ✘ ${name}\n    ${e.message}`); }
}

for (const uid of BERECHTIGT) {
  const db = env.authenticatedContext(uid).firestore();
  for (const col of COLLECTIONS) {
    await pruefe(`${uid} darf ${col} schreiben, lesen und löschen`, async () => {
      await assertSucceeds(setDoc(doc(db, col, `test_${uid}`), { wert: 1 }));
      await assertSucceeds(getDoc(doc(db, col, `test_${uid}`)));
      await assertSucceeds(getDocs(collection(db, col)));
      await assertSucceeds(deleteDoc(doc(db, col, `test_${uid}`)));
    });
  }
}

const fremd = env.authenticatedContext('fremdes-konto').firestore();
const anonym = env.unauthenticatedContext().firestore();
for (const [name, db] of [['Fremdes Konto', fremd], ['Nicht angemeldet', anonym]]) {
  for (const col of COLLECTIONS) {
    await pruefe(`${name} darf ${col} weder lesen noch schreiben`, async () => {
      await assertFails(getDocs(collection(db, col)));
      await assertFails(setDoc(doc(db, col, 'x'), { wert: 1 }));
    });
  }
}

await env.cleanup();
if (fehler > 0) {
  console.error(`\n${fehler} Prüfung(en) fehlgeschlagen – Regeln werden NICHT veröffentlicht.`);
  process.exit(1);
}
console.log('\nAlle Regel-Prüfungen bestanden.');
