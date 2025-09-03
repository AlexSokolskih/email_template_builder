# API Спецификация - Health Check

## Базовый URL
```
http://localhost:3001
```

## Эндпоинт

### Health Check

**GET** `/health`

Проверка состояния сервера и доступности API.

#### Параметры
Нет параметров.

#### Успешный ответ (200)
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Описание полей ответа:**
- `status` (string) - статус сервера, всегда "OK" при успешном ответе
- `timestamp` (string) - текущее время сервера в формате ISO 8601

#### Ошибки

**500 Internal Server Error** - Сервер недоступен
```json
{
  "error": "Что-то пошло не так!"
}
```

#### Примеры использования

**cURL:**
```bash
curl http://localhost:3001/health
```

**JavaScript (fetch):**
```javascript
fetch('/health')
  .then(response => response.json())
  .then(data => {
    console.log('Статус сервера:', data.status);
    console.log('Время сервера:', data.timestamp);
  })
  .catch(error => {
    console.error('Ошибка:', error);
  });
```

**JavaScript (axios):**
```javascript
axios.get('/health')
  .then(response => {
    const data = response.data;
    console.log('Статус сервера:', data.status);
    console.log('Время сервера:', data.timestamp);
  })
  .catch(error => {
    console.error('Ошибка:', error);
  });
```

**React компонент:**
```jsx
import React, { useState, useEffect } from 'react';

const HealthCheck = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true);
        const response = await fetch('/health');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    
    // Проверяем каждые 30 секунд
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Проверка состояния сервера...</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        ❌ Сервер недоступен: {error}
      </div>
    );
  }

  return (
    <div style={{ color: 'green' }}>
      ✅ Сервер работает
      <br />
      <small>Время сервера: {new Date(status.timestamp).toLocaleString()}</small>
    </div>
  );
};

export default HealthCheck;
```

## Назначение

Health check эндпоинт используется для:

1. **Мониторинга**: Проверки доступности сервера
2. **Load Balancer**: Определения работоспособности инстанса
3. **DevOps**: Автоматических проверок в CI/CD пайплайнах
4. **Отладки**: Быстрой проверки состояния API

## Рекомендации по использованию

1. **Регулярные проверки**: Используйте для периодического мониторинга
2. **Обработка ошибок**: Всегда обрабатывайте возможные ошибки сети
3. **Таймауты**: Устанавливайте разумные таймауты для запросов
4. **Логирование**: Логируйте результаты проверок для анализа

## Интеграция с мониторингом

### Prometheus
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'email-generator-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/health'
    scrape_interval: 30s
```

### Docker Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
```

### Kubernetes Liveness/Readiness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```
