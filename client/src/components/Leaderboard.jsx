export default function Leaderboard({ rows = [] }) {
  if (!rows.length) return <p className="muted">لا توجد نتائج بعد.</p>;
  const max = Math.max(1, ...rows.map((r) => r.score || 0));
  return (
    <ol className="leaderboard">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="rank">{i + 1}</span>
          <div className="lb-main">
            <div className="lb-row">
              <span className="lb-name">
                {r.name}
                {r.streak >= 3 && <span className="fire-badge">🔥{r.streak}</span>}
                {typeof r.members === 'number' && <span className="lb-members"> ({r.members})</span>}
              </span>
              <span className="score">{r.score}</span>
            </div>
            <div className="lb-bar">
              <div className="lb-fill" style={{ width: `${Math.round(((r.score || 0) / max) * 100)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
