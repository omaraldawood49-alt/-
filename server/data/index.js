import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const load = (file) => JSON.parse(readFileSync(join(__dirname, file), 'utf-8'));

// الأقسام الأربعة للمنهج. ترتيب الأسئلة كما في الملف.
export const sections = [
  {
    id: 'tahara',
    title: 'الطهارة (الوضوء)',
    description: 'صفة الوضوء، التنبيهات، المسح على الجورب، التيمم وغسل الجنابة',
    color: '#73821B',
    questions: load('tahara.json'),
  },
  {
    id: 'salah-afaal',
    title: 'الصلاة (أفعالها)',
    description: 'أفعال وهيئات الصلاة كاملة والتنبيهات الشائعة',
    color: '#1C919E',
    questions: load('salah-afaal.json'),
  },
  {
    id: 'arkan-shurut-wajibat',
    title: 'الأركان والشروط والواجبات',
    description: 'التعريفات والفروق، الشروط والأركان والواجبات وأحكام الترك',
    color: '#009999',
    questions: load('arkan-shurut-wajibat.json'),
  },
  {
    id: 'mubtilat-sunan-adab',
    title: 'المبطلات والسنن والآداب',
    description: 'مبطلات الصلاة، السنن القولية والفعلية، وآداب الصلاة',
    color: '#C0701B',
    questions: load('mubtilat-sunan-adab.json'),
  },
];

export const getSection = (id) => sections.find((s) => s.id === id);

// قائمة مختصرة للعرض في الواجهة (بدون الأسئلة).
export const sectionSummaries = () =>
  sections.map(({ id, title, description, color, questions }) => ({
    id,
    title,
    description,
    color,
    count: questions.length,
  }));
