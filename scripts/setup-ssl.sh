#!/bin/bash

# Скрипт для настройки SSL сертификатов

echo "🔐 Настройка SSL сертификатов для HTTPS"

# Проверяем, запущен ли Docker
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker не запущен. Запустите Docker и попробуйте снова."
    exit 1
fi

# Создаем папку для SSL сертификатов
mkdir -p ./ssl

# Проверяем, есть ли домен
if [ -z "$1" ]; then
    echo "⚠️  Домен не указан. Создаю самоподписанный сертификат для IP адреса."
    
    # Создаем самоподписанный сертификат
    openssl genrsa -out ./ssl/private.key 2048
    openssl req -new -x509 -key ./ssl/private.key -out ./ssl/certificate.crt -days 365 \
        -subj "/C=RU/ST=State/L=City/O=Organization/CN=62.182.192.42"
    
    echo "✅ Самоподписанный сертификат создан"
    echo "⚠️  Браузер будет показывать предупреждение о безопасности"
    
else
    DOMAIN=$1
    echo "🌐 Настраиваю SSL для домена: $DOMAIN"
    
    # Останавливаем контейнеры
    docker-compose down
    
    # Запускаем временный nginx для получения сертификата
    docker run --rm -d --name temp-nginx \
        -p 80:80 \
        -v $(pwd)/nginx/nginx-temp.conf:/etc/nginx/nginx.conf \
        nginx:alpine
    
    # Получаем сертификат через certbot
    docker run --rm \
        -v $(pwd)/ssl:/etc/letsencrypt \
        -v $(pwd)/ssl:/var/lib/letsencrypt \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/lib/letsencrypt \
        --email admin@$DOMAIN \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    # Останавливаем временный nginx
    docker stop temp-nginx
    
    # Копируем сертификаты
    if [ -f "./ssl/live/$DOMAIN/fullchain.pem" ]; then
        cp ./ssl/live/$DOMAIN/fullchain.pem ./ssl/certificate.crt
        cp ./ssl/live/$DOMAIN/privkey.pem ./ssl/private.key
        echo "✅ Let's Encrypt сертификат получен и скопирован"
    else
        echo "❌ Не удалось получить сертификат. Создаю самоподписанный."
        openssl genrsa -out ./ssl/private.key 2048
        openssl req -new -x509 -key ./ssl/private.key -out ./ssl/certificate.crt -days 365 \
            -subj "/C=RU/ST=State/L=City/O=Organization/CN=$DOMAIN"
    fi
fi

# Устанавливаем правильные права
chmod 600 ./ssl/private.key
chmod 644 ./ssl/certificate.crt

echo "🚀 Запускаю контейнеры с HTTPS..."
docker-compose up -d

echo "✅ Готово! Сервер доступен по адресу:"
echo "   HTTP:  http://62.182.192.42 (редирект на HTTPS)"
echo "   HTTPS: https://62.182.192.42"
