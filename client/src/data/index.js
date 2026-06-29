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

// الفصول = الأقسام الأربعة بترتيبها المتّفق عليه.
export const chapterList = () =>
  sections.map((s, i) => ({ n: i + 1, sectionId: s.id, title: s.title }));

// خلط بسيط (Fisher–Yates)
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// خلط مواضع الخيارات لكل سؤال (مع إبقاء «صح/خطأ» بترتيبها)، حتى لا تكون
// الإجابة الصحيحة دائمًا في نفس الموضع/اللون.
export const shuffleOptions = (q) => {
  if (q.type === 'truefalse' || !Array.isArray(q.options) || q.options.length < 2) return q;
  const order = shuffle(q.options.map((_, i) => i));
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correctIndex),
  };
};

// مزج بتركيز على الفصل الحالي: كل أسئلة الحالي + عيّنة من الفصول السابقة، مع خلط الخيارات.
export function mixFocus(current, previous) {
  const sampleCount = Math.min(previous.length, Math.max(3, Math.round(current.length * 0.5)));
  return shuffle([...current, ...shuffle(previous).slice(0, sampleCount)]).map(shuffleOptions);
}

export const sectionSummaries = () =>
  sections.map(({ id, title, description, color, questions }) => ({
    id,
    title,
    description,
    color,
    count: questions.length,
  }));
