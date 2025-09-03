# API Спецификация - Получение файлов для отображения

## Базовый URL
```
http://localhost:3001
```

## Эндпоинт

### Получение файла для отображения

**GET** `/api/assets/:folder/:filename`

Возвращает файл для отображения в браузере (не для скачивания).

#### Параметры URL
- `folder` (string, обязательный) - имя папки, в которой находится файл
- `filename` (string, обязательный) - имя файла с расширением

#### Поддерживаемые типы файлов
- **Изображения**: PNG, JPG, JPEG, GIF, WebP, SVG
- **Документы**: PDF, TXT, HTML, CSS, JS, JSON, XML
- **Медиа**: MP4, MP3, WAV

#### Заголовки ответа
- `Content-Type` - автоматически определяется по расширению файла
- `Cache-Control: public, max-age=3600` - кеширование на 1 час
- `Access-Control-Allow-Origin: *` - разрешенные источники для CORS (все домены)
- `Cross-Origin-Resource-Policy: cross-origin` - разрешение cross-origin доступа
- `Access-Control-Expose-Headers` - доступные заголовки для клиента

#### Успешный ответ (200)
Возвращает содержимое файла с соответствующим MIME-типом для отображения в браузере.

#### Ошибки

**404 Not Found** - Файл не найден
```json
{
  "error": "Файл не найден"
}
```

**400 Bad Request** - Указанный путь не является файлом
```json
{
  "error": "Указанный путь не является файлом"
}
```

**500 Internal Server Error** - Ошибка сервера
```json
{
  "error": "Ошибка получения файла"
}
```

#### Примеры использования

**Прямая ссылка в HTML:**
```html
<!-- Изображение -->
<img src="/api/assets/email-assets/logo.png" alt="Логотип" />

<!-- PDF документ -->
<iframe src="/api/assets/documents/report.pdf" width="100%" height="600px"></iframe>

<!-- Видео -->
<video controls>
  <source src="/api/assets/videos/demo.mp4" type="video/mp4">
</video>
```

**JavaScript (fetch):**
```javascript
// Получение изображения
fetch('/api/assets/email-assets/logo.png')
  .then(response => response.blob())
  .then(blob => {
    const imageUrl = URL.createObjectURL(blob);
    document.getElementById('logo').src = imageUrl;
  });

// Получение текстового файла
fetch('/api/assets/testuser/readme.txt')
  .then(response => response.text())
  .then(text => {
    console.log('Содержимое файла:', text);
  });
```

**cURL:**
```bash
# Получение изображения
curl -o logo.png http://localhost:3001/api/assets/email-assets/logo.png

# Получение PDF
curl -o document.pdf http://localhost:3001/api/assets/documents/report.pdf
```

**React компонент:**
```jsx
import React, { useState, useEffect } from 'react';

const AssetDisplay = ({ folder, filename }) => {
  const [assetUrl, setAssetUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/assets/${folder}/${filename}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAssetUrl(url);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
    
    // Cleanup
    return () => {
      if (assetUrl) {
        URL.revokeObjectURL(assetUrl);
      }
    };
  }, [folder, filename]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  // Определяем тип файла для отображения
  const ext = filename.split('.').pop().toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg'].includes(ext);
  const isPdf = ext === 'pdf';

  if (isImage) {
    return <img src={assetUrl} alt={filename} style={{ maxWidth: '100%' }} />;
  }
  
  if (isVideo) {
    return (
      <video controls style={{ maxWidth: '100%' }}>
        <source src={assetUrl} type={`video/${ext}`} />
        Ваш браузер не поддерживает видео.
      </video>
    );
  }
  
  if (isAudio) {
    return (
      <audio controls>
        <source src={assetUrl} type={`audio/${ext}`} />
        Ваш браузер не поддерживает аудио.
      </audio>
    );
  }
  
  if (isPdf) {
    return (
      <iframe 
        src={assetUrl} 
        width="100%" 
        height="600px"
        title={filename}
      />
    );
  }

  return (
    <div>
      <p>Файл: {filename}</p>
      <a href={assetUrl} download={filename}>
        Скачать файл
      </a>
    </div>
  );
};

export default AssetDisplay;
```

## Структура файловой системы

Файлы доступны по следующей структуре:
```
uploads/
├── email-assets/
│   ├── logo.png
│   ├── btn.png
│   └── arrow.png
├── testuser/
│   ├── document.pdf
│   └── readme.txt
└── documents/
    └── report.pdf
```

## MIME-типы

| Расширение | MIME-тип |
|------------|----------|
| .png | image/png |
| .jpg, .jpeg | image/jpeg |
| .gif | image/gif |
| .webp | image/webp |
| .svg | image/svg+xml |
| .pdf | application/pdf |
| .txt | text/plain |
| .html | text/html |
| .css | text/css |
| .js | application/javascript |
| .json | application/json |
| .xml | application/xml |
| .mp4 | video/mp4 |
| .mp3 | audio/mpeg |
| .wav | audio/wav |

## Безопасность

- Проверка существования файла
- Валидация, что путь указывает на файл, а не директорию
- Автоматическое определение MIME-типа
- Кеширование для оптимизации производительности
- CORS настроен для всех доменов (`*`)
- Cross-Origin-Resource-Policy: cross-origin

## CORS настройки

Эндпоинт `/api/assets` настроен для работы с любыми доменами:

- **Разрешенные источники**: `*` (все домены)
- **Методы**: GET, HEAD, OPTIONS
- **Заголовки**: Content-Type, Authorization, Cache-Control
- **Credentials**: Отключены (для wildcard origin)
- **Cross-Origin-Resource-Policy**: cross-origin
- **Exposed Headers**: Content-Type, Content-Length, Last-Modified, ETag

## Рекомендации по использованию

1. **Кеширование**: Файлы кешируются на 1 час, используйте это для оптимизации
2. **Обработка ошибок**: Всегда проверяйте статус ответа
3. **Освобождение ресурсов**: Используйте `URL.revokeObjectURL()` для освобождения памяти
4. **Типы файлов**: Проверяйте расширение файла для правильного отображения
5. **Размеры**: Устанавливайте максимальные размеры для изображений и видео
6. **CORS**: Настроен для всех доменов, работает с любым фронтендом

## Возможные улучшения

1. Добавить поддержку дополнительных MIME-типов
2. Реализовать кеширование с ETag заголовками
3. Добавить ограничения доступа к файлам
4. Реализовать сжатие изображений на лету
5. Добавить поддержку WebP конвертации
6. Реализовать lazy loading для больших файлов
