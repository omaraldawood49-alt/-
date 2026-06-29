import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { sectionSummaries } from '../data/index.js';
import { getQuestionsOnce } from '../questions.js';
import {
  createGame,
  showQuestion,
  revealAndScore,
  endGame,
  deleteGame,
  watchPlayers,
  watchAnswers,
  toLeaderboard,
  TIME_LIMIT,
} from '../game.js';
import Timer from '../components/Timer.jsx';
import AnswerButton from '../components/AnswerButton.jsx';
import Leaderboard from '../components/Leaderboard.jsx';

const summaries = sectionSummaries();

export default function Host({ onExit }) {
  const [stage, setStage] = useState('pick'); // pick | lobby | question | results | over
  const [pin, setPin] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [playersObj, setPlayersObj] = useState({});
  const [index, setIndex] = useState(-1);
  const [q, setQ] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [reveal, setReveal] = useState(null);

  const questionsRef = useRef([]); // الأسئلة مع الإجابات (في متصفّح المضيف فقط)
  const totalRef = useRef(0);
  const revealedRef = useRef(-1); // آخر فهرس تم كشفه (منع الكشف المزدوج)
  const playersCountRef = useRef(0);

  const players = Object.values(playersObj);
  playersCountRef.current = players.length;

  // اشتراك دائم بقائمة اللاعبين بعد إنشاء الجلسة.
  useEffect(() => {
    if (!pin) return;
    const off = watchPlayers(pin, setPlayersObj);
    return off;
  }, [pin]);

  // اشتراك بإجابات السؤال الحالي للكشف المبكر عند إجابة الجميع.
  useEffect(() => {
    if (!pin || stage !== 'question' || index < 0) return;
    const off = watchAnswers(pin, index, (answers) => {
      const count = Object.keys(answers).length;
      setAnsweredCount(count);
      if (count > 0 && count >= playersCountRef.current) reveal_(index);
    });
    return off;
  }, [pin, stage, index]);

  const pickSection = async (sectionId) => {
    try {
      const questions = await getQuestionsOnce(sectionId); // من Firebase أو الافتراضي
      const { pin, sectionTitle } = await createGame(sectionId, questions);
      questionsRef.current = questions;
      totalRef.current = questions.length;
      setPin(pin);
      setSectionTitle(sectionTitle);
      setStage('lobby');
    } catch (e) {
      alert(e.message || 'تعذّر إنشاء الجلسة. تأكّد من إعداد Firebase.');
    }
  };

  const goQuestion = async (i) => {
    const question = questionsRef.current[i];
    revealedRef.current = -1;
    setReveal(null);
    setAnsweredCount(0);
    setIndex(i);
    setQ({ ...question, index: i, total: totalRef.current });
    setStage('question');
    await showQuestion(pin, question, i, totalRef.current);
  };

  const reveal_ = async (i) => {
    if (revealedRef.current === i) return;
    revealedRef.current = i;
    const question = questionsRef.current[i];
    await revealAndScore(pin, question, i);
    setReveal({
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      isLast: i >= totalRef.current - 1,
    });
    setStage('results');
  };

  const next = async () => {
    const i = index + 1;
    if (i >= totalRef.current) {
      await endGame(pin);
      setStage('over');
    } else {
      goQuestion(i);
    }
  };

  const quit = async () => {
    if (pin) await deleteGame(pin).catch(() => {});
    onExit();
  };

  // ===== اختيار القسم =====
  if (stage === 'pick') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)', marginBottom: 6 }}>اختر القسم</h2>
        <p className="subtitle">حدّد القسم الذي ستلعبه مع طلابك</p>
        <div className="sections">
          {summaries.map((s) => (
            <button key={s.id} className="section-card" style={{ background: s.color }} onClick={() => pickSection(s.id)}>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <span className="count">{s.count} سؤالًا</span>
            </button>
          ))}
        </div>
        <button className="btn ghost" onClick={onExit}>رجوع</button>
      </div>
    );
  }

  // ===== اللوبي =====
  if (stage === 'lobby') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>{sectionTitle}</h2>
        <div className="pin-box">
          <div className="label">رمز الدخول (PIN)</div>
          <div className="pin">{pin}</div>
        </div>
        <div className="qr-box">
          <QRCodeSVG
            value={`${window.location.origin}/?pin=${pin}`}
            size={188}
            level="M"
            bgColor="#ffffff"
            fgColor="#1d2129"
          />
          <div className="qr-label">📷 امسح الباركود للانضمام مباشرةً</div>
        </div>
        <p className="muted">أو افتحوا الرابط، اختاروا «الانضمام»، وأدخلوا الرمز.</p>
        <div className="players">
          {players.length === 0 && <p className="muted">بانتظار انضمام اللاعبين…</p>}
          {players.map((p, i) => (
            <span key={i} className="player-chip">{p.name}</span>
          ))}
        </div>
        <button className="btn" disabled={players.length === 0} onClick={() => goQuestion(0)}>
          ابدأ اللعبة ({players.length})
        </button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={quit}>إنهاء الجلسة</button>
      </div>
    );
  }

  // ===== عرض السؤال =====
  if (stage === 'question' && q) {
    return (
      <div className="question-screen">
        <div className="q-head">
          <span>سؤال {q.index + 1} / {q.total}</span>
          <span>أجاب {answeredCount} / {players.length}</span>
        </div>
        <Timer seconds={TIME_LIMIT} onEnd={() => reveal_(index)} />
        <div className="q-text">{q.question}</div>
        <div className={`answers-grid ${q.type === 'truefalse' ? 'tf' : ''}`}>
          {q.options.map((opt, i) => (
            <AnswerButton key={i} index={i} text={opt} disabled />
          ))}
        </div>
        <button className="btn ghost" style={{ maxWidth: 300, margin: '16px auto 0' }} onClick={() => reveal_(index)}>
          كشف الإجابة الآن
        </button>
      </div>
    );
  }

  // ===== نتائج السؤال =====
  if (stage === 'results' && reveal && q) {
    return (
      <div className="question-screen">
        <div className="q-text" style={{ fontSize: '1.4rem' }}>{q.question}</div>
        <div className={`answers-grid ${q.type === 'truefalse' ? 'tf' : ''}`}>
          {q.options.map((opt, i) => (
            <AnswerButton key={i} index={i} text={opt} disabled state={i === reveal.correctIndex ? 'correct' : 'dim'} />
          ))}
        </div>
        {reveal.explanation && (
          <p className="muted" style={{ marginTop: 14, fontSize: '1.05rem' }}>💡 {reveal.explanation}</p>
        )}
        <h3 style={{ margin: '20px 0 8px', color: 'var(--olive)' }}>الترتيب</h3>
        <Leaderboard rows={toLeaderboard(playersObj, 5)} />
        <button className="btn" style={{ maxWidth: 360, margin: '0 auto' }} onClick={next}>
          {reveal.isLast ? 'عرض النتيجة النهائية' : 'السؤال التالي'}
        </button>
      </div>
    );
  }

  // ===== المنصة النهائية =====
  if (stage === 'over') {
    const all = toLeaderboard(playersObj, 50);
    const [p1, p2, p3] = all;
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>🏆 النتيجة النهائية</h2>
        <div className="podium">
          {p2 && <div className="place p2"><div className="medal">🥈</div><div className="pname">{p2.name}</div><div>{p2.score}</div></div>}
          {p1 && <div className="place p1"><div className="medal">🥇</div><div className="pname">{p1.name}</div><div>{p1.score}</div></div>}
          {p3 && <div className="place p3"><div className="medal">🥉</div><div className="pname">{p3.name}</div><div>{p3.score}</div></div>}
        </div>
        <Leaderboard rows={all} />
        <button className="btn" onClick={quit}>جلسة جديدة</button>
      </div>
    );
  }

  return <div className="spinner" />;
}
