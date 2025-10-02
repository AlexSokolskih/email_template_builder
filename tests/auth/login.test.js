require('dotenv').config();

// Переопределяем DATABASE_URL для локального запуска тестов до импорта приложения/Prisma
if (process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_URL.trim() !== '') {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL.trim();
} else {
  const pgPassword = (process.env.POSTGRES_PASSWORD || 'postgres').trim();
  process.env.DATABASE_URL = `postgresql://postgres:${pgPassword}@localhost:5432/email_generator?schema=public`;
}

const request = require('supertest');
const app = require('../../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('POST /api/auth/login', () => {
  let testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    name: 'Тестовый пользователь'
  };

  // Готовим окружение: чистим БД и создаем тестового пользователя
  beforeAll(async () => {
    await prisma.user.deleteMany({});
    
    // Создаем тестового пользователя для авторизации
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    if (response.status !== 201) {
      throw new Error('Не удалось создать тестового пользователя');
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it('должен успешно авторизовать существующего пользователя', async () => {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Успешная авторизация');
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user).toHaveProperty('email', testUser.email);
    expect(response.body.user).toHaveProperty('name', testUser.name);
    expect(response.body.user).toHaveProperty('createdAt');
  });

  it('должен вернуть ошибку 401 при неверном email', async () => {
    const loginData = {
      email: 'wrong@example.com',
      password: testUser.password
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 401 при неверном пароле', async () => {
    const loginData = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 400 при отсутствии email', async () => {
    const loginData = {
      password: testUser.password
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 400 при отсутствии пароля', async () => {
    const loginData = {
      email: testUser.email
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 400 при пустом теле запроса', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 400 при неверном формате данных', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send('invalid json')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});
