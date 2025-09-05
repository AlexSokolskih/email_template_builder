# SSL Сертификаты для HTTPS

## Получение SSL сертификатов

### Вариант 1: Let's Encrypt (рекомендуется)
```bash
# Установка certbot
sudo apt update
sudo apt install certbot

# Получение сертификата для домена
sudo certbot certonly --standalone -d your-domain.com

# Копирование сертификатов в папку ssl
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/private.key
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/certificate.crt
sudo chown $USER:$USER ./ssl/*.key ./ssl/*.crt
```

### Вариант 2: Самоподписанный сертификат (для тестирования)
```bash
# Генерация приватного ключа
openssl genrsa -out ./ssl/private.key 2048

# Генерация сертификата
openssl req -new -x509 -key ./ssl/private.key -out ./ssl/certificate.crt -days 365 -subj "/C=RU/ST=State/L=City/O=Organization/CN=62.182.192.42"
```

## Переменные окружения

Добавьте в `.env` файл:
```
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
```

## Проверка

После настройки сертификатов сервер автоматически запустится в HTTPS режиме.
Проверьте доступность: https://62.182.192.42:3001
