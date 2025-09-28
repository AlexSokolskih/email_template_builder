const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('POST /api/upload - Загрузка ассетов', () => {
  let testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'password1234',
    name: 'Test User'
  };
  
  let authToken = '';
  let userId = '';
  let uploadPath = '';

  // Создаем пользователя и получаем токен перед тестами
  beforeAll(async () => {
    // Очищаем базу
    await prisma.user.deleteMany({});
    
    // Регистрируем тестового пользователя
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
    uploadPath = path.join(__dirname, '../uploads', userId);
  });

  // Очищаем тестовую папку после каждого теста
  afterEach(() => {
    if (fs.existsSync(uploadPath)) {
      const files = fs.readdirSync(uploadPath);
      files.forEach(file => {
        const filePath = path.join(uploadPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  // Удаляем тестовую папку и пользователя после всех тестов
  afterAll(async () => {
    if (fs.existsSync(uploadPath)) {
      fs.rmSync(uploadPath, { recursive: true, force: true });
    }
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  test('должен загрузить файл с аутентификацией', async () => {
    // Создаем временный тестовый файл
    const testFilePath = path.join(__dirname, 'test-file.txt');
    const testContent = 'Тестовый контент для загрузки';
    fs.writeFileSync(testFilePath, testContent);

    try {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.folder).toBe(userId);
      expect(response.body.uploadedFile).toBeDefined();
      expect(response.body.uploadedFile.filename).toBe('test-file.txt');
      expect(response.body.files).toBeInstanceOf(Array);
      expect(response.body.files.length).toBe(1);
      
      // Проверяем что файл действительно создался
      const uploadedFilePath = path.join(uploadPath, 'test-file.txt');
      expect(fs.existsSync(uploadedFilePath)).toBe(true);
      
      // Проверяем содержимое файла
      const uploadedContent = fs.readFileSync(uploadedFilePath, 'utf8');
      expect(uploadedContent).toBe(testContent);
    } finally {
      // Удаляем временный файл
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('должен вернуть ошибку 401 без токена', async () => {
    const response = await request(app)
      .post('/api/upload');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Токен доступа не предоставлен');
  });

  test('должен вернуть ошибку 400 если файл не загружен', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Файл не загружен');
  });

  test('должен загрузить файл с правильными метаданными', async () => {
    const testFilePath = path.join(__dirname, 'metadata-test.txt');
    const testContent = 'Тест метаданных';
    fs.writeFileSync(testFilePath, testContent);

    try {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Проверяем структуру ответа
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('folder');
      expect(response.body).toHaveProperty('uploadedFile');
      expect(response.body).toHaveProperty('files');
      
      // Проверяем uploadedFile
      expect(response.body.uploadedFile).toHaveProperty('filename');
      expect(response.body.uploadedFile).toHaveProperty('path');
      expect(response.body.uploadedFile.filename).toBe('metadata-test.txt');
      
      // Проверяем files array
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body.files.length).toBe(1);
      
      const fileInfo = response.body.files[0];
      expect(fileInfo).toHaveProperty('name');
      expect(fileInfo).toHaveProperty('size');
      expect(fileInfo).toHaveProperty('created');
      expect(fileInfo).toHaveProperty('modified');
      expect(fileInfo.name).toBe('metadata-test.txt');
      expect(typeof fileInfo.size).toBe('number');
      expect(fileInfo.size).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('должен загрузить несколько файлов последовательно', async () => {
    const files = [
      { name: 'file1.txt', content: 'Содержимое файла 1' },
      { name: 'file2.txt', content: 'Содержимое файла 2' },
      { name: 'file3.txt', content: 'Содержимое файла 3' }
    ];

    const tempFiles = [];

    try {
      // Создаем временные файлы
      for (const file of files) {
        const tempPath = path.join(__dirname, file.name);
        fs.writeFileSync(tempPath, file.content);
        tempFiles.push(tempPath);
      }

      // Загружаем файлы последовательно
      for (let i = 0; i < files.length; i++) {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', tempFiles[i]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.files.length).toBe(i + 1);
      }

      // Проверяем что все файлы загружены
      const finalResponse = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', tempFiles[0]); // Загружаем еще один файл для получения списка

      expect(finalResponse.body.files.length).toBe(4); // 3 + 1 дубликат
    } finally {
      // Удаляем временные файлы
      tempFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  test('должен обработать файл с кириллическими символами в имени', async () => {
    const testFilePath = path.join(__dirname, 'тестовый-файл.txt');
    const testContent = 'Тест с кириллицей';
    fs.writeFileSync(testFilePath, testContent);

    try {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.uploadedFile.filename).toBe('тестовый-файл.txt');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('должен обработать файл с пробелами в имени', async () => {
    const testFilePath = path.join(__dirname, 'test file with spaces.txt');
    const testContent = 'Тест с пробелами';
    fs.writeFileSync(testFilePath, testContent);

    try {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.uploadedFile.filename).toBe('test file with spaces.txt');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('должен обработать файл с специальными символами в имени', async () => {
    const testFilePath = path.join(__dirname, 'test-file_123!@#$.txt');
    const testContent = 'Тест со спецсимволами';
    fs.writeFileSync(testFilePath, testContent);

    try {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.uploadedFile.filename).toBe('test-file_123!@#$.txt');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('должен вернуть правильные даты создания и изменения', async () => {
    const testFilePath = path.join(__dirname, 'date-test.txt');
    const testContent = 'Тест дат';
    fs.writeFileSync(testFilePath, testContent);

    try {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(200);
      
      const fileInfo = response.body.files[0];
      expect(fileInfo.created).toBeDefined();
      expect(fileInfo.modified).toBeDefined();
      
      // Проверяем что даты валидные
      const createdDate = new Date(fileInfo.created);
      const modifiedDate = new Date(fileInfo.modified);
      
      expect(createdDate instanceof Date).toBe(true);
      expect(modifiedDate instanceof Date).toBe(true);
      expect(isNaN(createdDate.getTime())).toBe(false);
      expect(isNaN(modifiedDate.getTime())).toBe(false);
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
