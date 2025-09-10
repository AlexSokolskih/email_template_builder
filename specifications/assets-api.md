# API Спецификация - Получение файлов для отображения

## Базовый URL
```
http://localhost:3000
https://localhost:3001
```

## Эндпоинт

### Получение файла для отображения

**GET** `/api/assets/:folder/:filename`

Возвращает файл для отображения в браузере (не для скачивания).

**⚠️ ТРЕБУЕТ АУТЕНТИФИКАЦИИ** - необходимо передать JWT токен в заголовке `Authorization: Bearer <token>`

#### Параметры URL
- `folder` (string, обязательный) - ID пользователя (папка пользователя)
- `filename` (string, обязательный) - имя файла с расширением

#### Заголовки запроса
- `Authorization: Bearer <jwt_token>` (обязательный) - JWT токен для аутентификации

#### Получение JWT токена
Для получения JWT токена используйте эндпоинты аутентификации:

**Регистрация:**
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Имя пользователя"
}
```

**Авторизация:**
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

Ответ содержит JWT токен в поле `token`, который нужно использовать в заголовке Authorization.

#### Поддерживаемые типы файлов
- **Изображения**: PNG, JPG, JPEG, GIF, WebP, SVG
- **Документы**: PDF, TXT, HTML, CSS, JS, JSON, XML
- **Медиа**: MP4, MP3, WAV

#### Заголовки ответа
- `Content-Type` - автоматически определяется по расширению файла
- `Cache-Control: public, max-age=3600` - кеширование на 1 час
- `Cross-Origin-Resource-Policy: cross-origin` - разрешение cross-origin доступа
- `X-Frame-Options: ALLOWALL` - разрешение встраивания в iframe
- `Access-Control-Allow-Origin: *` - разрешенные источники для CORS (все домены)
- `Access-Control-Expose-Headers` - доступные заголовки для клиента

#### Успешный ответ (200)
Возвращает содержимое файла с соответствующим MIME-типом для отображения в браузере.

#### Ошибки

**401 Unauthorized** - Токен не предоставлен или неверный формат
```json
{
  "error": "Токен доступа не предоставлен"
}
```

**403 Forbidden** - Недействительный токен или доступ запрещен
```json
{
  "error": "Недействительный токен"
}
```
или
```json
{
  "error": "Доступ запрещен"
}
```

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

**JavaScript (fetch с аутентификацией):**
```javascript
// Получение изображения
const token = 'your-jwt-token-here';
const userId = 'user-id-here';

fetch(`/api/assets/${userId}/logo.png`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  })
  .then(blob => {
    const imageUrl = URL.createObjectURL(blob);
    document.getElementById('logo').src = imageUrl;
  })
  .catch(error => {
    console.error('Ошибка загрузки файла:', error);
  });

// Получение текстового файла
fetch(`/api/assets/${userId}/readme.txt`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(response => response.text())
  .then(text => {
    console.log('Содержимое файла:', text);
  });
```

**cURL:**
```bash
# Получение изображения
curl -H "Authorization: Bearer your-jwt-token" \
     -o logo.png \
     http://localhost:3000/api/assets/user-id/logo.png

# Получение PDF
curl -H "Authorization: Bearer your-jwt-token" \
     -o document.pdf \
     http://localhost:3000/api/assets/user-id/report.pdf
```

**React компонент:**
```jsx
import React, { useState, useEffect } from 'react';

const AssetDisplay = ({ userId, filename, token }) => {
  const [assetUrl, setAssetUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/assets/${userId}/${filename}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Необходима авторизация');
          } else if (response.status === 403) {
            throw new Error('Доступ запрещен');
          } else if (response.status === 404) {
            throw new Error('Файл не найден');
          }
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

    if (token && userId && filename) {
      fetchAsset();
    }
    
    // Cleanup
    return () => {
      if (assetUrl) {
        URL.revokeObjectURL(assetUrl);
      }
    };
  }, [userId, filename, token]);

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

Файлы доступны по следующей структуре, где каждая папка соответствует ID пользователя:
```
uploads/
├── user-id-1/
│   ├── logo.png
│   ├── document.pdf
│   └── readme.txt
├── user-id-2/
│   ├── image.jpg
│   └── video.mp4
└── user-id-3/
    └── report.pdf
```

**Важно:** Пользователи могут получить доступ только к файлам в своей папке (соответствующей их user ID).

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

- **JWT аутентификация** - обязательная авторизация для доступа к файлам
- **Изоляция пользователей** - пользователи могут получить доступ только к своим файлам
- Проверка существования файла
- Валидация, что путь указывает на файл, а не директорию
- Автоматическое определение MIME-типа
- Кеширование для оптимизации производительности
- CORS настроен для всех доменов (`*`)
- Cross-Origin-Resource-Policy: cross-origin
- Разрешение встраивания в iframe (X-Frame-Options: ALLOWALL)

## CORS настройки

Эндпоинт `/api/assets` настроен для работы с любыми доменами:

- **Разрешенные источники**: `*` (все домены)
- **Методы**: GET, HEAD, OPTIONS
- **Заголовки**: Content-Type, Authorization, Cache-Control
- **Credentials**: Отключены (для wildcard origin)
- **Cross-Origin-Resource-Policy**: cross-origin
- **Exposed Headers**: Content-Type, Content-Length, Last-Modified, ETag

## Рекомендации по использованию

1. **Аутентификация**: Всегда передавайте JWT токен в заголовке Authorization
2. **Проверка доступа**: Убедитесь, что пользователь запрашивает файлы только из своей папки
3. **Кеширование**: Файлы кешируются на 1 час, используйте это для оптимизации
4. **Обработка ошибок**: Всегда проверяйте статус ответа и обрабатывайте ошибки аутентификации
5. **Освобождение ресурсов**: Используйте `URL.revokeObjectURL()` для освобождения памяти
6. **Типы файлов**: Проверяйте расширение файла для правильного отображения
7. **Размеры**: Устанавливайте максимальные размеры для изображений и видео
8. **CORS**: Настроен для всех доменов, работает с любым фронтендом
9. **Iframe**: Файлы можно встраивать в iframe благодаря настроенным заголовкам

## Возможные улучшения

1. Добавить поддержку дополнительных MIME-типов
2. Реализовать кеширование с ETag заголовками
3. Добавить роли и права доступа к файлам
4. Реализовать сжатие изображений на лету
5. Добавить поддержку WebP конвертации
6. Реализовать lazy loading для больших файлов
7. Добавить логирование доступа к файлам
8. Реализовать временные ссылки для файлов
9. Добавить валидацию размера файлов при загрузке
