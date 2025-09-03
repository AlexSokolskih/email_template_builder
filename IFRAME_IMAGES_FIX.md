# Исправление проблемы с отображением изображений в iframe

## Проблема
В iframe отображались только часть картинок из-за ограничений CSP (Content Security Policy) и CORS.

## Решение

### 1. Обновлены CSP настройки в helmet
```javascript
contentSecurityPolicy: {
  directives: {
    imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
    frameSrc: ["'self'", "data:", "blob:"],
    frameAncestors: ["'self'", "*"]
  }
},
crossOriginResourcePolicy: { policy: "cross-origin" },
crossOriginEmbedderPolicy: false
```

### 2. Добавлены правильные CORS заголовки
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
res.setHeader('X-Frame-Options', 'ALLOWALL');
res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
```

### 3. Добавлена обработка OPTIONS запросов
```javascript
app.options('/api/assets/:folder/:filename', (req, res) => {
  // CORS заголовки для preflight запросов
});
```

### 4. Добавлена статическая раздача файлов
```javascript
app.use('/uploads', /* CORS middleware */, express.static(path.join(__dirname, '../uploads')));
```

## Тестирование

1. Запустите сервер: `node src/index.js`
2. Откройте `test-iframe.html` в браузере
3. Проверьте отображение изображений в разных секциях

## Доступные пути для изображений

- `/api/assets/email-assets/filename.png` - через API эндпоинт
- `/uploads/email-assets/filename.png` - прямая статическая раздача

## Результат
Теперь все изображения должны корректно отображаться в iframe без ограничений CSP и CORS.
