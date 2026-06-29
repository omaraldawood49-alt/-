export default function Home({ onHost, onJoin }) {
  return (
    <div className="card">
      <h1 className="brand">
        أقِم صلاتَك
        <small>تعلَّم بالتلعيب — بشروطها وأركانها وواجباتها</small>
      </h1>
      <p className="subtitle">منصة أسئلة تفاعلية بأسلوب كاهوت للمعلّم وطلابه</p>

      <button className="btn" onClick={onHost} style={{ marginBottom: 12 }}>
        🖥️ استضافة جلسة (المعلّم)
      </button>
      <button className="btn teal" onClick={onJoin}>
        🙋 الانضمام بِرمز (الطالب)
      </button>

      <p className="muted" style={{ marginTop: 22 }}>
        المعلّم ينشئ جلسة ويعرض رمز PIN، والطلاب ينضمّون من أجهزتهم ويتنافسون.
      </p>
    </div>
  );
}
