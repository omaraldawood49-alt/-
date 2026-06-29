import { useState } from 'react';

// تلميح/شرح الإجابة: صندوق بارز، وعند الضغط يتكبّر في نافذة كبيرة.
export default function Explanation({ text, source }) {
  const [big, setBig] = useState(false);
  if (!text) return null;
  return (
    <>
      <button className="explain-box" onClick={() => setBig(true)}>
        <span className="explain-icon">💡</span>
        <span className="explain-text">{text}</span>
        <span className="explain-hint">اضغط للتكبير 🔍</span>
      </button>

      {big && (
        <div className="explain-overlay" onClick={() => setBig(false)}>
          <div className="explain-modal" onClick={(e) => e.stopPropagation()}>
            <div className="explain-icon-lg">💡</div>
            <p className="explain-modal-text">{text}</p>
            {source && <p className="explain-source">{source}</p>}
            <button className="btn" onClick={() => setBig(false)}>إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}
