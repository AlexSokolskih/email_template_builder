FROM node:22-alpine

WORKDIR /app

# Установка зависимостей для Prisma
RUN apk add --no-cache openssl

# Копирование package файлов
COPY package*.json ./
COPY prisma ./prisma/

# Установка зависимостей
RUN npm ci --only=production

# Генерация Prisma клиента
RUN npx prisma generate

# Копирование исходного кода (кроме src, которая будет в volume)
COPY package*.json ./
COPY prisma ./prisma/
COPY frontend ./frontend/

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Создание папки uploads с правильными правами
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 3000

CMD ["npm", "start"] 