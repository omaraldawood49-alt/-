import { ref, get, set, push, remove, onValue } from 'firebase/database';
import { db } from './firebase.js';
import { sections as bundled } from './data/index.js';

// الأسئلة تُخزَّن في Firebase تحت /questions/{sectionId}/{key}.
// إن لم تُهيّأ بعد، يُستخدم بنك المنهج الافتراضي المضمّن.
const qref = (sectionId, key = '') => ref(db, `questions/${sectionId}${key ? '/' + key : ''}`);

export const sectionMeta = () =>
  bundled.map(({ id, title, description, color }) => ({ id, title, description, color }));

export const getBundled = (sectionId) =>
  bundled.find((s) => s.id === sectionId)?.questions || [];

const toList = (val) =>
  val
    ? Object.entries(val)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, q]) => ({ key, ...q }))
    : [];

// قراءة أسئلة قسم مرة واحدة (لبدء اللعبة): من Firebase إن وُجدت، وإلا المضمّنة.
export async function getQuestionsOnce(sectionId) {
  const snap = await get(qref(sectionId));
  if (snap.exists()) return toList(snap.val());
  return getBundled(sectionId).map((q, i) => ({ key: `bundled-${i}`, ...q }));
}

// اشتراك لحظي بأسئلة قسم (للوحة الإدارة).
export const watchQuestions = (sectionId, cb) =>
  onValue(qref(sectionId), (snap) => cb(toList(snap.val())));

const clean = (q) => ({
  type: q.type,
  question: (q.question || '').trim(),
  options: q.options.map((o) => (o || '').trim()),
  correctIndex: q.correctIndex,
  explanation: (q.explanation || '').trim(),
  source: (q.source || '').trim(),
});

export const addQuestion = (sectionId, q) => push(qref(sectionId), clean(q));
export const updateQuestion = (sectionId, key, q) => set(qref(sectionId, key), clean(q));
export const deleteQuestion = (sectionId, key) => remove(qref(sectionId, key));

// استيراد أسئلة المنهج الافتراضية إلى Firebase (مع الحفاظ على الترتيب).
export async function seedSection(sectionId) {
  for (const q of getBundled(sectionId)) {
    // eslint-disable-next-line no-await-in-loop
    await push(qref(sectionId), clean(q));
  }
}
