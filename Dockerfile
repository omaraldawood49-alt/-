# صورة موحّدة تعمل على أي منصة حاويات (Railway / Fly.io / Cloud Run …)
FROM node:22-alpine

WORKDIR /app

# تثبيت التبعيات أولًا للاستفادة من طبقات الكاش
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm run install:all

# نسخ بقية المصدر وبناء الواجهة
COPY . .
RUN npm run build

ENV PORT=3001
EXPOSE 3001

# الخادم يقدّم الواجهة المبنية (client/dist) على المنفذ نفسه
CMD ["npm", "start"]
