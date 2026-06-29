import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// إعدادات Firebase تُقرأ من متغيّرات البيئة (client/.env). هذه القيم عامة بطبيعتها
// (ليست أسرارًا)، والحماية تُفرض عبر قواعد قاعدة البيانات (database.rules.json).
const env = import.meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isConfigured = Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey);

// `db` هي ربط حيّ (live binding) يستهلكه game.js؛ تبقى null حتى الضبط.
export let db = isConfigured ? getDatabase(initializeApp(firebaseConfig)) : null;

// خطّاف للاختبار فقط: حقن قاعدة بيانات مُوجَّهة إلى المحاكي (Emulator).
export function __setTestDb(testDb) {
  db = testDb;
}
