import { useEffect, useState } from 'react';

// مؤقّت تنازلي بسيط مبني على وقت بدء السؤال.
export default function Timer({ seconds, onEnd }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
    const start = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - start) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        onEnd?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [seconds]);

  return <div className={`timer ${left <= 5 ? 'low' : ''}`}>{left}</div>;
}
