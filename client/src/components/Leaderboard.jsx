export default function Leaderboard({ rows = [] }) {
  if (!rows.length) return <p className="muted">لا توجد نتائج بعد.</p>;
  return (
    <ol className="leaderboard">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="rank">{i + 1}</span>
          <span>{r.name}</span>
          <span className="score">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}
