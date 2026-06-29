import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

import { sectionSummaries } from './data/index.js';
import * as gm from './gameManager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// REST: قائمة الأقسام للعرض في الواجهة.
app.get('/api/sections', (_req, res) => res.json(sectionSummaries()));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// تقديم واجهة الإنتاج المبنية (client/dist) إن وُجدت.
const clientDist = join(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

io.on('connection', (socket) => {
  let role = null; // 'host' | 'player'
  let pin = null;

  // ===== المضيف =====
  socket.on('host:create', ({ sectionId }, cb) => {
    const game = gm.createGame(sectionId, socket.id);
    if (!game) return cb?.({ error: 'القسم غير موجود' });
    role = 'host';
    pin = game.pin;
    socket.join(pin);
    cb?.({ pin: game.pin, sectionTitle: game.sectionTitle, total: game.questions.length });
  });

  socket.on('host:start', () => {
    const game = gm.getGame(pin);
    if (!game || game.hostSocketId !== socket.id) return;
    nextQuestion(game);
  });

  socket.on('host:next', () => {
    const game = gm.getGame(pin);
    if (!game || game.hostSocketId !== socket.id) return;
    nextQuestion(game);
  });

  // إنهاء عرض السؤال يدويًا (زر المضيف) أو تلقائيًا بانتهاء الوقت.
  socket.on('host:reveal', () => {
    const game = gm.getGame(pin);
    if (!game || game.hostSocketId !== socket.id) return;
    revealResults(game);
  });

  function nextQuestion(game) {
    const payload = gm.startQuestion(game);
    if (!payload) {
      io.to(game.pin).emit('game:over', { podium: gm.leaderboard(game, 3), all: gm.leaderboard(game, 50) });
      return;
    }
    io.to(game.pin).emit('question:show', payload);
    // كشف تلقائي عند انتهاء المهلة.
    clearTimeout(game._timer);
    game._timer = setTimeout(() => revealResults(game), payload.timeLimit * 1000 + 500);
  }

  function revealResults(game) {
    if (game.state !== 'question') return;
    clearTimeout(game._timer);
    const results = gm.scoreQuestion(game);
    // المضيف يرى كل شيء؛ كل لاعب يرى نتيجته فقط.
    io.to(game.hostSocketId).emit('question:results', {
      correctIndex: results.correctIndex,
      explanation: results.explanation,
      source: results.source,
      leaderboard: results.leaderboard,
      isLast: results.isLast,
    });
    for (const [sid, r] of Object.entries(results.perPlayer)) {
      io.to(sid).emit('player:result', {
        correctIndex: results.correctIndex,
        correct: r.correct,
        answered: r.answered,
        gain: r.gain,
        score: r.score,
        streak: r.streak,
        explanation: results.explanation,
      });
    }
  }

  // ===== اللاعب =====
  socket.on('player:join', ({ pin: joinPin, name }, cb) => {
    const { game, error } = gm.addPlayer(joinPin, socket.id, name);
    if (error) return cb?.({ error });
    role = 'player';
    pin = joinPin;
    socket.join(joinPin);
    cb?.({ ok: true, sectionTitle: game.sectionTitle });
    io.to(game.hostSocketId).emit('lobby:update', { players: gm.playerList(game) });
  });

  socket.on('player:answer', ({ answerIndex }, cb) => {
    const game = gm.getGame(pin);
    if (!game) return;
    const ok = gm.submitAnswer(game, socket.id, answerIndex);
    cb?.({ ok });
    if (ok) {
      const answered = game.answers.size;
      const totalPlayers = game.players.size;
      io.to(game.hostSocketId).emit('answers:update', { answered, totalPlayers });
      // كشف مبكر عند إجابة الجميع.
      if (answered >= totalPlayers && totalPlayers > 0) revealResults(game);
    }
  });

  // ===== فصل الاتصال =====
  socket.on('disconnect', () => {
    if (role === 'host' && pin) {
      const game = gm.getGame(pin);
      if (game) clearTimeout(game._timer);
      gm.removeGamesByHost(socket.id);
      io.to(pin).emit('game:ended', { reason: 'انتهت الجلسة من قبل المضيف' });
    } else if (role === 'player') {
      const game = gm.removePlayer(socket.id);
      if (game) io.to(game.hostSocketId).emit('lobby:update', { players: gm.playerList(game) });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅ خادم «أقم صلاتك» يعمل على المنفذ ${PORT}`);
});
