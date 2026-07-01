import { useEffect, useRef, useState } from 'react';
import {
  joinGame,
  resumePlayer,
  hasAnswered,
  leaveGame,
  submitAnswer,
  watchMeta,
  watchCurrent,
  watchReveal,
  watchPlayer,
  makeTeams,
} from '../game.js';
import AnswerButton from '../components/AnswerButton.jsx';
import Explanation from '../components/Explanation.jsx';

const SESSION_KEY = 'aqim_session';
const saveSession = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));
const loadSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } };
const clearSession = () => localStorage.removeItem(SESSION_KEY);

export default function Player({ onExit, initialPin = '' }) {
  const [joined, setJoined] = useState(false);
  const [pin, setPin] = useState(initialPin);
  const [name, setName] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [error, setError] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');

  const [meta, setMeta] = useState(null);
  const [current, setCurrent] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [me, setMe] = useState(null);
  const [answeredIndex, setAnsweredIndex] = useState(-1);
  const [showTeams, setShowTeams] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const pinRef = useRef('');

  // استئناف الجلسة المحفوظة تلقائيًا عند فتح التطبيق (إن وُجدت وما زالت قائمة).
  useEffect(() => {
    const s = loadSession();
    if (!s?.pin || !s?.playerId) return;
    resumePlayer(s.pin, s.playerId).then((res) => {
      if (res.ok) {
        pinRef.current = s.pin;
        setPlayerId(s.playerId);
        setName(s.name || '');
        setSectionTitle(res.sectionTitle);
        setJoined(true);
      } else {
        clearSession();
      }
    });
  }, []);

  // بعد العودة أثناء سؤال: إن كان قد أجاب فعلًا، لا تعرض السؤال مجددًا.
  useEffect(() => {
    if (!joined || !playerId || meta?.state !== 'question' || !current) return;
    hasAnswered(pinRef.current, current.index, playerId).then((did) => {
      if (did) setAnsweredIndex(current.index);
    });
  }, [joined, playerId, current?.index, meta?.state]);

  useEffect(() => {
    if (!joined) return;
    const p = pinRef.current;
    const offs = [
      watchMeta(p, (m) => {
        if (m === null) {
          setError('انتهت الجلسة من قبل المعلّم');
          setJoined(false);
          clearSession();
        } else setMeta(m);
      }),
      watchCurrent(p, setCurrent),
      watchReveal(p, setReveal),
      watchPlayer(p, playerId, setMe),
    ];
    return () => offs.forEach((off) => off && off());
  }, [joined, playerId]);

  const join = async (team) => {
    setError('');
    if (!pin.trim() || !name.trim()) return setError('أدخل الرمز والاسم');
    try {
      const res = await joinGame(pin.trim(), name.trim(), team);
      if (res.needTeam) { // النمط جماعي: اختر الفريق
        setTeamCount(res.teamCount || 2);
        setShowTeams(true);
        return;
      }
      if (res.error) return setError(res.error);
      pinRef.current = pin.trim();
      setPlayerId(res.playerId);
      setSectionTitle(res.sectionTitle);
      setJoined(true);
      setShowTeams(false);
      saveSession({ pin: pin.trim(), playerId: res.playerId, name: name.trim() });
    } catch (e) {
      setError('تعذّر الاتصال. تأكّد من الرمز وإعداد Firebase.');
    }
  };

  const answer = (i) => {
    setAnsweredIndex(current.index);
    submitAnswer(pinRef.current, current.index, playerId, i).catch(() => {});
  };

  const exit = () => { clearSession(); onExit(); };

  // خروج مقصود من الغرفة (يُزيل اللاعب من الجلسة).
  const leaveRoom = async () => {
    if (!confirm('هل تريد الخروج من الغرفة؟')) return;
    await leaveGame(pinRef.current, playerId);
    clearSession();
    onExit();
  };

  const LeaveBtn = () => (
    <button className="leave-room" onClick={leaveRoom}>🚪 خروج من الغرفة</button>
  );

  // ===== اختيار الفريق (النمط الجماعي) =====
  if (!joined && showTeams) {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--teal)' }}>اختر فريقك</h2>
        <p className="subtitle">مرحبًا {name}! انضمّ إلى أحد الفريقين</p>
        {error && <p className="error">{error}</p>}
        {makeTeams(teamCount).map((t) => (
          <button key={t.id} className="btn" style={{ background: t.color, marginBottom: 12 }} onClick={() => join(t.name)}>
            {t.name}
          </button>
        ))}
        <button className="btn ghost" style={{ marginTop: 4 }} onClick={() => setShowTeams(false)}>رجوع</button>
      </div>
    );
  }

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
        <button className="btn teal" onClick={() => join()}>انضمام</button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={exit}>رجوع</button>
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
        <button className="btn" onClick={exit}>خروج</button>
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
        {me.lastCorrect && me.streak >= 3 && (
          <div className="fire-banner">
            <div className="fire-emojis">🔥🔥🔥</div>
            <div className="fire-text">سلسلة ×{me.streak}! أنت مشتعل 🚀</div>
          </div>
        )}
        {me.lastCorrect && me.streak === 2 && <p className="streak">🔥 سلسلة ×2 — واصِل!</p>}
        {!meta?.hideStandings && <p style={{ marginTop: 14, fontWeight: 700 }}>مجموع نقاطك: {me.score}</p>}
        <Explanation text={reveal.explanation} source={reveal.source} />
        <p className="muted" style={{ marginTop: 16 }}>بانتظار السؤال التالي…</p>
        <LeaveBtn />
      </div>
    );
  }

  // ===== المقدمة التشويقية (قبل بدء الإجابة) =====
  if (state === 'question' && current && current.index !== answeredIndex && !current.startAt) {
    return (
      <div className="card intro-card">
        <p className="muted">السؤال {current.index + 1} / {current.total}</p>
        <h2 className="intro-teaser">{current.intro || 'استعدّوا!'}</h2>
        <div className="intro-pulse">●</div>
        <p className="muted">استعدّ…</p>
        <LeaveBtn />
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
        <div style={{ textAlign: 'center' }}><LeaveBtn /></div>
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
        <LeaveBtn />
      </div>
    );
  }

  // ===== اللوبي / الانتظار =====
  return (
    <div className="card">
      <h2 style={{ color: 'var(--olive)' }}>{name} ✅</h2>
      {me?.team && <p className="qr-label">فريقك: {me.team}</p>}
      <p className="big-wait">{sectionTitle}</p>
      <div className="spinner" />
      <p className="muted">
        {meta?.state === 'lobby' ? 'انضممتَ بنجاح! بانتظار أن يبدأ المعلّم اللعبة…' : 'انضممتَ بنجاح! بانتظار السؤال التالي…'}
      </p>
      <LeaveBtn />
    </div>
  );
}
