# API Спецификация - Отправка сообщений с файлом

## Базовый URL
```
http://localhost:3000
https://localhost:3001
```

## Эндпоинты

### 1. Отправка сообщения с файлом

**POST** `/api/sendMessageWithFile`

Принимает сообщение, HTML-контент email и опциональный файл для анализа

#### Заголовки запроса
- Content-Type: `multipart/form-data` (при загрузке файла) или `application/json` (без файла)
- Authorization: `Bearer <JWT_TOKEN>` (обязательно)

#### Тело запроса

**Без файла (JSON):**
```json
{
  "message": "Текст сообщения",
  "emailHTML": "<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>"
}
```

**С файлом (multipart/form-data):**
- `message` (string) - Текст сообщения
- `emailHTML` (string) - HTML-контент email  
- `file` (file) - Опциональный файл для анализа (изображения, PDF, текстовые файлы)

#### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `message` | string | Да | Текст сообщения |
| `emailHTML` | string | Да | HTML-контент email |
| `file` | file | Нет | Файл для анализа (макс. 10MB) |

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
  "message": "Ответ от Gemini AI",
  "emailHtml": "<html><body><h1>Сгенерированный email</h1><p>Содержимое</p></body></html>",
  "usage": {
    "promptTokenCount": 150,
    "candidatesTokenCount": 200,
    "totalTokenCount": 350
  },
  "model": "gemini-2.5-flash",
  "fileProcessed": true,
  "filesProcessed": 1
}
```

**Поля ответа:**
- `success` - статус успешности операции
- `message` - текстовый ответ от Gemini AI
- `emailHtml` - сгенерированный HTML email (если есть)
- `usage` - информация об использовании токенов
- `model` - использованная модель AI
- `fileProcessed` - был ли обработан файл
- `filesProcessed` - количество обработанных файлов

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

**500 Internal Server Error - Ошибка Gemini API**
```json
{
  "success": false,
  "error": "Ошибка от Gemini API",
  "details": "Подробности ошибки"
}
```

**500 Internal Server Error - API ключ не настроен**
```json
{
  "error": "GEMINI_API_KEY не настроен"
}
```

## Примеры использования

### cURL (без файла)
```bash
curl -X POST http://localhost:3000/api/sendMessageWithFile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Привет! Это тестовое сообщение.",
    "emailHTML": "<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>"
  }'
```

### cURL (с файлом)
```bash
curl -X POST http://localhost:3000/api/sendMessageWithFile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "message=Привет! Это тестовое сообщение." \
  -F "emailHTML=<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>" \
  -F "file=@/path/to/your/file.pdf"
```

### JavaScript (fetch) - без файла
```javascript
const token = localStorage.getItem('token');

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

### JavaScript (fetch) - с файлом
```javascript
const token = localStorage.getItem('token');
const formData = new FormData();

formData.append('message', 'Привет! Это тестовое сообщение.');
formData.append('emailHTML', '<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>');
formData.append('file', fileInput.files[0]); // fileInput - элемент input[type="file"]

const response = await fetch('http://localhost:3000/api/sendMessageWithFile', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log(data);
```

### Python (requests) - без файла
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

### Python (requests) - с файлом
```python
import requests

url = 'http://localhost:3000/api/sendMessageWithFile'
headers = {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
files = {
    'file': ('document.pdf', open('document.pdf', 'rb'), 'application/pdf')
}
data = {
    'message': 'Привет! Это тестовое сообщение.',
    'emailHTML': '<html><body><h1>Заголовок</h1><p>Содержимое email</p></body></html>'
}

response = requests.post(url, files=files, data=data, headers=headers)
print(response.json())
```

## Внутренняя логика

1. **Валидация входных данных** - проверка типов и форматов
2. **Обработка файла** - если файл загружен, сохраняется во временную папку
3. **Отправка в Gemini AI** - передача сообщения и файла (если есть) в AI для анализа
4. **Обработка ответа** - извлечение HTML email из ответа AI
5. **Очистка** - удаление временных файлов
6. **Возврат ответа** - JSON с результатом анализа

## Особенности реализации

- Эндпоинт поддерживает два формата: JSON (без файла) и multipart/form-data (с файлом)
- Валидация: проверка что `message` и `emailHTML` являются непустыми строками
- Файлы сохраняются во временную папку `temp_uploads/` и автоматически удаляются
- Поддержка различных типов файлов: изображения, PDF, текстовые файлы
- Лимит размера файла: 10MB
- Интеграция с Gemini AI для анализа контента
- Логирование всех операций для отладки

## Безопасность

- Валидация всех входных данных
- Обработка ошибок без раскрытия внутренней структуры
- Проверка типов данных и размеров файлов
- Автоматическая очистка временных файлов
- Ограничение размера загружаемых файлов (10MB)
- Аутентификация через JWT токены

## Статус коды

| Код | Описание |
|-----|----------|
| 200 | Успешная обработка |
| 400 | Неверные параметры запроса |
| 401 | Отсутствует токен авторизации |
| 403 | Недействительный токен |
| 500 | Внутренняя ошибка сервера |

## Поддерживаемые типы файлов

- **Изображения**: JPG, JPEG, PNG, GIF, WebP, SVG
- **Документы**: PDF, TXT, MD, CSV, JSON, XML, HTML
- **Максимальный размер**: 10MB
- **Обработка**: Файлы анализируются AI для контекста и генерации email
