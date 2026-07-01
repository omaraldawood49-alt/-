import {
  ref,
  set,
  update,
  get,
  push,
  remove,
  onValue,
  serverTimestamp,
} from 'firebase/database';
import { db } from './firebase.js';
import { getSection } from './data/index.js';

const POINTS_BASE = 100; // أعلى درجة للسؤال الواحد
export const TIME_LIMIT = 20;

const gref = (pin, path = '') => ref(db, `games/${pin}${path ? '/' + path : ''}`);

const genPin = () => String(Math.floor(100000 + Math.random() * 900000));

// ===================== المضيف =====================

// لوحة ألوان الفِرَق (تكفي حتى 10 فِرَق).
const TEAM_PALETTE = [
  '#73821B', '#1C919E', '#C00000', '#C8A415', '#0070C0',
  '#7B4FB5', '#C0701B', '#009999', '#5C6815', '#B5305F',
];
// أسماء الفِرَق ذات الطابع العلمي (حتى 8 فِرَق).
const TEAM_NAMES = [
  'الفقهاء', 'العلماء', 'الحفّاظ', 'طلبة العلم',
  'المفسّرون', 'المحدّثون', 'القرّاء', 'الأصوليون',
];
const MAX_TEAMS = 8;

// توليد قائمة الفِرَق حسب العدد المختار (2–8).
export const makeTeams = (count) =>
  Array.from({ length: Math.max(2, Math.min(MAX_TEAMS, count || 2)) }, (_, i) => ({
    id: 't' + (i + 1),
    name: TEAM_NAMES[i] || 'الفريق ' + (i + 1),
    color: TEAM_PALETTE[i % TEAM_PALETTE.length],
  }));

// إنشاء جلسة جديدة. تُمرَّر قائمة الأسئلة (مع الإجابات) لتبقى في متصفّح المضيف.
// opts: { mode: 'solo'|'team', teamCount, titleOverride }
export async function createGame(sectionId, questions, opts = {}) {
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
    sectionTitle: opts.titleOverride || meta.title,
    total: list.length,
    state: 'lobby',
    mode: opts.mode || 'solo',
    teamCount: opts.mode === 'team' ? Math.max(2, Math.min(8, opts.teamCount || 2)) : 0,
    hideStandings: !!opts.hideStandings,
    createdAt: serverTimestamp(),
  });
  return { pin, sectionTitle: opts.titleOverride || meta.title, questions: list };
}

// عرض المقدمة التشويقية للسؤال (بدون startAt بعد — لا يمكن الإجابة حتى بدء العدّ).
export async function showQuestion(pin, question, index, total, intro) {
  await update(gref(pin), {
    current: {
      index,
      total,
      type: question.type,
      question: question.question,
      options: question.options,
      timeLimit: TIME_LIMIT,
      intro: intro || '',
    },
    reveal: null,
    'meta/state': 'question',
  });
}

// بدء وقت الإجابة بعد المقدمة (يجعل السؤال قابلًا للإجابة ويبدأ المؤقّت).
export async function startAnswering(pin) {
  await update(gref(pin, 'current'), { startAt: serverTimestamp() });
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
  const roundResults = []; // نتائج هذا السؤال (لعرض الأسرع)
  for (const [pid, p] of Object.entries(players)) {
    const a = answers[pid];
    const correct = !!a && a.answerIndex === question.correctIndex;
    let gain = 0;
    let bonus = 0; // مكافأة السلسلة (مخفية عن اللاعب)
    let streak = p.streak || 0;
    const timeMs = a ? Math.max(0, a.at - startAt) : null;
    if (correct) {
      const elapsed = Math.max(0, Math.min(TIME_LIMIT, timeMs / 1000));
      const ratio = 1 - elapsed / TIME_LIMIT;
      gain = Math.round(POINTS_BASE * (0.5 + 0.5 * ratio));
      streak += 1;
      // مكافأة موزونة: 5 × طول السلسلة (سلسلة2=+10، 3=+15، 4=+20…)
      if (streak >= 2) bonus = 5 * streak;
    } else {
      streak = 0;
    }
    updates[`players/${pid}/score`] = (p.score || 0) + gain + bonus;
    updates[`players/${pid}/lastGain`] = gain; // المعروض لا يشمل مكافأة السلسلة
    updates[`players/${pid}/streak`] = streak;
    updates[`players/${pid}/lastCorrect`] = correct;
    updates[`players/${pid}/answered`] = !!a;
    updates[`players/${pid}/resultIndex`] = index;
    updates[`players/${pid}/correct`] = (p.correct || 0) + (correct ? 1 : 0);
    roundResults.push({ name: p.name, correct, gain, timeMs, streak });
  }
  updates['reveal'] = {
    index,
    correctIndex: question.correctIndex,
    explanation: question.explanation || '',
    source: question.source || '',
  };
  updates['meta/state'] = 'results';
  await update(gref(pin), updates);

  // الأسرع إجابةً صحيحة أولًا.
  roundResults.sort((x, y) => {
    if (x.correct !== y.correct) return x.correct ? -1 : 1;
    if (x.correct) return (x.timeMs ?? Infinity) - (y.timeMs ?? Infinity);
    return 0;
  });
  return { roundResults };
}

export async function endGame(pin) {
  await update(gref(pin, 'meta'), { state: 'over' });
}

// قراءة حالة اللعبة مرة واحدة (لاستئناف المضيف بعد تحديث الصفحة).
export async function getGameState(pin) {
  const snap = await get(gref(pin));
  if (!snap.exists()) return null;
  const v = snap.val();
  if (!v.meta) return null;
  return { meta: v.meta, current: v.current || null };
}

// إعادة حساب نتائج جولة (للعرض عند الاستئناف) دون تعديل النقاط.
export async function getRoundResults(pin, question, index) {
  const [playersSnap, answersSnap, startSnap] = await Promise.all([
    get(gref(pin, 'players')),
    get(gref(pin, `answers/${index}`)),
    get(gref(pin, 'current/startAt')),
  ]);
  const players = playersSnap.val() || {};
  const answers = answersSnap.val() || {};
  const startAt = startSnap.val() || 0;
  const rr = [];
  for (const [pid, p] of Object.entries(players)) {
    const a = answers[pid];
    const correct = !!a && a.answerIndex === question.correctIndex;
    const timeMs = a ? Math.max(0, a.at - startAt) : null;
    let gain = 0;
    if (correct) {
      const el = Math.max(0, Math.min(TIME_LIMIT, timeMs / 1000));
      gain = Math.round(POINTS_BASE * (0.5 + 0.5 * (1 - el / TIME_LIMIT)));
    }
    rr.push({ name: p.name, correct, gain, timeMs, streak: p.streak || 0 });
  }
  rr.sort((x, y) => {
    if (x.correct !== y.correct) return x.correct ? -1 : 1;
    if (x.correct) return (x.timeMs ?? Infinity) - (y.timeMs ?? Infinity);
    return 0;
  });
  return rr;
}

export async function deleteGame(pin) {
  await remove(gref(pin));
}

// ===================== اللاعب =====================

export async function joinGame(pin, name, team) {
  const metaSnap = await get(gref(pin, 'meta'));
  if (!metaSnap.exists()) return { error: 'الرمز غير صحيح' };
  const meta = metaSnap.val();
  // يُسمح بالدخول في أي وقت (حتى في نص اللعبة).
  // في النمط الجماعي يجب اختيار الفريق أولًا.
  if (meta.mode === 'team' && !team) return { needTeam: true, teamCount: meta.teamCount || 2 };
  const clean = String(name || '').trim().slice(0, 20) || 'لاعب';
  // عند الدخول في نص اللعبة ضمن فريق: ابدأ بمتوسط الفريق الحالي حتى لا يتغيّر المتوسط.
  let startScore = 0;
  if (team) {
    const players = (await get(gref(pin, 'players'))).val() || {};
    const members = Object.values(players).filter((p) => p.team === team);
    if (members.length) {
      startScore = Math.round(members.reduce((s, p) => s + (p.score || 0), 0) / members.length);
    }
  }
  const playerRef = push(gref(pin, 'players'));
  // لا نزيل اللاعب عند الانقطاع؛ ليتمكّن من العودة ومواصلة اللعب بنقاطه.
  const data = { name: clean, score: startScore, streak: 0, correct: 0, joinedAt: serverTimestamp() };
  if (team) data.team = team;
  await set(playerRef, data);
  return { playerId: playerRef.key, sectionTitle: meta.sectionTitle, mode: meta.mode };
}

// استئناف لاعب موجود (بعد إعادة فتح التطبيق أو انقطاع مؤقت).
export async function resumePlayer(pin, playerId) {
  const [metaSnap, pSnap] = await Promise.all([
    get(gref(pin, 'meta')),
    get(gref(pin, `players/${playerId}`)),
  ]);
  if (!metaSnap.exists() || !pSnap.exists()) return { error: 'انتهت الجلسة' };
  return { ok: true, sectionTitle: metaSnap.val().sectionTitle };
}

// هل أجاب اللاعب هذا السؤال؟ (لمنع تكرار الإجابة بعد العودة)
export async function hasAnswered(pin, index, playerId) {
  const s = await get(gref(pin, `answers/${index}/${playerId}`));
  return s.exists();
}

// خروج مقصود من الغرفة: إزالة اللاعب من الجلسة.
export async function leaveGame(pin, playerId) {
  if (pin && playerId) await remove(gref(pin, `players/${playerId}`)).catch(() => {});
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
    .map((p) => ({ name: p.name, score: p.score || 0, streak: p.streak || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

// أكثر الأفراد إجابات صحيحة.
export const topByCorrect = (playersObj, limit = 5) =>
  Object.values(playersObj || {})
    .map((p) => ({ name: p.name, score: p.correct || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

// ترتيب الفِرَق بمتوسط نقاط العضو (مجموع النقاط ÷ عدد الأعضاء) لعدالة الفِرَق المختلفة العدد.
export const teamLeaderboard = (playersObj) => {
  const agg = {};
  for (const p of Object.values(playersObj || {})) {
    const t = p.team || 'بلا فريق';
    if (!agg[t]) agg[t] = { sum: 0, n: 0 };
    agg[t].sum += p.score || 0;
    agg[t].n += 1;
  }
  return Object.entries(agg)
    .map(([name, { sum, n }]) => ({ name, score: Math.round(sum / Math.max(1, n)), members: n }))
    .sort((a, b) => b.score - a.score);
};
