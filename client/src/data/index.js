import tahara from './tahara.json';
import salah from './salah-afaal.json';
import arkan from './arkan-shurut-wajibat.json';
import mubtilat from './mubtilat-sunan-adab.json';

// الأقسام الأربعة للمنهج. الأسئلة (مع الإجابات الصحيحة) تبقى في متصفّح المضيف
// الذي يقوم بالتصحيح؛ ولا تُكتب الإجابة الصحيحة في قاعدة البيانات إلا بعد الكشف.
export const sections = [
  {
    id: 'tahara',
    title: 'الطهارة (الوضوء)',
    description: 'صفة الوضوء، التنبيهات، المسح على الجورب، التيمم وغسل الجنابة',
    color: '#73821B',
    questions: tahara,
  },
  {
    id: 'salah-afaal',
    title: 'صفة الصلاة',
    description: 'أفعال وهيئات الصلاة كاملة والتنبيهات الشائعة',
    color: '#1C919E',
    questions: salah,
    chapters: [
      { n: 1, title: 'الافتتاح والقيام' },
      { n: 2, title: 'الركوع والرفع منه' },
      { n: 3, title: 'السجود وما بين السجدتين' },
      { n: 4, title: 'التشهد والتسليم والتنبيهات' },
    ],
  },
  {
    id: 'arkan-shurut-wajibat',
    title: 'الأركان والشروط والواجبات',
    description: 'التعريفات والفروق، الشروط والأركان والواجبات وأحكام الترك',
    color: '#009999',
    questions: arkan,
  },
  {
    id: 'mubtilat-sunan-adab',
    title: 'المبطلات والسنن والآداب',
    description: 'مبطلات الصلاة، السنن القولية والفعلية، وآداب الصلاة',
    color: '#C0701B',
    questions: mubtilat,
  },
];

export const getSection = (id) => sections.find((s) => s.id === id);

export const getChapters = (id) => getSection(id)?.chapters || null;

// خلط بسيط (Fisher–Yates)
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// اختبار الفصل: كل أسئلة الفصل الحالي + عيّنة من الفصول السابقة (تركيز على الحالي).
export function buildChapterQuiz(sectionId, currentChapter) {
  const all = getSection(sectionId)?.questions || [];
  const current = all.filter((q) => (q.chapter || 1) === currentChapter);
  const previous = all.filter((q) => (q.chapter || 1) < currentChapter);
  const sampleCount = Math.min(previous.length, Math.max(2, Math.round(current.length * 0.5)));
  const sampledPrev = shuffle(previous).slice(0, sampleCount);
  return shuffle([...current, ...sampledPrev]);
}

export const sectionSummaries = () =>
  sections.map(({ id, title, description, color, questions }) => ({
    id,
    title,
    description,
    color,
    count: questions.length,
  }));
