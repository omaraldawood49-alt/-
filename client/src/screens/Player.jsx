import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';
import AnswerButton from '../components/AnswerButton.jsx';

export default function Player({ onExit }) {
  const [stage, setStage] = useState('join'); // join | wait | question | answered | result | over
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [finalScore, setFinalScore] = useState(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    socket.on('question:show', (payload) => {
      setQ(payload);
      setPicked(null);
      setResult(null);
      setStage('question');
    });
    socket.on('player:result', (res) => {
      scoreRef.current = res.score;
      setResult(res);
      setStage('result');
    });
    socket.on('game:over', () => {
      setFinalScore(scoreRef.current);
      setStage('over');
    });
    socket.on('game:ended', ({ reason }) => {
      setError(reason || 'انتهت الجلسة');
      setStage('join');
    });
    return () => {
      socket.off('question:show');
      socket.off('player:result');
      socket.off('game:over');
      socket.off('game:ended');
    };
  }, []);

  const join = () => {
    setError('');
    if (!pin.trim() || !name.trim()) return setError('أدخل الرمز والاسم');
    socket.emit('player:join', { pin: pin.trim(), name: name.trim() }, (res) => {
      if (res?.error) return setError(res.error);
      setSectionTitle(res.sectionTitle);
      setStage('wait');
    });
  };

  const answer = (i) => {
    setPicked(i);
    socket.emit('player:answer', { answerIndex: i });
    setStage('answered');
  };

  // ===== الانضمام =====
  if (stage === 'join') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--teal)' }}>الانضمام للجلسة</h2>
        <p className="subtitle">أدخل الرمز الذي يعرضه المعلّم واسمك</p>
        {error && <p className="error">{error}</p>}
        <input
          className="field"
          placeholder="رمز PIN"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ letterSpacing: 6, direction: 'ltr' }}
        />
        <input
          className="field"
          placeholder="اسمك"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn teal" onClick={join}>
          انضمام
        </button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={onExit}>
          رجوع
        </button>
      </div>
    );
  }

  // ===== الانتظار =====
  if (stage === 'wait') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>{name} ✅</h2>
        <p className="big-wait">{sectionTitle}</p>
        <div className="spinner" />
        <p className="muted">انضممتَ بنجاح! بانتظار أن يبدأ المعلّم اللعبة…</p>
      </div>
    );
  }

  // ===== السؤال =====
  if (stage === 'question' && q) {
    return (
      <div className="question-screen">
        <p className="muted" style={{ marginBottom: 12 }}>
          سؤال {q.index + 1} / {q.total}
        </p>
        <div className={`answers-grid ${q.type === 'truefalse' ? 'tf' : ''}`}>
          {q.options.map((opt, i) => (
            <AnswerButton key={i} index={i} text={opt} onClick={() => answer(i)} />
          ))}
        </div>
      </div>
    );
  }

  // ===== بعد الإجابة، بانتظار النتيجة =====
  if (stage === 'answered') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--teal)' }}>تم استلام إجابتك</h2>
        <div className="spinner" />
        <p className="muted">بانتظار بقية اللاعبين…</p>
      </div>
    );
  }

  // ===== نتيجة اللاعب =====
  if (stage === 'result' && result) {
    return (
      <div className="card">
        <div className={`result-banner ${result.correct ? 'ok' : 'no'}`}>
          {result.correct ? '✅ إجابة صحيحة!' : result.answered ? '❌ إجابة خاطئة' : '⏱️ انتهى الوقت'}
        </div>
        {result.correct && <p className="gain">+{result.gain} نقطة</p>}
        {result.streak > 1 && <p className="streak">🔥 سلسلة صحيحة ×{result.streak}</p>}
        <p style={{ marginTop: 14, fontWeight: 700 }}>مجموع نقاطك: {result.score}</p>
        {result.explanation && <p className="muted" style={{ marginTop: 12 }}>💡 {result.explanation}</p>}
        <p className="muted" style={{ marginTop: 16 }}>بانتظار السؤال التالي…</p>
      </div>
    );
  }

  // ===== النهاية =====
  if (stage === 'over') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>انتهت اللعبة 🎉</h2>
        <p className="big-wait">{name}</p>
        <p className="gain" style={{ fontSize: '2.2rem' }}>{finalScore} نقطة</p>
        <p className="muted" style={{ margin: '14px 0' }}>شاهد ترتيبك النهائي على شاشة المعلّم.</p>
        <button className="btn" onClick={onExit}>
          خروج
        </button>
      </div>
    );
  }

  return <div className="spinner" />;
}
