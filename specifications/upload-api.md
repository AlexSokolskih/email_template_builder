# API Спецификация - Загрузка файлов

## Базовый URL
```
http://localhost:3001

```

## Эндпоинты

### 1. Загрузка файла

**POST** `/api/upload/:userFolder`

Загружает файл в папку пользователя.

#### Параметры URL
- `userFolder` (string, обязательный) - имя папки пользователя для хранения файлов

#### Тело запроса
- Content-Type: `multipart/form-data`
- Поле: `file` (File, обязательное) - загружаемый файл

#### Ограничения
- Максимальный размер файла: 10MB
- Поддерживаемые типы файлов: любые (без ограничений)

#### Успешный ответ (200)
```json
{
  "success": true,
  "folder": "testuser",
  "uploadedFile": {
    "filename": "document.pdf",
    "path": "/home/alex/projects/work/startups/Email_generator/backend/uploads/testuser/document.pdf"
  },
  "files": [
    {
      "name": "document.pdf",
      "size": 1024000,
      "created": "2024-01-15T10:30:00.000Z",
      "modified": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "image.jpg",
      "size": 512000,
      "created": "2024-01-15T09:15:00.000Z",
      "modified": "2024-01-15T09:15:00.000Z"
    }
  ]
}
```

**Описание полей ответа:**
- `success` (boolean) - статус успешной загрузки
- `folder` (string) - имя папки пользователя, в которую был загружен файл
- `uploadedFile` (object) - информация о загруженном файле:
  - `filename` (string) - имя загруженного файла
  - `path` (string) - полный путь к загруженному файлу
- `files` (array) - **список всех файлов и директорий в папке пользователя**:
  - `name` (string) - имя файла/директории
  - `size` (number) - размер файла в байтах
  - `created` (string) - дата создания (ISO 8601)
  - `modified` (string) - дата последнего изменения (ISO 8601)

#### Ошибки

**400 Bad Request** - Файл не загружен
```json
{
  "error": "Файл не загружен"
}
```

**500 Internal Server Error** - Ошибка сервера
```json
{
  "error": "Ошибка загрузки файла"
}
```

#### Пример использования

**cURL:**
```bash
curl -X POST \
  http://localhost:3001/api/upload/testuser \
  -F "file=@/path/to/your/file.pdf"
```

**JavaScript (fetch):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/upload/testuser', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Загружен файл:', data.uploadedFile.filename);
  console.log('Папка:', data.folder);
  console.log('Всего файлов в папке:', data.files.length);
  console.log('Список всех файлов и директорий:', data.files);
});
```

**JavaScript (axios):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

axios.post('/api/upload/testuser', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
})
.then(response => {
  const data = response.data;
  console.log('Загружен файл:', data.uploadedFile.filename);
  console.log('Папка:', data.folder);
  console.log('Всего файлов в папке:', data.files.length);
  console.log('Список всех файлов и директорий:', data.files);
});
```

### 2. Health Check

**GET** `/health`

Проверка состояния сервера.

#### Успешный ответ (200)
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Структура файловой системы

Файлы сохраняются в следующей структуре:
```
uploads/
├── {userFolder}/
│   ├── file1.pdf
│   ├── image.jpg
│   └── document.docx
└── anotherUser/
    └── data.xlsx
```

## Middleware

### Безопасность
- **Helmet**: Настроен CSP для безопасности
- **CORS**: Разрешены все источники
- **Morgan**: Логирование запросов

### Обработка файлов
- **Multer**: Настроен для сохранения на диск
- Автоматическое создание папок пользователей
- Сохранение оригинальных имен файлов

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешная загрузка |
| 400 | Некорректный запрос (файл не загружен) |
| 500 | Внутренняя ошибка сервера |

## Примеры интеграции

### React компонент
```jsx
import React, { useState } from 'react';

const FileUpload = ({ userFolder }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/upload/${userFolder}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Загрузка...</p>}
      {result && (
        <div>
          <p>Файл загружен: {result.uploadedFile.filename}</p>
          <p>Папка: {result.folder}</p>
          <p>Всего файлов и директорий: {result.files.length}</p>
          <h4>Содержимое папки:</h4>
          <ul>
            {result.files.map((file, index) => (
              <li key={index}>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                <br />
                <small>
                  Создан: {new Date(file.created).toLocaleString()}
                  <br />
                  Изменен: {new Date(file.modified).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

## Особенности ответа при загрузке

При успешной загрузке файла API возвращает:

1. **Информацию о загруженном файле** - имя и путь к только что загруженному файлу
2. **Имя папки** - название папки пользователя, в которую был загружен файл
3. **Полный список содержимого папки** - все файлы и директории в папке пользователя с их метаданными:
   - Имя файла/директории
   - Размер в байтах
   - Дата создания
   - Дата последнего изменения

Это позволяет клиентскому приложению сразу обновить интерфейс, показав актуальное содержимое папки без дополнительных запросов.

## Рекомендации по использованию

1. **Валидация на клиенте**: Проверяйте размер файла перед загрузкой
2. **Индикаторы прогресса**: Показывайте пользователю статус загрузки
3. **Обработка ошибок**: Всегда обрабатывайте возможные ошибки
4. **Безопасность**: Валидируйте типы файлов на сервере (если требуется)
5. **Очистка**: Реализуйте механизм удаления старых файлов
6. **Обновление UI**: Используйте поле `files` для обновления списка файлов в интерфейсе

## Возможные улучшения

1. Добавить валидацию типов файлов
2. Реализовать эндпоинт для получения списка файлов пользователя
3. Добавить эндпоинт для удаления файлов
4. Реализовать загрузку нескольких файлов одновременно
5. Добавить сжатие изображений
6. Интегрировать с базой данных для отслеживания файлов
