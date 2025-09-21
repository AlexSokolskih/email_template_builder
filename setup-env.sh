#!/bin/bash

# Скрипт для настройки переменных окружения

echo "Настройка переменных окружения для Email Generator Backend"
echo "=================================================="

# Проверяем, существует ли .env файл
if [ ! -f .env ]; then
    echo "Создаем файл .env..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/email_generator?schema=public"

# JWT Secret
JWT_SECRET="your-secret-key-change-in-production"

# Gemini API Key (ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ КЛЮЧ)
GEMINI_API_KEY="your-gemini-api-key-here"

# Server Ports
PORT=3000
HTTPS_PORT=3001
EOF
    echo "Файл .env создан!"
else
    echo "Файл .env уже существует"
fi

echo ""
echo "ВАЖНО: Замените 'your-gemini-api-key-here' на ваш реальный API ключ Gemini!"
echo "Получить ключ можно здесь: https://aistudio.google.com/app/apikey"
echo ""
echo "Для применения изменений перезапустите сервер:"
echo "npm run dev"
