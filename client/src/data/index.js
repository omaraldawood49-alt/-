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
    title: 'الصلاة (أفعالها)',
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

export const sectionSummaries = () =>
  sections.map(({ id, title, description, color, questions }) => ({
    id,
    title,
    description,
    color,
    count: questions.length,
  }));
