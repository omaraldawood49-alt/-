import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { defaultFirebaseConfig } from './firebaseConfig.js';

// الإعدادات تأتي من متغيّرات البيئة إن وُجدت، وإلا من الإعدادات المضمّنة.
// هذه القيم عامة بطبيعتها؛ الحماية تُفرض عبر database.rules.json.
const env = import.meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || defaultFirebaseConfig.databaseURL,
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

export const isConfigured = Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey);

// `db` ربط حيّ (live binding) يستهلكه game.js؛ تبقى null حتى الضبط.
export let db = isConfigured ? getDatabase(initializeApp(firebaseConfig)) : null;

// خطّاف للاختبار فقط: حقن قاعدة بيانات مُوجَّهة إلى المحاكي (Emulator).
export function __setTestDb(testDb) {
  db = testDb;
}
