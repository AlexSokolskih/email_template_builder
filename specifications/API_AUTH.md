# API Авторизации

## Обзор

Система авторизации использует JWT токены для аутентификации пользователей. Все защищенные эндпоинты требуют заголовок `Authorization: Bearer <token>`.

## Эндпоинты

### 1. Health Check
**GET** `/health`

Проверка состояния сервера.

**Ответ:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Регистрация
**POST** `/api/auth/register`

Создает нового пользователя в системе.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Имя пользователя" // опционально
}
```

**Валидация:**
- Email и пароль обязательны
- Пароль должен содержать минимум 6 символов
- Email должен быть уникальным
- Имя пользователя опционально

**Ответ:**
```json
{
  "message": "Пользователь успешно зарегистрирован",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Имя пользователя",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### 3. Авторизация
**POST** `/api/auth/login`

Авторизует существующего пользователя.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Валидация:**
- Email и пароль обязательны

**Ответ:**
```json
{
  "message": "Успешная авторизация",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Имя пользователя",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### 4. Получение информации о пользователе
**GET** `/api/auth/me`

Возвращает информацию о текущем авторизованном пользователе.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
# Загрузка файла
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/file.txt"

# Получение списка файлов
curl -X GET http://localhost:3000/api/files \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Получение файла
curl -X GET http://localhost:3000/api/assets/user_id/filename.txt \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Имя пользователя",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Защищенные эндпоинты

### 5. Загрузка файлов
**POST** `/api/upload`

Загружает файл в папку пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Тело запроса:**
```
file: <файл>
```

**Ограничения:**
- Максимальный размер файла: 10MB
- Поддерживаемые типы файлов: любые

**Ответ:**
```json
{
  "success": true,
  "folder": "user_id",
  "uploadedFile": {
    "filename": "example.txt",
    "path": "/path/to/file"
  },
  "files": [
    {
      "name": "example.txt",
      "size": 1024,
      "created": "2024-01-01T00:00:00.000Z",
      "modified": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 6. Получение списка файлов
**GET** `/api/files`

Возвращает список файлов пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "files": [
    {
      "name": "example.txt",
      "size": 1024,
      "created": "2024-01-01T00:00:00.000Z",
      "modified": "2024-01-01T00:00:00.000Z",
      "url": "/api/assets/user_id/example.txt"
    }
  ]
}
```

### 7. Получение файла
**GET** `/api/assets/:folder/:filename`

Возвращает файл пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Параметры:**
- `folder` - ID пользователя (должен совпадать с ID в токене)
- `filename` - имя файла

**Поддерживаемые типы файлов:**
- Изображения: PNG, JPG, JPEG, GIF, WebP, SVG
- Документы: PDF, TXT, HTML, CSS, JS, JSON, XML
- Медиа: MP4, MP3, WAV
- Остальные типы: application/octet-stream

**Заголовки ответа:**
- `Content-Type` - MIME-тип файла
- `Cache-Control: public, max-age=3600` - кеширование на 1 час
- `Cross-Origin-Resource-Policy: cross-origin` - разрешение cross-origin доступа
- `X-Frame-Options: ALLOWALL` - разрешение встраивания в iframe

## Коды ошибок

- `400` - Неверные данные запроса
- `401` - Не авторизован (нет токена или неверный токен)
- `403` - Доступ запрещен (попытка доступа к чужим файлам)
- `404` - Ресурс не найден
- `500` - Ошибка сервера

**Детали ошибок:**
- `400` - Email и пароль обязательны, пароль менее 6 символов, пользователь уже существует
- `401` - Токен не предоставлен, неверный формат токена, недействительный токен, неверный email или пароль
- `403` - Недействительный токен, доступ к чужим файлам запрещен
- `404` - Пользователь не найден, файл не найден
- `500` - Ошибка базы данных, ошибка сервера

## Примеры использования

### JavaScript (fetch)
```javascript
// Регистрация
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'Имя пользователя'
  })
});

const { token } = await registerResponse.json();

// Использование токена для защищенных запросов
const meResponse = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### cURL
```bash
# Регистрация
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"Имя пользователя"}'

# Авторизация
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Получение информации о пользователе
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"


## Безопасность

1. **Пароли** хешируются с помощью bcrypt (10 раундов)
2. **JWT токены** имеют срок действия 24 часа
3. **Файлы** изолированы по пользователям (проверка userId в токене)
4. **CORS** настроен для безопасного взаимодействия
5. **Helmet** обеспечивает базовую безопасность HTTP заголовков
6. **Валидация токенов** - проверка формата Bearer и валидности JWT
7. **Изоляция файлов** - пользователи могут получать доступ только к своим файлам
8. **Лимиты загрузки** - максимальный размер файла 10MB
9. **SSL поддержка** - автоматический запуск HTTPS при наличии сертификатов

## Настройка

Убедитесь, что в `.env` файле установлены:
```
DATABASE_URL="postgresql://user:password@localhost:5432/database"
JWT_SECRET="your-secret-key"
PORT=3000
HTTPS_PORT=3001
```

**Порты:**
- HTTP сервер: 3000
- HTTPS сервер: 3001 (если SSL сертификаты настроены)

**CORS настройки:**
- Разрешенные домены: localhost:3000, localhost:3001, localhost:3005, 62.182.192.42:3001
- Поддержка HTTPS и HTTP
- Credentials: true для основных эндпоинтов
- Специальная настройка для `/api/assets` - разрешен доступ с любых доменов

**SSL сертификаты:**
- Путь к приватному ключу: `./ssl/private.key`
- Путь к сертификату: `./ssl/certificate.crt`
- Автоматический запуск HTTPS при наличии сертификатов
