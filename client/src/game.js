import {
  ref,
  set,
  update,
  get,
  push,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database';
import { db } from './firebase.js';
import { getSection } from './data/index.js';

const POINTS_BASE = 1000;
export const TIME_LIMIT = 20;

const gref = (pin, path = '') => ref(db, `games/${pin}${path ? '/' + path : ''}`);

const genPin = () => String(Math.floor(100000 + Math.random() * 900000));

// ===================== المضيف =====================

// إنشاء جلسة جديدة. تُمرَّر قائمة الأسئلة (مع الإجابات) لتبقى في متصفّح المضيف.
export async function createGame(sectionId, questions) {
  const meta = getSection(sectionId);
  if (!meta) throw new Error('القسم غير موجود');
  const list = questions && questions.length ? questions : meta.questions;
  let pin;
  // ضمان تفرّد الرمز.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    pin = genPin();
    const snap = await get(gref(pin, 'meta'));
    if (!snap.exists()) break;
  }
  await set(gref(pin, 'meta'), {
    sectionId,
    sectionTitle: meta.title,
    total: list.length,
    state: 'lobby',
    createdAt: serverTimestamp(),
  });
  return { pin, sectionTitle: meta.title, questions: list };
}

// عرض سؤال (بدون الإجابة الصحيحة) ومسح كشف السؤال السابق.
export async function showQuestion(pin, question, index, total) {
  await update(gref(pin), {
    current: {
      index,
      total,
      type: question.type,
      question: question.question,
      options: question.options,
      timeLimit: TIME_LIMIT,
      startAt: serverTimestamp(),
    },
    reveal: null,
    'meta/state': 'question',
  });
}

// التصحيح وحساب النقاط (المضيف هو المرجع)، وكتابة الكشف وتحديث نقاط اللاعبين دفعة واحدة.
export async function revealAndScore(pin, question, index) {
  const [playersSnap, answersSnap, startSnap] = await Promise.all([
    get(gref(pin, 'players')),
    get(gref(pin, `answers/${index}`)),
    get(gref(pin, 'current/startAt')),
  ]);
  const players = playersSnap.val() || {};
  const answers = answersSnap.val() || {};
  const startAt = startSnap.val() || 0;

  const updates = {};
  for (const [pid, p] of Object.entries(players)) {
    const a = answers[pid];
    const correct = !!a && a.answerIndex === question.correctIndex;
    let gain = 0;
    let streak = p.streak || 0;
    if (correct) {
      const elapsed = Math.max(0, Math.min(TIME_LIMIT, (a.at - startAt) / 1000));
      const ratio = 1 - elapsed / TIME_LIMIT;
      gain = Math.round(POINTS_BASE * (0.5 + 0.5 * ratio));
      streak += 1;
    } else {
      streak = 0;
    }
    updates[`players/${pid}/score`] = (p.score || 0) + gain;
    updates[`players/${pid}/lastGain`] = gain;
    updates[`players/${pid}/streak`] = streak;
    updates[`players/${pid}/lastCorrect`] = correct;
    updates[`players/${pid}/answered`] = !!a;
    updates[`players/${pid}/resultIndex`] = index;
  }
  updates['reveal'] = {
    index,
    correctIndex: question.correctIndex,
    explanation: question.explanation || '',
    source: question.source || '',
  };
  updates['meta/state'] = 'results';
  await update(gref(pin), updates);
}

export async function endGame(pin) {
  await update(gref(pin, 'meta'), { state: 'over' });
}

export async function deleteGame(pin) {
  await remove(gref(pin));
}

// ===================== اللاعب =====================

export async function joinGame(pin, name) {
  const metaSnap = await get(gref(pin, 'meta'));
  if (!metaSnap.exists()) return { error: 'الرمز غير صحيح' };
  const meta = metaSnap.val();
  if (meta.state !== 'lobby') return { error: 'بدأت اللعبة بالفعل' };
  const clean = String(name || '').trim().slice(0, 20) || 'لاعب';
  const playerRef = push(gref(pin, 'players'));
  await set(playerRef, { name: clean, score: 0, streak: 0, joinedAt: serverTimestamp() });
  onDisconnect(playerRef).remove(); // إزالة اللاعب تلقائيًا عند انقطاعه.
  return { playerId: playerRef.key, sectionTitle: meta.sectionTitle };
}

export async function submitAnswer(pin, index, playerId, answerIndex) {
  await set(gref(pin, `answers/${index}/${playerId}`), {
    answerIndex,
    at: serverTimestamp(),
  });
}

// ===================== الاشتراكات (مشتركة) =====================

export const watchMeta = (pin, cb) => onValue(gref(pin, 'meta'), (s) => cb(s.val()));
export const watchCurrent = (pin, cb) => onValue(gref(pin, 'current'), (s) => cb(s.val()));
export const watchReveal = (pin, cb) => onValue(gref(pin, 'reveal'), (s) => cb(s.val()));
export const watchPlayers = (pin, cb) => onValue(gref(pin, 'players'), (s) => cb(s.val() || {}));
export const watchPlayer = (pin, playerId, cb) =>
  onValue(gref(pin, `players/${playerId}`), (s) => cb(s.val()));
export const watchAnswers = (pin, index, cb) =>
  onValue(gref(pin, `answers/${index}`), (s) => cb(s.val() || {}));

// ترتيب اللاعبين من كائن players.
export const toLeaderboard = (playersObj, limit = 50) =>
  Object.values(playersObj || {})
    .map((p) => ({ name: p.name, score: p.score || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
