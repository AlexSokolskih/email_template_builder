# GeminiClient - Универсальный класс для работы с Gemini API

Универсальный класс для интеграции с Google Gemini API, поддерживающий отправку текстовых сообщений и сообщений с файлами.

## Установка

```bash
npm install @google/genai
```

## Быстрый старт

```javascript
const GeminiClient = require('./GeminiClient');

// Создание экземпляра
const gemini = new GeminiClient('your-api-key-here');

// Отправка текстового сообщения
const result = await gemini.sendMessage('Привет, как дела?');
console.log(result.text);

// Отправка сообщения с файлом
const fileResult = await gemini.sendMessageWithFile(
  'Что на этом изображении?',
  './path/to/image.jpg'
);
console.log(fileResult.text);
```

## API

### Конструктор

```javascript
new GeminiClient(apiKey, options)
```

**Параметры:**
- `apiKey` (string) - API ключ Gemini (обязательный)
- `options` (object) - Дополнительные настройки:
  - `model` (string) - Модель по умолчанию (по умолчанию: "gemini-2.5-flash")
  - `thinkingBudget` (number) - Бюджет thinking (по умолчанию: 0)
  - `config` (object) - Дополнительная конфигурация

### Методы

#### `sendMessage(message, options)`

Отправляет текстовое сообщение в Gemini.

**Параметры:**
- `message` (string) - Текстовое сообщение
- `options` (object) - Опции:
  - `model` (string) - Модель для использования
  - `config` (object) - Дополнительная конфигурация

**Возвращает:**
```javascript
{
  success: boolean,
  text: string,
  usage: object,
  model: string
}
```

#### `sendMessageWithFile(message, file, options)`

Отправляет сообщение с файлом.

**Параметры:**
- `message` (string) - Текстовое сообщение
- `file` (string|Buffer) - Путь к файлу, Buffer или base64 строка
- `options` (object) - Опции:
  - `model` (string) - Модель для использования
  - `mimeType` (string) - MIME тип файла
  - `config` (object) - Дополнительная конфигурация

**Поддерживаемые форматы файлов:**
- Изображения: JPG, PNG, GIF, WebP, SVG
- Документы: PDF, TXT, MD, CSV, JSON, XML, HTML

**Возвращает:**
```javascript
{
  success: boolean,
  text: string,
  usage: object,
  model: string,
  fileProcessed: boolean
}
```

#### `sendMessageWithFiles(message, files, options)`

Отправляет сообщение с несколькими файлами.

**Параметры:**
- `message` (string) - Текстовое сообщение
- `files` (Array) - Массив файлов (пути, Buffer или base64 строки)
- `options` (object) - Опции

**Возвращает:**
```javascript
{
  success: boolean,
  text: string,
  usage: object,
  model: string,
  filesProcessed: number
}
```

#### `checkHealth()`

Проверяет доступность API.

**Возвращает:**
```javascript
boolean
```

#### `getModelInfo(model)`

Получает информацию о модели.

**Параметры:**
- `model` (string) - Название модели (опционально)

**Возвращает:**
```javascript
{
  model: string,
  available: boolean,
  capabilities: string,
  error: string
}
```

## Примеры использования

### Базовое использование

```javascript
const GeminiClient = require('./GeminiClient');

const gemini = new GeminiClient(process.env.GEMINI_API_KEY);

// Простое сообщение
const result = await gemini.sendMessage('Объясни квантовые вычисления');
if (result.success) {
  console.log(result.text);
}
```

### Работа с файлами

```javascript
// С файлом по пути
const fileResult = await gemini.sendMessageWithFile(
  'Что на этом изображении?',
  './image.jpg'
);

// С base64 данными
const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const base64Result = await gemini.sendMessageWithFile(
  'Проанализируй это изображение',
  base64Data
);

// С Buffer
const buffer = fs.readFileSync('./document.pdf');
const bufferResult = await gemini.sendMessageWithFile(
  'Извлеки текст из этого PDF',
  buffer,
  { mimeType: 'application/pdf' }
);
```

### Работа с несколькими файлами

```javascript
const files = ['./image1.jpg', './image2.png', './document.pdf'];
const multiFileResult = await gemini.sendMessageWithFiles(
  'Сравни эти изображения и документ',
  files
);
```

### Обработка ошибок

```javascript
const result = await gemini.sendMessage('Привет');

if (result.success) {
  console.log('Ответ:', result.text);
  console.log('Использование токенов:', result.usage);
} else {
  console.error('Ошибка:', result.error);
  console.error('Детали:', result.details);
}
```

### Настройка модели и параметров

```javascript
const gemini = new GeminiClient(apiKey, {
  model: 'gemini-2.5-pro',
  thinkingBudget: 1000
});

const result = await gemini.sendMessage('Сложный вопрос', {
  model: 'gemini-2.5-flash',
  config: {
    temperature: 0.7,
    maxOutputTokens: 1000
  }
});
```

## Переменные окружения

```bash
export GEMINI_API_KEY="your-api-key-here"
```

## Требования

- Node.js 18+
- @google/genai 1.19.0+

## Лицензия

MIT
