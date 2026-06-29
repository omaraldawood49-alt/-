import { getSection } from './data/index.js';

// إدارة جلسات اللعب في الذاكرة: PIN -> game
const games = new Map();

const POINTS_BASE = 1000;        // نقاط الإجابة الصحيحة
const DEFAULT_TIME_LIMIT = 20;   // مهلة السؤال بالثواني

const genPin = () => {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000)); // 6 أرقام
  } while (games.has(pin));
  return pin;
};

export function createGame(sectionId, hostSocketId) {
  const section = getSection(sectionId);
  if (!section) return null;
  const pin = genPin();
  const game = {
    pin,
    sectionId,
    sectionTitle: section.title,
    hostSocketId,
    questions: section.questions,
    timeLimit: DEFAULT_TIME_LIMIT,
    players: new Map(), // socketId -> { name, score, lastGain, streak }
    state: 'lobby',     // lobby | question | results | over
    currentIndex: -1,
    questionStart: 0,
    answers: new Map(),  // socketId -> { answerIndex, time }
  };
  games.set(pin, game);
  return game;
}

export const getGame = (pin) => games.get(pin);

export function addPlayer(pin, socketId, name) {
  const game = games.get(pin);
  if (!game) return { error: 'PIN غير صحيح' };
  if (game.state !== 'lobby') return { error: 'بدأت اللعبة بالفعل' };
  const clean = String(name || '').trim().slice(0, 20) || 'لاعب';
  game.players.set(socketId, { name: clean, score: 0, lastGain: 0, streak: 0 });
  return { game };
}

export function playerList(game) {
  return [...game.players.values()].map((p) => ({ name: p.name }));
}

// بدء سؤال جديد. يُرجع البيانات الآمنة للإرسال (بدون الإجابة الصحيحة).
export function startQuestion(game) {
  game.currentIndex += 1;
  if (game.currentIndex >= game.questions.length) {
    game.state = 'over';
    return null;
  }
  game.state = 'question';
  game.questionStart = Date.now();
  game.answers = new Map();
  const q = game.questions[game.currentIndex];
  return {
    index: game.currentIndex,
    total: game.questions.length,
    type: q.type,
    question: q.question,
    options: q.options,
    timeLimit: game.timeLimit,
  };
}

export function submitAnswer(game, socketId, answerIndex) {
  if (game.state !== 'question') return false;
  if (!game.players.has(socketId)) return false;
  if (game.answers.has(socketId)) return false; // لا يُحتسب إلا أول جواب
  const elapsed = (Date.now() - game.questionStart) / 1000;
  game.answers.set(socketId, { answerIndex, time: elapsed });
  return true;
}

// تصحيح السؤال الحالي وحساب النقاط، وإرجاع النتائج + الترتيب.
export function scoreQuestion(game) {
  const q = game.questions[game.currentIndex];
  const perPlayer = {};
  for (const [socketId, player] of game.players) {
    const ans = game.answers.get(socketId);
    const correct = !!ans && ans.answerIndex === q.correctIndex;
    let gain = 0;
    if (correct) {
      // مكافأة السرعة: تتناقص خطّيًا مع الزمن ضمن المهلة (نصف النقاط للسرعة).
      const ratio = Math.max(0, 1 - ans.time / game.timeLimit);
      gain = Math.round(POINTS_BASE * (0.5 + 0.5 * ratio));
      player.streak += 1;
    } else {
      player.streak = 0;
    }
    player.score += gain;
    player.lastGain = gain;
    perPlayer[socketId] = {
      name: player.name,
      correct,
      answered: !!ans,
      gain,
      score: player.score,
      streak: player.streak,
    };
  }
  game.state = 'results';
  return {
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    source: q.source,
    perPlayer,
    leaderboard: leaderboard(game),
    isLast: game.currentIndex >= game.questions.length - 1,
  };
}

export function leaderboard(game, limit = 5) {
  return [...game.players.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((p) => ({ name: p.name, score: p.score }));
}

export function removePlayer(socketId) {
  for (const game of games.values()) {
    if (game.players.delete(socketId)) return game;
  }
  return null;
}

export function endGame(pin) {
  games.delete(pin);
}

// تنظيف الجلسة عند خروج المضيف.
export function removeGamesByHost(hostSocketId) {
  const ended = [];
  for (const [pin, game] of games) {
    if (game.hostSocketId === hostSocketId) {
      ended.push(pin);
      games.delete(pin);
    }
  }
  return ended;
}
