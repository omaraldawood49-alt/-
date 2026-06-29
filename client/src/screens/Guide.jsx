export default function Guide({ onExit }) {
  return (
    <div className="card" style={{ maxWidth: 640, textAlign: 'right' }}>
      <h2 style={{ color: 'var(--olive)', textAlign: 'center' }}>📖 دليل المعلّم</h2>
      <p className="subtitle" style={{ textAlign: 'center' }}>كيف تُدرّس بهذه المنصة بأسلوب التلعيب</p>

      <h3 className="guide-h">١) التحضير</h3>
      <ul className="guide-list">
        <li>افتح المنصة على شاشة العرض (بروجكتر/تلفاز) أمام الطلاب.</li>
        <li>اضغط <b>«استضافة جلسة»</b> ثم اختر القسم المناسب للدرس.</li>
        <li>تأكّد أن أجهزة الطلاب متصلة بالإنترنت.</li>
      </ul>

      <h3 className="guide-h">٢) انضمام الطلاب</h3>
      <ul className="guide-list">
        <li>يظهر <b>رمز PIN</b> و<b>باركود</b> على الشاشة.</li>
        <li>يمسح الطالب الباركود بالكاميرا، أو يفتح الرابط ويُدخل الرمز واسمه.</li>
        <li>تظهر أسماء المنضمّين أمامك؛ ابدأ حين يكتمل الصف.</li>
      </ul>

      <h3 className="guide-h">٣) أثناء اللعب</h3>
      <ul className="guide-list">
        <li>يظهر السؤال على شاشتك مع <b>مؤقّت</b>؛ يجيب كل طالب من جهازه.</li>
        <li>الإجابة الصحيحة <b>الأسرع</b> تأخذ <b>نقاطًا أعلى</b> — فالسرعة مع الصواب مطلوبة.</li>
        <li>بعد كل سؤال تظهر <b>الإجابة الصحيحة + شرحها</b>، و<b>أسرع المجيبين</b>، و<b>ترتيب الأوائل</b>.</li>
      </ul>

      <h3 className="guide-h">٤) نصائح تربوية</h3>
      <ul className="guide-list">
        <li>توقّف بعد كل سؤال و<b>اقرأ الشرح</b> الظاهر، ووسّعه بمثال أو دليل.</li>
        <li>راجِع الأسئلة التي كثُر فيها الخطأ؛ هي مواطن تحتاج تثبيتًا.</li>
        <li>قسّم الصف <b>مجموعات</b> وتنافسوا، أو كرّر الجلسة لرفع الدرجات.</li>
        <li>اربط كل سؤال بالتطبيق العملي (كصفة الوضوء والصلاة).</li>
      </ul>

      <h3 className="guide-h">٥) إدارة الأسئلة</h3>
      <ul className="guide-list">
        <li>من الرئيسية: <b>«⚙️ إدارة الأسئلة»</b> لإضافة/تعديل/حذف الأسئلة لكل قسم.</li>
        <li>تظهر تعديلاتك فورًا في الجلسات الجديدة دون أي إعداد.</li>
      </ul>

      <button className="btn" style={{ marginTop: 16 }} onClick={onExit}>رجوع للرئيسية</button>
    </div>
  );
}
