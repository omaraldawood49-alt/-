import { useEffect, useRef, useState } from 'react';
import {
  joinGame,
  submitAnswer,
  watchMeta,
  watchCurrent,
  watchReveal,
  watchPlayer,
} from '../game.js';
import AnswerButton from '../components/AnswerButton.jsx';

export default function Player({ onExit }) {
  const [joined, setJoined] = useState(false);
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');

  const [meta, setMeta] = useState(null);
  const [current, setCurrent] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [me, setMe] = useState(null);
  const [answeredIndex, setAnsweredIndex] = useState(-1);
  const pinRef = useRef('');

  useEffect(() => {
    if (!joined) return;
    const p = pinRef.current;
    const offs = [
      watchMeta(p, (m) => {
        if (m === null) {
          setError('انتهت الجلسة من قبل المعلّم');
          setJoined(false);
        } else setMeta(m);
      }),
      watchCurrent(p, setCurrent),
      watchReveal(p, setReveal),
      watchPlayer(p, playerId, setMe),
    ];
    return () => offs.forEach((off) => off && off());
  }, [joined, playerId]);

  const join = async () => {
    setError('');
    if (!pin.trim() || !name.trim()) return setError('أدخل الرمز والاسم');
    try {
      const res = await joinGame(pin.trim(), name.trim());
      if (res.error) return setError(res.error);
      pinRef.current = pin.trim();
      setPlayerId(res.playerId);
      setSectionTitle(res.sectionTitle);
      setJoined(true);
    } catch (e) {
      setError('تعذّر الاتصال. تأكّد من الرمز وإعداد Firebase.');
    }
  };

  const answer = (i) => {
    setAnsweredIndex(current.index);
    submitAnswer(pinRef.current, current.index, playerId, i).catch(() => {});
  };

  // ===== الانضمام =====
  if (!joined) {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--teal)' }}>الانضمام للجلسة</h2>
        <p className="subtitle">أدخل الرمز الذي يعرضه المعلّم واسمك</p>
        {error && <p className="error">{error}</p>}
        <input className="field" placeholder="رمز PIN" inputMode="numeric" value={pin}
          onChange={(e) => setPin(e.target.value)} style={{ letterSpacing: 6, direction: 'ltr' }} />
        <input className="field" placeholder="اسمك" maxLength={20} value={name}
          onChange={(e) => setName(e.target.value)} />
        <button className="btn teal" onClick={join}>انضمام</button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={onExit}>رجوع</button>
      </div>
    );
  }

  const state = meta?.state;

  // ===== النتيجة النهائية =====
  if (state === 'over') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>انتهت اللعبة 🎉</h2>
        <p className="big-wait">{name}</p>
        <p className="gain" style={{ fontSize: '2.2rem' }}>{me?.score ?? 0} نقطة</p>
        <p className="muted" style={{ margin: '14px 0' }}>شاهد ترتيبك النهائي على شاشة المعلّم.</p>
        <button className="btn" onClick={onExit}>خروج</button>
      </div>
    );
  }

  // ===== نتيجة السؤال =====
  if (state === 'results' && reveal && me?.resultIndex === reveal.index) {
    return (
      <div className="card">
        <div className={`result-banner ${me.lastCorrect ? 'ok' : 'no'}`}>
          {me.lastCorrect ? '✅ إجابة صحيحة!' : me.answered ? '❌ إجابة خاطئة' : '⏱️ لم تُجب'}
        </div>
        {me.lastCorrect && <p className="gain">+{me.lastGain} نقطة</p>}
        {me.streak > 1 && <p className="streak">🔥 سلسلة صحيحة ×{me.streak}</p>}
        <p style={{ marginTop: 14, fontWeight: 700 }}>مجموع نقاطك: {me.score}</p>
        {reveal.explanation && <p className="muted" style={{ marginTop: 12 }}>💡 {reveal.explanation}</p>}
        <p className="muted" style={{ marginTop: 16 }}>بانتظار السؤال التالي…</p>
      </div>
    );
  }

  // ===== السؤال =====
  if (state === 'question' && current && current.index !== answeredIndex) {
    return (
      <div className="question-screen">
        <p className="muted" style={{ marginBottom: 12 }}>سؤال {current.index + 1} / {current.total}</p>
        <div className={`answers-grid ${current.type === 'truefalse' ? 'tf' : ''}`}>
          {current.options.map((opt, i) => (
            <AnswerButton key={i} index={i} text={opt} onClick={() => answer(i)} />
          ))}
        </div>
      </div>
    );
  }

  // ===== بعد الإجابة =====
  if (state === 'question' && current && current.index === answeredIndex) {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--teal)' }}>تم استلام إجابتك</h2>
        <div className="spinner" />
        <p className="muted">بانتظار بقية اللاعبين…</p>
      </div>
    );
  }

  // ===== اللوبي / الانتظار =====
  return (
    <div className="card">
      <h2 style={{ color: 'var(--olive)' }}>{name} ✅</h2>
      <p className="big-wait">{sectionTitle}</p>
      <div className="spinner" />
      <p className="muted">انضممتَ بنجاح! بانتظار أن يبدأ المعلّم اللعبة…</p>
    </div>
  );
}
