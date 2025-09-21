# API Спецификация - Отправка сообщений с файлом

## Базовый URL
```
http://localhost:3000
https://localhost:3001
```

## Эндпоинты

### 1. Отправка сообщения с файлом

**POST** `/api/sendMessageWithFile`

Принимает JSON с сообщением и HTML-контентом email

#### Заголовки запроса
- Content-Type: `application/json`
- Authorization: `Bearer <JWT_TOKEN>` (обязательно)

#### Тело запроса
- Формат: JSON объект

```json
{
  "message": "Текст сообщения",
  "emailHTML": "<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>"
}
```

#### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `message` | string | Да | Текст сообщения |
| `emailHTML` | string | Да | HTML-контент email |

#### Валидация

**message:**
- Должен быть строкой
- Не может быть пустым

**emailHTML:**
- Должен быть строкой
- Не может быть пустым

#### Успешный ответ (200)
```json
{
  "success": true,
  "message": "Текст сообщения",
  "emailHTML": "<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>"
}
```

#### Ошибки

**401 Unauthorized - Отсутствует токен авторизации**
```json
{
  "error": "Токен доступа не предоставлен"
}
```

**403 Forbidden - Недействительный токен**
```json
{
  "error": "Недействительный токен"
}
```

**400 Bad Request - Неверные параметры**
```json
{
  "error": "message обязателен и должен быть строкой"
}
```

```json
{
  "error": "emailHTML обязателен и должен быть строкой"
}
```

**500 Internal Server Error - Ошибка сервера**
```json
{
  "success": false,
  "error": "Ошибка при отправке сообщения с файлом"
}
```

## Примеры использования

### cURL
```bash
curl -X POST http://localhost:3000/api/sendMessageWithFile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Привет! Это тестовое сообщение.",
    "emailHTML": "<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>"
  }'
```

### JavaScript (fetch)
```javascript
const token = localStorage.getItem('token'); // Получаем токен из localStorage

const response = await fetch('http://localhost:3000/api/sendMessageWithFile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: 'Привет! Это тестовое сообщение.',
    emailHTML: '<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>'
  })
});

const data = await response.json();
console.log(data);
```

### Python (requests)
```python
import requests

url = 'http://localhost:3000/api/sendMessageWithFile'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
data = {
    'message': 'Привет! Это тестовое сообщение.',
    'emailHTML': '<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>'
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

## Внутренняя логика

1. **Валидация входных данных** - проверка типов и форматов
2. **Обработка запроса** - получение message и emailHTML из тела запроса
3. **Возврат ответа** - JSON с подтверждением и переданными данными

## Особенности реализации

- Эндпоинт принимает JSON с полями `message` и `emailHTML`
- Простая валидация: проверка что оба поля являются непустыми строками
- Возвращает те же данные, что были переданы в запросе
- Логирование запросов в консоль для отладки

## Безопасность

- Валидация всех входных данных
- Обработка ошибок без раскрытия внутренней структуры
- Простая проверка типов данных

## Статус коды

| Код | Описание |
|-----|----------|
| 200 | Успешная обработка |
| 400 | Неверные параметры запроса |
| 500 | Внутренняя ошибка сервера |
