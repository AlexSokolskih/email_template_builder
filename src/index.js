require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https:", "data:", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "http:", "https:"],
      frameSrc: ["'self'", "http://localhost:3000", "http://localhost:3001"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false // Отключаем X-Frame-Options полностью
}));
// Настройка CORS для всех эндпоинтов
app.use(cors());

// Специальная настройка CORS для эндпоинта /api/assets
app.use('/api/assets', cors({
  origin: '*', // Разрешаем все домены
  credentials: false, // Отключаем credentials для wildcard origin
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  exposedHeaders: ['Content-Type', 'Content-Length', 'Last-Modified', 'ETag']
}));

app.use(morgan('combined'));
app.use(express.json());




// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя в транзакции
    const user = await prisma.$transaction(async (tx) => {
      // Дополнительная проверка уникальности в транзакции
      const existingUserInTx = await tx.user.findUnique({
        where: { email }
      });

      if (existingUserInTx) {
        throw new Error('Пользователь с таким email уже существует');
      }

      return await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true
        }
      });
    });

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user,
      token
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    
    // Обработка специфичных ошибок Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    if (error.message === 'Пользователь с таким email уже существует') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.code === 'P1001') {
      return res.status(500).json({ error: 'База данных недоступна' });
    }
    
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Авторизация
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Успешная авторизация',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token
    });

  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
});

// Получение информации о текущем пользователе
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Статические файлы для Next.js
app.use('/_next', express.static(path.join(__dirname, '../frontend/_next')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = req.user?.userId || 'anonymous';
    const uploadPath = path.join(__dirname, '../uploads', userFolder);
    console.log('Upload path:', uploadPath);
    
    // Создаем папку если не существует
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Оставляем оригинальное имя файла
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB лимит
  }
});


// Эндпоинт для отображения файлов (не для скачивания)
app.get('/api/assets/:folder/:filename', authenticateToken, (req, res) => {
  try {
    const { folder, filename } = req.params;
    
    // Проверяем, что пользователь имеет доступ к этой папке
    if (folder !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const filePath = path.join(__dirname, '../uploads', folder, filename);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    
    // Проверяем, что это файл, а не директория
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Указанный путь не является файлом' });
    }
    
    // Определяем MIME-тип на основе расширения файла
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Устанавливаем заголовки для отображения в браузере
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Кеширование на 1 час
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Разрешаем cross-origin доступ
    res.removeHeader('X-Frame-Options'); // Убираем блокировку iframe
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Разрешаем iframe для всех доменов
    
    // Отправляем файл
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Ошибка получения файла:', error);
    res.status(500).json({ error: 'Ошибка получения файла' });
  }
});

// Эндпоинт для загрузки ассетов
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const userFolder = req.user.userId; // Используем ID пользователя из токена
    const uploadPath = path.join(__dirname, '../uploads', userFolder);
    
    // Получаем список файлов в папке пользователя
    let files = [];
    if (fs.existsSync(uploadPath)) {
      files = fs.readdirSync(uploadPath).map(filename => {
        const filePath = path.join(uploadPath, filename);
        const stats = fs.statSync(filePath);
        return {
          name: filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });
    }
    
    console.log(`🔥 HOT RELOAD: Файл ${req.file.originalname} загружен в папку ${userFolder}`);
    
    res.json({ 
      success: true, 
      folder: userFolder,
      uploadedFile: {
        filename: req.file.originalname,
        path: req.file.path
      },
      files: files
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    res.status(500).json({ error: 'Ошибка загрузки файла' });
  }
});

// Эндпоинт для получения списка файлов пользователя
app.get('/api/files', authenticateToken, (req, res) => {
  try {
    const userFolder = req.user.userId;
    const uploadPath = path.join(__dirname, '../uploads', userFolder);
    
    let files = [];
    if (fs.existsSync(uploadPath)) {
      files = fs.readdirSync(uploadPath).map(filename => {
        const filePath = path.join(uploadPath, filename);
        const stats = fs.statSync(filePath);
        return {
          name: filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/api/assets/${userFolder}/${filename}`
        };
      });
    }
    
    res.json({ files });
  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    res.status(500).json({ error: 'Ошибка получения списка файлов' });
  }
});



// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM получен, закрываю соединения...');
  await prisma.$disconnect();
  process.exit(0);
}); 