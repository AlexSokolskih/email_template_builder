require('dotenv').config();
console.log('run test');

console.log('Переопределяем DATABASE_URL для локального запуска тестов до импорта приложения/Prisma');

// Переопределяем DATABASE_URL для локального запуска тестов до импорта приложения/Prisma
if (process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_URL.trim() !== '') {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL.trim();
} else {
  const pgPassword = (process.env.POSTGRES_PASSWORD || 'postgres').trim();
  process.env.DATABASE_URL = `postgresql://postgres:${pgPassword}@localhost:5432/email_generator?schema=public`;
}

// Устанавливаем JWT_SECRET для тестов
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

console.log('Пконстанты');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Направляем загрузки в отдельную тестовую папку ДО импорта приложения
process.env.UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads_test');

const app = require('../../src/index');

// Убедимся, что базовая папка существует
try {
  if (!fs.existsSync(process.env.UPLOADS_DIR)) {
    fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });
  }
} catch (_) {}

console.log('describe');

describe('API Upload - Загрузка файлов', () => {
  const userId = `test-user-${Date.now()}`;
  const email = `upload${Date.now()}@example.com`;
  const authToken = jwt.sign({ userId, email }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

  it('только авторизация (проверка, что токен получен)', async () => {
    expect(typeof authToken).toBe('string');
    expect(authToken && authToken.length).toBeGreaterThan(10);
    expect(userId).toBeTruthy();
  });

  afterAll(async () => {
    // Очищаем загруженные файлы
    const baseUploadsCleanup = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
    const uploadPath = path.join(baseUploadsCleanup, userId);
    if (fs.existsSync(uploadPath)) {
      fs.rmSync(uploadPath, { recursive: true, force: true });
    }
  });

  describe('POST /api/upload', () => {
    it('должен успешно загрузить PNG изображение', async () => {
      // Создаем простое PNG изображение для тестирования
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // color type, compression, filter, interlace
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // image data
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
      ]);

      console.log('=== НАЧАЛО ТЕСТА ЗАГРУЗКИ PNG ===');
      console.log('Токен для загрузки:', authToken);
      console.log('UserId для загрузки:', userId);
      console.log('Заголовок Authorization:', `Bearer ${authToken}`);
      console.log('Размер PNG буфера:', pngBuffer.length);
      console.log('Отправляем запрос на загрузку...');
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pngBuffer, 'test_image.png');
      console.log('Ответ загрузки - статус:', response.status);
      console.log('Ответ загрузки - тело:', JSON.stringify(response.body, null, 2));
      console.log('Ответ загрузки - заголовки:', response.headers);
      
      if (response.status !== 200) {
        console.error('ОШИБКА: Загрузка не удалась');
        console.error('Статус:', response.status);
        console.error('Тело ответа:', response.body);
      }
      
      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Файл успешно загружен');
      expect(response.body).toHaveProperty('filename', 'test_image.png');
      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('filePath');
      
      // Проверяем, что файл действительно создался
      const baseUploads = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
      const expectedFilePath = path.join(baseUploads, userId, 'test_image.png');
      console.log('Ожидаемый путь файла:', expectedFilePath);
      console.log('Файл существует:', fs.existsSync(expectedFilePath));
      expect(fs.existsSync(expectedFilePath)).toBe(true);
      
      console.log('=== ТЕСТ ЗАГРУЗКИ PNG ЗАВЕРШЕН ===');
    });

    it('должен вернуть ошибку 401 без токена авторизации', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Токен доступа не предоставлен');
    });

    it('должен вернуть ошибку 401 с неверным форматом токена', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'InvalidToken')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Токен доступа не предоставлен');
    });

    it('должен вернуть ошибку 403 с недействительным токеном', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer invalid-token-12345')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Недействительный токен');
    });

    it('должен вернуть ошибку 400 при отсутствии файла', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('должен загрузить файл с кириллическим именем', async () => {
      const cyrillicContent = 'Тестовый контент с кириллицей';
      const cyrillicFilename = 'тестовый_файл.txt';

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(cyrillicContent), cyrillicFilename)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename', cyrillicFilename);
      
      // Проверяем, что файл создался
      const baseUploads2 = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
      const expectedFilePath = path.join(baseUploads2, userId, cyrillicFilename);
      expect(fs.existsSync(expectedFilePath)).toBe(true);
    });

    it('должен загрузить файл с пробелами в имени', async () => {
      const spaceContent = 'Файл с пробелами в имени';
      const spaceFilename = 'file with spaces.txt';

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(spaceContent), spaceFilename)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename', spaceFilename);
      
      // Проверяем, что файл создался
      const baseUploads3 = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
      const expectedFilePath = path.join(baseUploads3, userId, spaceFilename);
      expect(fs.existsSync(expectedFilePath)).toBe(true);
    });

    it('должен загрузить файл со специальными символами в имени', async () => {
      const specialContent = 'Файл со специальными символами';
      const specialFilename = 'file-special_chars@#$%.txt';

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(specialContent), specialFilename)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename', specialFilename);
      
      // Проверяем, что файл создался
      const baseUploads4 = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
      const expectedFilePath = path.join(baseUploads4, userId, specialFilename);
      expect(fs.existsSync(expectedFilePath)).toBe(true);
    });

    it('должен загрузить файлы разных типов', async () => {
      const testFiles = [
        { content: 'Текстовый файл', filename: 'test.txt', expectedMime: 'text/plain' },
        { content: '{"test": "json"}', filename: 'test.json', expectedMime: 'application/json' },
        { content: '<html><body>Test</body></html>', filename: 'test.html', expectedMime: 'text/html' },
        { content: 'body { color: red; }', filename: 'test.css', expectedMime: 'text/css' }
      ];

      for (const file of testFiles) {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from(file.content), file.filename)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('filename', file.filename);
        
        // Проверяем, что файл создался
        const baseUploads5 = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
        const expectedFilePath = path.join(baseUploads5, userId, file.filename);
        expect(fs.existsSync(expectedFilePath)).toBe(true);
      }
    });

    it('должен создать папку пользователя при первой загрузке', async () => {
      // Создаем нового пользователя для этого теста
      const newUser = {
        email: `newuser${Date.now()}@example.com`,
        password: 'password123',
        name: 'New User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      const newToken = registerResponse.body.token;
      const newUserId = registerResponse.body.user.id;

      // Проверяем, что папка пользователя не существует
      const baseUploads6 = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
      const userDir = path.join(baseUploads6, newUserId);
      expect(fs.existsSync(userDir)).toBe(false);

      // Загружаем файл
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${newToken}`)
        .attach('file', Buffer.from('Test content'), 'test.txt')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // Проверяем, что папка пользователя создалась
      expect(fs.existsSync(userDir)).toBe(true);
      
      // Очищаем
      if (fs.existsSync(userDir)) {
        fs.rmSync(userDir, { recursive: true, force: true });
      }
    });
  });
});
