# Email Generator Backend

Backend для генератора email с Express, Prisma и PostgreSQL.

## 🚀 Быстрый старт

### С Docker Compose (рекомендуется)

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f app

# Остановка
docker-compose down
```

### Без Docker

```bash
# Установка зависимостей
npm install

# Настройка базы данных
npm run db:generate
npm run db:push

# Запуск в dev режиме
npm run dev
```

## 📊 Доступные сервисы

- **API**: http://localhost:3000
- **pgAdmin**: http://localhost:8080 (admin@admin.com / admin)
- **PostgreSQL**: localhost:5432

## 🔧 API Endpoints

- `GET /health` - Проверка состояния
- `GET /api/emails` - Получить все email
- `POST /api/emails` - Создать email
- `GET /api/templates` - Получить все шаблоны
- `POST /api/templates` - Создать шаблон

## 🗄️ База данных

PostgreSQL 16 с автоматической инициализацией схемы через Prisma.

## 🔐 Переменные окружения

- `DATABASE_URL` - URL подключения к PostgreSQL
- `NODE_ENV` - Окружение (production/development)
- `PORT` - Порт для API (по умолчанию 3000) 