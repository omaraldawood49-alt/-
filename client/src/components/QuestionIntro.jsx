import { useEffect, useState } from 'react';

// مقدمة تشويقية قبل السؤال: عبارة حماسية + عدّ تنازلي 3-2-1.
export default function QuestionIntro({ text, index, total, onDone }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 0) {
      const id = setTimeout(() => onDone?.(), 600);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setN((v) => v - 1), 850);
    return () => clearTimeout(id);
  }, [n]);

  return (
    <div className="card intro-card">
      <p className="muted">السؤال {index + 1} / {total}</p>
      <h2 className="intro-teaser">{text}</h2>
      <div className="intro-count" key={n}>{n > 0 ? n : 'هيّا! 🚀'}</div>
    </div>
  );
}
