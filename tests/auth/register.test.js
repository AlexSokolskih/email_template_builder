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


describe('POST /api/auth/register', () => {
  // Готовим окружение: чистим БД
  beforeAll(async () => {
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });
  
  it('должен успешно зарегистрировать нового пользователя', async () => {
    const userData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'Новый пользователь'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('message', 'Пользователь успешно зарегистрирован');
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user).toHaveProperty('email', userData.email);
    expect(response.body.user).toHaveProperty('name', userData.name);
    expect(response.body.user).toHaveProperty('createdAt');
  });

  it('должен зарегистрировать пользователя без имени', async () => {
    const userData = {
      email: 'userwithoutname@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('message', 'Пользователь успешно зарегистрирован');
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('email', userData.email);
  });

  it('должен вернуть ошибку 400 при отсутствии email', async () => {
    const userData = {
      password: 'password123',
      name: 'Пользователь без email'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 400 при отсутствии пароля', async () => {
    const userData = {
      email: 'user@example.com',
      name: 'Пользователь без пароля'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 400 при пароле менее 6 символов', async () => {
    const userData = {
      email: 'user@example.com',
      password: '12345',
      name: 'Пользователь с коротким паролем'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('должен вернуть ошибку 400 при попытке регистрации с существующим email', async () => {
    const userData = {
      email: 'existing@example.com',
      password: 'password123',
      name: 'Существующий пользователь'
    };

    // Первая регистрация
    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // Попытка повторной регистрации с тем же email
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('должен принять неверный формат email (нет валидации)', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'password123',
      name: 'Пользователь с неверным email'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('message', 'Пользователь успешно зарегистрирован');
  });
});
