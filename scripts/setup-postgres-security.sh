#!/bin/bash

# Скрипт для настройки безопасности PostgreSQL

set -e

echo "🔒 Настройка безопасности PostgreSQL..."

# Создаем директории для секретов и SSL
mkdir -p secrets ssl

# Генерируем сильные пароли
echo "🔑 Генерация сильных паролей..."
openssl rand -base64 32 > secrets/postgres_password.txt
openssl rand -base64 32 > secrets/pgadmin_password.txt
echo "admin@emailgenerator.local" > secrets/pgadmin_email.txt

# Генерируем SSL сертификаты для PostgreSQL
echo "🔐 Генерация SSL сертификатов..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/postgres.key -out ssl/postgres.crt -days 365 -nodes \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=EmailGenerator/OU=IT/CN=postgres"

# Устанавливаем правильные права доступа
chmod 600 ssl/postgres.key secrets/*.txt
chmod 644 ssl/postgres.crt

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создание .env файла..."
    cp .env.example .env
    echo "⚠️  ВАЖНО: Отредактируйте .env файл с вашими настройками!"
fi

echo "✅ Настройка безопасности PostgreSQL завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Отредактируйте .env файл с вашими настройками"
echo "2. Запустите: docker-compose up -d"
echo "3. Проверьте логи: docker-compose logs postgres"
echo ""
echo "🔒 Безопасность:"
echo "- PostgreSQL доступен только локально (127.0.0.1:5432)"
echo "- pgAdmin доступен только локально (127.0.0.1:8080)"
echo "- SSL включен для всех соединений"
echo "- Пароли хранятся в Docker secrets"
