#!/bin/sh

echo "🔐 Настройка SSL сертификатов в контейнере..."

# Проверяем, есть ли уже сертификаты
if [ ! -f "/app/ssl/private.key" ] || [ ! -f "/app/ssl/certificate.crt" ]; then
    echo "📝 Генерирую самоподписанный SSL сертификат..."
    
    # Генерируем приватный ключ
    openssl genrsa -out /app/ssl/private.key 2048
    
    # Генерируем сертификат
    openssl req -new -x509 -key /app/ssl/private.key -out /app/ssl/certificate.crt -days 365 \
        -subj "/C=RU/ST=State/L=City/O=EmailGenerator/CN=62.182.192.42" \
        -addext "subjectAltName=IP:62.182.192.42,DNS:localhost"
    
    # Устанавливаем правильные права
    chmod 600 /app/ssl/private.key
    chmod 644 /app/ssl/certificate.crt
    
    echo "✅ SSL сертификат создан"
else
    echo "✅ SSL сертификаты уже существуют"
fi

# Устанавливаем переменные окружения для SSL
export SSL_KEY_PATH=/app/ssl/private.key
export SSL_CERT_PATH=/app/ssl/certificate.crt

echo "🚀 Запускаю сервер с HTTPS поддержкой..."
echo "🌐 Сервер будет доступен по адресу: https://62.182.192.42:3001"

# Запускаем приложение
exec npm start
