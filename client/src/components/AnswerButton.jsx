const SHAPES = ['▲', '◆', '●', '■'];

// زر إجابة ملوّن بأسلوب كاهوت. يدعم حالات الكشف (صحيح/خطأ/معتم).
export default function AnswerButton({ index, text, onClick, disabled, state }) {
  const cls = ['answer', `a${index}`];
  if (state === 'correct') cls.push('correct');
  if (state === 'wrong') cls.push('wrong');
  if (state === 'dim') cls.push('dim');
  return (
    <button className={cls.join(' ')} onClick={onClick} disabled={disabled}>
      <span className="shape">{SHAPES[index]}</span>
      <span>{text}</span>
    </button>
  );
}
