import { useEffect, useState } from 'react';

// إعلان النتائج بأنميشن تصاعدي: يظهر الأخير أولًا من الأسفل، ثم الأعلى منه، حتى
// يصعد الأول من تحت عبر السحاب ثم يظهر اسم الفائز.
export default function PodiumReveal({ title, rows }) {
  const N = rows.length;
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= N) return;
    const last = revealed === N - 1; // التالي هو المركز الأول (الفائز)
    const delay = revealed === 0 ? 500 : last ? 1700 : 850;
    const id = setTimeout(() => setRevealed((v) => v + 1), delay);
    return () => clearTimeout(id);
  }, [revealed, N]);

  const done = revealed >= N;
  const shown = (i) => i >= N - revealed; // الأعلى (المركز الأول) يظهر أخيرًا
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="reveal-block">
      <h2 style={{ color: 'var(--olive)' }}>{title}</h2>
      <div className={`clouds ${done ? 'show' : ''}`}>☁️ ☁️ ☁️ ☁️ ☁️</div>
      <ol className="reveal-list">
        {rows.map((r, i) => (
          <li key={i} className={`reveal-item ${shown(i) ? 'in' : ''} ${i === 0 ? 'winner' : ''}`}>
            <span className="r-medal">{medals[i] || i + 1}</span>
            <span className="r-name">{r.name}</span>
            <span className="r-score">
              {r.score}
              {typeof r.members === 'number' ? ` (${r.members})` : ''}
            </span>
          </li>
        ))}
      </ol>
      {done && rows[0] && <div className="winner-name">🏆 الفائز: {rows[0].name}! 🎉</div>}
    </div>
  );
}
