const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('/api/auth', () => {
  let testUser = {
    email: `test${Date.now()}@example.com`, // уникальный email
    password: 'password1234',
    name: 'Test User'
  };

  let authToken = '';

  // Очищаем базу перед каждым тестом
  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Пользователь успешно зарегистрирован');
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: testUser.email,
        name: testUser.name
      });
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('createdAt');
      
      authToken = res.body.token;
    });

    it('should return 400 when email is missing', async () => {
      const payload = {
        password: 'password123',
        name: 'Test User'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when password is missing', async () => {
      const payload = {
        email: 'test2@example.com',
        name: 'Test User'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when password is too short', async () => {
      const payload = {
        email: 'test3@example.com',
        password: '123',
        name: 'Test User'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when user already exists', async () => {
      // Сначала регистрируем пользователя
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Потом пытаемся зарегистрировать с тем же email
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should register user without name (optional field)', async () => {
      const payload = {
        email: `test${Date.now() + 1}@example.com`,
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(payload.email);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const payload = {
        email: testUser.email,
        password: testUser.password
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Успешная авторизация');
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
      
      authToken = res.body.token;
    });

    it('should return 400 when email is missing', async () => {
      const payload = {
        password: testUser.password
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 when password is missing', async () => {
      const payload = {
        email: testUser.email
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with invalid email', async () => {
      const payload = {
        email: 'invalid@example.com',
        password: testUser.password
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with invalid password', async () => {
      const payload = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('createdAt');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token format', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidToken');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with malformed Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Protected endpoints with auth', () => {
    it('should access /api/files with valid token', async () => {
      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('files');
      expect(Array.isArray(res.body.files)).toBe(true);
    });

    it('should return 401 for /api/files without token', async () => {
      const res = await request(app)
        .get('/api/files');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should access /api/upload with valid token', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), 'test.txt');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('folder');
      expect(res.body).toHaveProperty('files');
    });

    it('should return 401 for /api/upload without token', async () => {
      const res = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test content'), 'test.txt');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Health check (public endpoint)', () => {
    it('should return health status without auth', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
