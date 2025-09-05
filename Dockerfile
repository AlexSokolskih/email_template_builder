FROM node:22-alpine

WORKDIR /app

# Установка зависимостей для Prisma и SSL
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

# Скрипт для запуска с SSL
COPY scripts/start-with-ssl.sh /app/start-with-ssl.sh

# Создание папок с правильными правами
RUN mkdir -p /app/uploads /app/ssl && chown -R appuser:appuser /app/uploads /app/ssl

# Установка правильных прав на node_modules и скрипт
RUN chown -R appuser:appuser /app/node_modules && chmod +x /app/start-with-ssl.sh && chown appuser:appuser /app/start-with-ssl.sh

USER appuser

EXPOSE 3000 3001

CMD ["/app/start-with-ssl.sh"] 