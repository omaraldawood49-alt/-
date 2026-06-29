import { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import Timer from '../components/Timer.jsx';
import AnswerButton from '../components/AnswerButton.jsx';
import Leaderboard from '../components/Leaderboard.jsx';

export default function Host({ onExit }) {
  const [sections, setSections] = useState([]);
  const [stage, setStage] = useState('pick'); // pick | lobby | question | results | over
  const [pin, setPin] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [players, setPlayers] = useState([]);
  const [q, setQ] = useState(null);
  const [answered, setAnswered] = useState({ answered: 0, totalPlayers: 0 });
  const [results, setResults] = useState(null);
  const [podium, setPodium] = useState(null);

  useEffect(() => {
    fetch('/api/sections')
      .then((r) => r.json())
      .then(setSections)
      .catch(() => {});

    socket.on('lobby:update', ({ players }) => setPlayers(players));
    socket.on('question:show', (payload) => {
      setResults(null);
      setQ(payload);
      setAnswered({ answered: 0, totalPlayers: players.length });
      setStage('question');
    });
    socket.on('answers:update', setAnswered);
    socket.on('question:results', (res) => {
      setResults(res);
      setStage('results');
    });
    socket.on('game:over', ({ podium, all }) => {
      setPodium({ podium, all });
      setStage('over');
    });

    return () => {
      socket.off('lobby:update');
      socket.off('question:show');
      socket.off('answers:update');
      socket.off('question:results');
      socket.off('game:over');
    };
  }, [players.length]);

  const createGame = (sectionId) => {
    socket.emit('host:create', { sectionId }, (res) => {
      if (res?.error) return alert(res.error);
      setPin(res.pin);
      setSectionTitle(res.sectionTitle);
      setStage('lobby');
    });
  };

  // ===== اختيار القسم =====
  if (stage === 'pick') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)', marginBottom: 6 }}>اختر القسم</h2>
        <p className="subtitle">حدّد القسم الذي ستلعبه مع طلابك</p>
        <div className="sections">
          {sections.map((s) => (
            <button
              key={s.id}
              className="section-card"
              style={{ background: s.color }}
              onClick={() => createGame(s.id)}
            >
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <span className="count">{s.count} سؤالًا</span>
            </button>
          ))}
        </div>
        <button className="btn ghost" onClick={onExit}>
          رجوع
        </button>
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
        <p className="muted">ادخلوا على نفس الرابط، اختاروا «الانضمام»، وأدخلوا الرمز.</p>
        <div className="players">
          {players.length === 0 && <p className="muted">بانتظار انضمام اللاعبين…</p>}
          {players.map((p, i) => (
            <span key={i} className="player-chip">
              {p.name}
            </span>
          ))}
        </div>
        <button
          className="btn"
          disabled={players.length === 0}
          onClick={() => socket.emit('host:start')}
        >
          ابدأ اللعبة ({players.length})
        </button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={onExit}>
          إنهاء الجلسة
        </button>
      </div>
    );
  }

  // ===== عرض السؤال =====
  if (stage === 'question' && q) {
    return (
      <div className="question-screen">
        <div className="q-head">
          <span>سؤال {q.index + 1} / {q.total}</span>
          <span>
            أجاب {answered.answered} / {answered.totalPlayers || players.length}
          </span>
        </div>
        <Timer seconds={q.timeLimit} onEnd={() => socket.emit('host:reveal')} />
        <div className="q-text">{q.question}</div>
        <div className={`answers-grid ${q.type === 'truefalse' ? 'tf' : ''}`}>
          {q.options.map((opt, i) => (
            <AnswerButton key={i} index={i} text={opt} disabled />
          ))}
        </div>
        <button className="btn ghost" style={{ marginTop: 16, maxWidth: 300, margin: '16px auto 0' }} onClick={() => socket.emit('host:reveal')}>
          كشف الإجابة الآن
        </button>
      </div>
    );
  }

  // ===== نتائج السؤال =====
  if (stage === 'results' && results && q) {
    return (
      <div className="question-screen">
        <div className="q-text" style={{ fontSize: '1.4rem' }}>{q.question}</div>
        <div className={`answers-grid ${q.type === 'truefalse' ? 'tf' : ''}`}>
          {q.options.map((opt, i) => (
            <AnswerButton
              key={i}
              index={i}
              text={opt}
              disabled
              state={i === results.correctIndex ? 'correct' : 'dim'}
            />
          ))}
        </div>
        {results.explanation && (
          <p className="muted" style={{ marginTop: 14, fontSize: '1.05rem' }}>
            💡 {results.explanation}
          </p>
        )}
        <h3 style={{ margin: '20px 0 8px', color: 'var(--olive)' }}>الترتيب</h3>
        <Leaderboard rows={results.leaderboard} />
        <button className="btn" style={{ maxWidth: 360, margin: '0 auto' }} onClick={() => socket.emit('host:next')}>
          {results.isLast ? 'عرض النتيجة النهائية' : 'السؤال التالي'}
        </button>
      </div>
    );
  }

  // ===== المنصة النهائية =====
  if (stage === 'over' && podium) {
    const [p1, p2, p3] = podium.podium;
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>🏆 النتيجة النهائية</h2>
        <div className="podium">
          {p2 && (
            <div className="place p2">
              <div className="medal">🥈</div>
              <div className="pname">{p2.name}</div>
              <div>{p2.score}</div>
            </div>
          )}
          {p1 && (
            <div className="place p1">
              <div className="medal">🥇</div>
              <div className="pname">{p1.name}</div>
              <div>{p1.score}</div>
            </div>
          )}
          {p3 && (
            <div className="place p3">
              <div className="medal">🥉</div>
              <div className="pname">{p3.name}</div>
              <div>{p3.score}</div>
            </div>
          )}
        </div>
        <Leaderboard rows={podium.all} />
        <button className="btn" onClick={onExit}>
          جلسة جديدة
        </button>
      </div>
    );
  }

  return <div className="spinner" />;
}
