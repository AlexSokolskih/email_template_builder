FROM node:22-alpine

WORKDIR /app

# Установка зависимостей для Prisma
RUN apk add --no-cache openssl

# Копирование package файлов
COPY package*.json ./
COPY prisma ./prisma/

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S appuser
RUN adduser -S appuser -u 1001

# Установка зависимостей
RUN npm ci --only=production

# Генерация Prisma клиента
RUN npx prisma generate

# Копирование исходного кода (кроме src, которая будет в volume)
COPY package*.json ./
COPY prisma ./prisma/
COPY frontend ./frontend/

# Создание папки uploads с правильными правами
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads

# Установка правильных прав на node_modules
RUN chown -R appuser:appuser /app/node_modules

USER appuser

EXPOSE 3000

CMD ["npm", "start"] 