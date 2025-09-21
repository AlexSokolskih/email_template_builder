const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('/api/sendMessageWithFile', () => {
  let authToken = '';
  let testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'password1234',
    name: 'Test User'
  };

  // Создаем пользователя и получаем токен перед тестами
  beforeAll(async () => {
    // Очищаем базу
    await prisma.user.deleteMany({});
    
    // Регистрируем тестового пользователя
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = res.body.token;
  });

  // Очищаем базу после тестов
  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('SUCCESS cases', () => {
    it('should return success with minimal data', async () => {
      const payload = {
        message: 'hi',
        emailHTML: '<p>Hello world</p>'
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('emailHtml');
    });

    it('should return success with full HTML content', async () => {
      const emailHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>body{font-family:sans-serif} .btn{background:#000;color:#fff;padding:8px 12px}</style>
</head><body>
<h1>Заголовок письма</h1>
<p>Это <b>форматированный</b> текст письма.</p>
<a class="btn" href="https://example.com">Кнопка</a>
</body></html>`;

      const payload = {
        message: 'Письмо с полным HTML-телом',
        emailHTML
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('emailHtml');
    });
  });

  describe('ERROR cases', () => {
    it('should return 401 when no token provided', async () => {
      const payload = {
        message: 'hi',
        emailHTML: '<p>Hello world</p>'
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'Токен доступа не предоставлен'
      });
    });

    it('should return 400 when message is missing', async () => {
      const payload = {
        emailHTML: '<p>Hello</p>'
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'message обязателен и должен быть строкой'
      });
    });

    it('should return 400 when emailHTML is missing', async () => {
      const payload = {
        message: 'hi'
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'emailHTML обязателен и должен быть строкой'
      });
    });

    it('should return 400 when message is empty', async () => {
      const payload = {
        message: '',
        emailHTML: '<p>Hello</p>'
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'message обязателен и должен быть строкой'
      });
    });

    it('should return 400 when emailHTML is empty', async () => {
      const payload = {
        message: 'hi',
        emailHTML: ''
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'emailHTML обязателен и должен быть строкой'
      });
    });

    it('should return 400 when message is not a string', async () => {
      const payload = {
        message: 123,
        emailHTML: '<p>Hello</p>'
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'message обязателен и должен быть строкой'
      });
    });

    it('should return 400 when emailHTML is not a string', async () => {
      const payload = {
        message: 'hi',
        emailHTML: 456
      };

      const res = await request(app)
        .post('/api/sendMessageWithFile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'emailHTML обязателен и должен быть строкой'
      });
    });
  });
});


