import { useEffect, useState } from 'react';
import {
  sectionMeta,
  watchQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  seedSection,
} from '../questions.js';

const ADMIN_CODE = (import.meta.env && import.meta.env.VITE_ADMIN_CODE) || 'admin';
const META = sectionMeta();

const blank = (type = 'mcq') => ({
  type,
  question: '',
  options: type === 'truefalse' ? ['صح', 'خطأ'] : ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  source: '',
});

export default function Admin({ onExit }) {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [sectionId, setSectionId] = useState(META[0].id);
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null); // {key?, ...question}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authed) return;
    const off = watchQuestions(sectionId, setList);
    return off;
  }, [authed, sectionId]);

  // ===== بوابة بسيطة =====
  if (!authed) {
    return (
      <div className="card">
        <h2 style={{ color: 'var(--olive)' }}>إدارة الأسئلة</h2>
        <p className="subtitle">أدخل رمز المشرف للمتابعة</p>
        <input
          className="field"
          type="password"
          placeholder="رمز المشرف"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setAuthed(code === ADMIN_CODE)}
        />
        {code && code !== ADMIN_CODE && <p className="error">رمز غير صحيح</p>}
        <button className="btn" onClick={() => setAuthed(code === ADMIN_CODE)}>دخول</button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={onExit}>رجوع</button>
      </div>
    );
  }

  const save = async () => {
    const q = editing;
    if (!q.question.trim()) return alert('اكتب نص السؤال');
    const opts = q.type === 'truefalse' ? ['صح', 'خطأ'] : q.options.map((o) => o.trim());
    const filled = opts.filter(Boolean);
    if (filled.length < 2) return alert('أدخل خيارين على الأقل');
    if (!opts[q.correctIndex]) return alert('حدّد الإجابة الصحيحة على خيار غير فارغ');
    // إزالة الخيارات الفارغة وتعديل فهرس الصحيح وفقها.
    const compact = [];
    let newCorrect = 0;
    opts.forEach((o, i) => {
      if (o) {
        if (i === q.correctIndex) newCorrect = compact.length;
        compact.push(o);
      }
    });
    const payload = { ...q, options: compact, correctIndex: newCorrect };
    setBusy(true);
    try {
      if (q.key) await updateQuestion(sectionId, q.key, payload);
      else await addQuestion(sectionId, payload);
      setEditing(null);
    } catch (e) {
      alert('تعذّر الحفظ: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (key) => {
    if (!confirm('حذف هذا السؤال؟')) return;
    await deleteQuestion(sectionId, key);
  };

  const seed = async () => {
    if (!confirm('استيراد أسئلة المنهج الافتراضية إلى هذا القسم؟')) return;
    setBusy(true);
    try { await seedSection(sectionId); } finally { setBusy(false); }
  };

  // ===== نموذج التحرير =====
  if (editing) {
    const isTF = editing.type === 'truefalse';
    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <h2 style={{ color: 'var(--olive)' }}>{editing.key ? 'تعديل سؤال' : 'سؤال جديد'}</h2>

        <label className="admin-label">نوع السؤال</label>
        <div className="row" style={{ marginBottom: 12 }}>
          <button className={`btn ${isTF ? 'ghost' : ''}`} onClick={() => setEditing({ ...editing, type: 'mcq', options: ['', '', '', ''], correctIndex: 0 })}>
            اختيار من متعدد
          </button>
          <button className={`btn ${isTF ? '' : 'ghost'}`} onClick={() => setEditing({ ...editing, type: 'truefalse', options: ['صح', 'خطأ'], correctIndex: 0 })}>
            صح / خطأ
          </button>
        </div>

        <label className="admin-label">نص السؤال</label>
        <textarea className="field" rows={2} value={editing.question}
          onChange={(e) => setEditing({ ...editing, question: e.target.value })} />

        <label className="admin-label">الخيارات (اختر الصحيح)</label>
        {(isTF ? ['صح', 'خطأ'] : editing.options).map((opt, i) => (
          <div key={i} className="admin-opt">
            <input type="radio" name="correct" checked={editing.correctIndex === i}
              onChange={() => setEditing({ ...editing, correctIndex: i })} />
            {isTF ? (
              <span className={`admin-tf a${i}`}>{opt}</span>
            ) : (
              <input className="field" style={{ margin: 0 }} placeholder={`خيار ${i + 1}`} value={opt}
                onChange={(e) => {
                  const options = [...editing.options];
                  options[i] = e.target.value;
                  setEditing({ ...editing, options });
                }} />
            )}
          </div>
        ))}

        <label className="admin-label">الشرح (يظهر بعد الكشف)</label>
        <textarea className="field" rows={2} value={editing.explanation}
          onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} />

        <label className="admin-label">المصدر</label>
        <input className="field" value={editing.source}
          onChange={(e) => setEditing({ ...editing, source: e.target.value })} />

        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" disabled={busy} onClick={save}>{busy ? '...' : 'حفظ'}</button>
          <button className="btn ghost" onClick={() => setEditing(null)}>إلغاء</button>
        </div>
      </div>
    );
  }

  // ===== قائمة الأسئلة =====
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 style={{ color: 'var(--olive)' }}>إدارة الأسئلة</h2>

      <div className="admin-tabs">
        {META.map((s) => (
          <button key={s.id} className={`admin-tab ${s.id === sectionId ? 'active' : ''}`}
            style={s.id === sectionId ? { background: s.color } : {}}
            onClick={() => setSectionId(s.id)}>
            {s.title}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div style={{ margin: '18px 0' }}>
          <p className="muted">هذا القسم يستخدم أسئلة المنهج الافتراضية. استورِدها إلى Firebase لتعديلها وإضافة غيرها.</p>
          <button className="btn" disabled={busy} onClick={seed}>{busy ? '...' : '⬇️ استيراد أسئلة المنهج'}</button>
        </div>
      ) : (
        <ul className="admin-list">
          {list.map((q, i) => (
            <li key={q.key}>
              <div className="admin-q">
                <span className="admin-badge">{q.type === 'truefalse' ? 'صح/خطأ' : 'متعدد'}</span>
                <span className="admin-num">{i + 1}.</span>
                <span>{q.question}</span>
              </div>
              <div className="admin-correct">✅ {q.options[q.correctIndex]}</div>
              <div className="admin-actions">
                <button className="mini" onClick={() => setEditing({ ...q })}>تعديل</button>
                <button className="mini danger" onClick={() => remove(q.key)}>حذف</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button className="btn" style={{ marginTop: 14 }} onClick={() => setEditing(blank('mcq'))}>
        ➕ إضافة سؤال
      </button>
      <button className="btn ghost" style={{ marginTop: 10 }} onClick={onExit}>رجوع للرئيسية</button>
    </div>
  );
}
