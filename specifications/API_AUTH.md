# API Авторизации

## Обзор

Система авторизации использует JWT токены для аутентификации пользователей. Все защищенные эндпоинты требуют заголовок `Authorization: Bearer <token>`.

## Эндпоинты

### 1. Регистрация
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

### 2. Авторизация
**POST** `/api/auth/login`

Авторизует существующего пользователя.

**Тело запроса:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

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

### 3. Получение информации о пользователе
**GET** `/api/auth/me`

Возвращает информацию о текущем авторизованном пользователе.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Имя пользователя",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Защищенные эндпоинты

### 4. Загрузка файлов
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

### 5. Получение списка файлов
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

### 6. Получение файла
**GET** `/api/assets/:folder/:filename`

Возвращает файл пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Параметры:**
- `folder` - ID пользователя (должен совпадать с ID в токене)
- `filename` - имя файла

## Коды ошибок

- `400` - Неверные данные запроса
- `401` - Не авторизован (нет токена или неверный токен)
- `403` - Доступ запрещен (попытка доступа к чужим файлам)
- `404` - Ресурс не найден
- `500` - Ошибка сервера

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
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"Имя пользователя"}'

# Авторизация
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Получение информации о пользователе
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Безопасность

1. **Пароли** хешируются с помощью bcrypt
2. **JWT токены** имеют срок действия 24 часа
3. **Файлы** изолированы по пользователям
4. **CORS** настроен для безопасного взаимодействия
5. **Helmet** обеспечивает базовую безопасность HTTP заголовков

## Настройка

Убедитесь, что в `.env` файле установлены:
```
DATABASE_URL="postgresql://user:password@localhost:5432/database"
JWT_SECRET="your-secret-key"
PORT=3000
```
