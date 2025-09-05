# Настройка HTTPS в Docker контейнере

## Что настроено

1. **SSL сертификаты внутри контейнера** - генерируются автоматически при запуске
2. **Двойной режим работы** - HTTP (порт 3000) и HTTPS (порт 3001)
3. **Самоподписанные сертификаты** - для тестирования

## Запуск

```bash
# Пересборка и запуск контейнеров
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Просмотр логов
docker-compose logs -f app
```

## Доступ к серверу

- **HTTP**: http://62.182.192.42:3000
- **HTTPS**: https://62.182.192.42:3001

## Настройка для продакшена

Для получения настоящих SSL сертификатов:

1. **Получите домен** и настройте DNS на IP 62.182.192.42
2. **Используйте Let's Encrypt**:

```bash
# Остановите контейнеры
docker-compose down

# Получите сертификат
sudo certbot certonly --standalone -d your-domain.com

# Скопируйте сертификаты
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/private.key
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/certificate.crt
sudo chown $USER:$USER ./ssl/*.key ./ssl/*.crt

# Запустите контейнеры
docker-compose up -d
```

## Проверка работы

```bash
# Проверка HTTP
curl http://62.182.192.42:3000/health

# Проверка HTTPS (с игнорированием самоподписанного сертификата)
curl -k https://62.182.192.42:3001/health
```

## Устранение проблем

1. **Браузер показывает предупреждение** - это нормально для самоподписанных сертификатов
2. **Сертификат не создается** - проверьте права на папку ssl
3. **Порт недоступен** - проверьте, что порт 3001 открыт в файрволе
