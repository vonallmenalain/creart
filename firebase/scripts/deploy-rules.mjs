// Veröffentlicht firestore.rules im Firebase-Projekt (über das Admin SDK).
// Erwartet den JSON-Schlüssel eines Dienstkontos in FIREBASE_SERVICE_ACCOUNT.
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';

const schluessel = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!schluessel) {
  console.log('::warning::Secret FIREBASE_SERVICE_ACCOUNT fehlt – Regeln wurden nicht veröffentlicht. Anleitung: firebase/README.md');
  process.exit(0);
}

const konto = JSON.parse(schluessel);
initializeApp({ credential: cert(konto), projectId: konto.project_id });
const rules = getSecurityRules();
const quelle = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const aktuell = await rules.getFirestoreRuleset();
const aktuelleQuelle = aktuell.source.map(f => f.content).join('\n');
if (aktuelleQuelle.trim() === quelle.trim()) {
  console.log(`Regeln sind bereits aktuell (Ruleset ${aktuell.name}). Nichts zu tun.`);
  process.exit(0);
}

// Firebase prüft die Syntax beim Anlegen des Rulesets; fehlerhafte Regeln werden abgelehnt.
const neu = await rules.releaseFirestoreRulesetFromSource(quelle);
console.log(`Neue Firestore-Regeln veröffentlicht: ${neu.name} (${neu.createTime}).`);
