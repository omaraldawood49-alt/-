import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { chapterList, mixFocus } from '../data/index.js';
import { getQuestionsOnce } from '../questions.js';
import {
  createGame,
  showQuestion,
  startAnswering,
  revealAndScore,
  endGame,
  deleteGame,
  watchPlayers,
  watchAnswers,
  toLeaderboard,
  teamLeaderboard,
  makeTeams,
  getGameState,
  getRoundResults,
  TIME_LIMIT,
} from '../game.js';
import Timer from '../components/Timer.jsx';
import AnswerButton from '../components/AnswerButton.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import Explanation from '../components/Explanation.jsx';
import QuestionIntro from '../components/QuestionIntro.jsx';

const CHAPTERS = chapterList();

// عبارات تشويقية قبل كل سؤال.
const TEASERS = [
  'استعدّوا… 🔥',
  'ركّزوا جيدًا!',
  'من سيكون الأسرع؟ ⚡',
  'سؤالٌ جديد قادم…',
  'هيّا بنا! 💪',
  'بسم الله، انطلقوا!',
  'شدّوا الهمّة! 🌟',
];
const randomTeaser = () => TEASERS[Math.floor(Math.random() * TEASERS.length)];

// حفظ جلسة المضيف محليًا لاستئنافها بعد تحديث الصفحة (تتضمّن الأسئلة مع الإجابات — على جهاز المضيف فقط).
const HOST_KEY = 'aqim_host';
const saveHost = (s) => localStorage.setItem(HOST_KEY, JSON.stringify(s));
const loadHost = () => { try { return JSON.parse(localStorage.getItem(HOST_KEY) || 'null'); } catch { return null; } };
const clearHost = () => localStorage.removeItem(HOST_KEY);

export default function Host({ onExit }) {
  const [stage, setStage] = useState(loadHost()?.pin ? 'resuming' : 'pick'); // resuming | pick | lobby | question | results | over
  const [mode, setMode] = useState('solo'); // solo | team
  const [teamCount, setTeamCount] = useState(2); // عدد الفِرَق (2–10)
  const [pin, setPin] = useState(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [playersObj, setPlayersObj] = useState({});
  const [index, setIndex] = useState(-1);
  const [q, setQ] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [reveal, setReveal] = useState(null);
  const [roundResults, setRoundResults] = useState([]);
  const [questionSeconds, setQuestionSeconds] = useState(TIME_LIMIT);
  const [introText, setIntroText] = useState('');

  const questionsRef = useRef([]); // الأسئلة مع الإجابات (في متصفّح المضيف فقط)
  const totalRef = useRef(0);
  const revealedRef = useRef(-1); // آخر فهرس تم كشفه (منع الكشف المزدوج)
  const playersCountRef = useRef(0);

  const players = Object.values(playersObj);
  playersCountRef.current = players.length;
  const teamColor = (name) => makeTeams(teamCount).find((t) => t.name === name)?.color || 'var(--teal)';

  // استئناف جلسة المضيف تلقائيًا بعد تحديث الصفحة.
  useEffect(() => {
    const hs = loadHost();
    if (!hs?.pin || !hs?.quiz) { clearHost(); setStage('pick'); return; }
    getGameState(hs.pin).then(async (gs) => {
      if (!gs) { clearHost(); setStage('pick'); return; }
      questionsRef.current = hs.quiz;
      totalRef.current = hs.quiz.length;
      setMode(hs.mode || 'solo');
      setTeamCount(hs.teamCount || 2);
      setPin(hs.pin);
      setSectionTitle(gs.meta.sectionTitle);
      const st = gs.meta.state;
      if (st === 'question' && gs.current) {
        const i = gs.current.index;
        revealedRef.current = -1;
        setIndex(i);
        setQ({ ...hs.quiz[i], index: i, total: hs.quiz.length });
        if (gs.current.startAt) {
          const remain = TIME_LIMIT - (Date.now() - gs.current.startAt) / 1000;
          setQuestionSeconds(Math.max(1, Math.round(remain)));
          setStage('question');
        } else {
          // كان في المقدمة عند التحديث؛ ابدأ الإجابة مباشرة.
          await startAnswering(hs.pin);
          setQuestionSeconds(TIME_LIMIT);
          setStage('question');
        }
      } else if (st === 'results' && gs.current) {
        const i = gs.current.index;
        revealedRef.current = i;
        const question = hs.quiz[i];
        setIndex(i);
        setQ({ ...question, index: i, total: hs.quiz.length });
        setRoundResults(await getRoundResults(hs.pin, question, i));
        setReveal({
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          source: question.source,
          isLast: i >= hs.quiz.length - 1,
        });
        setStage('results');
      } else if (st === 'over') {
        setStage('over');
      } else {
        setStage('lobby');
      }
    });
  }, []);

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

  // بدء اختبار الفصل n: تراكمي (الفصول 1..n) بتركيز على الفصل الحالي.
  const pickChapter = async (n) => {
    try {
      const upToN = CHAPTERS.slice(0, n);
      const lists = await Promise.all(upToN.map((c) => getQuestionsOnce(c.sectionId)));
      const current = lists[n - 1];
      const previous = lists.slice(0, n - 1).flat();
      const quiz = mixFocus(current, previous);
      const title = `الفصل ${n}: ${CHAPTERS[n - 1].title}`;
      const { pin, sectionTitle } = await createGame(CHAPTERS[n - 1].sectionId, quiz, {
        mode,
        teamCount,
        titleOverride: title,
      });
      questionsRef.current = quiz;
      totalRef.current = quiz.length;
      saveHost({ pin, quiz, mode, teamCount }); // لاستئناف المضيف بعد التحديث
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
    const intro = randomTeaser();
    setIntroText(intro);
    setStage('intro'); // مقدمة تشويقية ثم بدء الإجابة
    await showQuestion(pin, question, i, totalRef.current, intro);
  };

  // بعد انتهاء المقدمة: بدء وقت الإجابة وعرض السؤال.
  const beginAnswering = async () => {
    await startAnswering(pin);
    setQuestionSeconds(TIME_LIMIT);
    setStage('question');
  };

  const reveal_ = async (i) => {
    if (revealedRef.current === i) return;
    revealedRef.current = i;
    const question = questionsRef.current[i];
    const res = await revealAndScore(pin, question, i);
    setRoundResults(res.roundResults || []);
    setReveal({
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      source: question.source,
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

  // إنهاء اللعبة فورًا وعرض النتائج النهائية.
  const endNow = async () => {
    if (!confirm('إنهاء اللعبة الآن وعرض النتائج النهائية؟')) return;
    if (pin) await endGame(pin).catch(() => {});
    setStage('over');
  };

  const quit = async () => {
    if (pin) await deleteGame(pin).catch(() => {});
    clearHost();
    onExit();
  };

  // ===== استئناف بعد التحديث =====
  if (stage === 'resuming') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>جارٍ استئناف جلستك…</h2>
        <div className="spinner" />
      </div>
    );
  }

  // ===== اختيار القسم =====
  if (stage === 'pick') {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)', marginBottom: 6 }}>اختر الفصل</h2>
        <p className="subtitle">حدّد نمط التنافس ثم الفصل (المراجعة تراكمية بتركيز على الفصل الحالي)</p>

        <div className="mode-toggle">
          <button className={mode === 'solo' ? 'active' : ''} onClick={() => setMode('solo')}>👤 فردي</button>
          <button className={mode === 'team' ? 'active' : ''} onClick={() => setMode('team')}>👥 جماعي (فِرَق)</button>
        </div>

        {mode === 'team' && (
          <div className="team-count">
            <span>عدد الفِرَق:</span>
            <button onClick={() => setTeamCount((c) => Math.max(2, c - 1))}>−</button>
            <strong>{teamCount}</strong>
            <button onClick={() => setTeamCount((c) => Math.min(8, c + 1))}>+</button>
          </div>
        )}

        <div className="chapter-list">
          {CHAPTERS.map((c) => (
            <button key={c.n} className="chapter-card" onClick={() => pickChapter(c.n)}>
              <span className="chapter-n">الفصل {c.n}</span>
              <span className="chapter-title">{c.title}</span>
              <span className="chapter-hint">
                {c.n === 1 ? 'أسئلة الفصل الأول' : `الفصول 1–${c.n} (تركيز على الفصل ${c.n})`}
              </span>
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
        {mode === 'team' && <p className="qr-label">👥 نمط جماعي — يختار كل طالب فريقه عند الانضمام</p>}
        <div className="players">
          {players.length === 0 && <p className="muted">بانتظار انضمام اللاعبين…</p>}
          {players.map((p, i) => (
            <span key={i} className="player-chip" style={p.team ? { background: teamColor(p.team) } : {}}>
              {p.name}
            </span>
          ))}
        </div>
        <button className="btn" disabled={players.length === 0} onClick={() => goQuestion(0)}>
          ابدأ اللعبة ({players.length})
        </button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={quit}>إنهاء الجلسة</button>
      </div>
    );
  }

  // ===== المقدمة التشويقية =====
  if (stage === 'intro' && q) {
    return <QuestionIntro text={introText} index={q.index} total={q.total} onDone={beginAnswering} />;
  }

  // ===== عرض السؤال =====
  if (stage === 'question' && q) {
    return (
      <div className="question-screen">
        <div className="q-head">
          <span>سؤال {q.index + 1} / {q.total}</span>
          <span>أجاب {answeredCount} / {players.length}</span>
        </div>
        <Timer seconds={questionSeconds} onEnd={() => reveal_(index)} />
        <div className="q-text">{q.question}</div>
        <div className={`answers-grid ${q.type === 'truefalse' ? 'tf' : ''}`}>
          {q.options.map((opt, i) => (
            <AnswerButton key={i} index={i} text={opt} disabled />
          ))}
        </div>
        <button className="btn ghost" style={{ maxWidth: 300, margin: '16px auto 0' }} onClick={() => reveal_(index)}>
          كشف الإجابة الآن
        </button>
        <div className="host-controls">
          <button className="btn ghost" onClick={endNow}>🏁 إنهاء اللعبة</button>
          <button className="btn ghost" onClick={quit}>🚪 خروج</button>
        </div>
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
        <Explanation text={reveal.explanation} source={reveal.source} />
        {(() => {
          const fastest = roundResults.filter((r) => r.correct);
          return (
            <>
              <h3 style={{ margin: '20px 0 8px', color: 'var(--olive)' }}>⚡ أسرع الإجابات الصحيحة</h3>
              {fastest.length === 0 ? (
                <p className="muted">لا توجد إجابة صحيحة هذه المرة.</p>
              ) : (
                <ol className="speed-list">
                  {fastest.slice(0, 3).map((r, i) => (
                    <li key={i}>
                      <span className="medal">{['🥇', '🥈', '🥉'][i]}</span>
                      <span className="sname">
                        {r.name}
                        {r.streak >= 3 && <span className="fire-badge">🔥{r.streak}</span>}
                      </span>
                      <span className="stime">{(r.timeMs / 1000).toFixed(1)} ث</span>
                      <span className="sgain">+{r.gain}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          );
        })()}
        <h3 style={{ margin: '20px 0 8px', color: 'var(--olive)' }}>
          {mode === 'team' ? '🏆 ترتيب الفِرَق' : '🏆 الأوائل'}
        </h3>
        <Leaderboard rows={mode === 'team' ? teamLeaderboard(playersObj) : toLeaderboard(playersObj, 5)} />
        <button className="btn" style={{ maxWidth: 360, margin: '0 auto' }} onClick={next}>
          {reveal.isLast ? 'عرض النتيجة النهائية' : 'السؤال التالي'}
        </button>
        <div className="host-controls">
          {!reveal.isLast && <button className="btn ghost" onClick={endNow}>🏁 إنهاء اللعبة وعرض النتائج</button>}
          <button className="btn ghost" onClick={quit}>🚪 خروج</button>
        </div>
      </div>
    );
  }

  // ===== المنصة النهائية =====
  if (stage === 'over') {
    const all = mode === 'team' ? teamLeaderboard(playersObj) : toLeaderboard(playersObj, 50);
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
