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
const https = require('https');
const GeminiClient = require('../services/ai/gemini/GeminiClient');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Функция для создания стандартизированного JWT токена
const createToken = (userId, email) => {
  // Нормализуем email для консистентности
  const normalizedEmail = email.toLowerCase().trim();
  
  return jwt.sign(
    { 
      userId, 
      email: normalizedEmail,
      iat: Math.floor(Date.now() / 1000) // Фиксируем время создания
    },
    JWT_SECRET,
    { 
      expiresIn: '24h',
      algorithm: 'HS256' // Фиксируем алгоритм
    }
  );
};

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] ? req.headers['authorization'].trim() : undefined;

  let token = undefined;

  // 1) Пытаемся взять из Authorization: Bearer <token>
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2) Если нет корректного Bearer, пробуем query-параметр ?token=
  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  // 3) Если так и не нашли токен — выдаем ошибку
  if (!token) {
    return res.status(401).json({ error: 'Токен доступа не предоставлен' });
  }

  // Дополнительная проверка на валидность токена
  if (typeof token !== 'string' || token.trim() === '') {
    return res.status(401).json({ error: 'Неверный формат токена' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err.message);
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
      frameSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "http://62.182.192.42:3001", "https://localhost:3000", "https://localhost:3001", "https://62.182.192.42:3001"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false // Отключаем X-Frame-Options полностью
}));
// Настройка CORS для всех эндпоинтов
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3005',
    'http://62.182.192.42:3001',
    'https://62.182.192.42:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://localhost:3005'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

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

// Middleware для обработки OPTIONS запросов
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
    return;
  }
  next();
});

// Middleware для нормализации заголовков
app.use((req, res, next) => {
  // Нормализуем заголовок Authorization
  if (req.headers.authorization) {
    req.headers.authorization = req.headers.authorization.trim();
  }
  next();
});




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
    const token = createToken(user.id, user.email);

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
    const token = createToken(user.id, user.email);

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

// Auth route
app.get('/auth/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/auth/index.html'));
});

// Register route
app.get('/register/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register/index.html'));
});

// Базовая директория для загрузок (переопределяется через переменную окружения UPLOADS_DIR)
const uploadsBaseDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../uploads');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = req.user?.userId || 'anonymous';
    const uploadPath = path.join(uploadsBaseDir, userFolder);
    console.log('Upload path:', uploadPath);
    
    // Создаем папку если не существует
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Корректируем моджибейк из latin1 в utf8 для поддержки кириллицы
    let safeName = file.originalname;
    try {
      // Если есть признаки моджибейка, перекодируем
      if (/[ÃÐÅÆ]/.test(file.originalname)) {
        safeName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      }
      // Нормализуем юникод
      if (typeof safeName.normalize === 'function') {
        safeName = safeName.normalize('NFC');
      }
    } catch (_) {}
    cb(null, safeName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB лимит
  }
});

// Настройка multer для временных файлов (для sendMessageWithFile)
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp_uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `temp-${uniqueSuffix}-${file.originalname}`);
  }
});

const tempUpload = multer({ 
  storage: tempStorage,
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
    
    const filePath = path.join(uploadsBaseDir, folder, filename);
    
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

// Эндпоинт для загрузки ассетов (принимает любой field в multipart)
app.post('/api/upload', authenticateToken, (req, res) => {
  upload.any()(req, res, (err) => {
    try {
      if (err) {
        console.error('Ошибка multer при загрузке:', err);
        return res.status(400).json({ error: 'Ошибка загрузки файла' });
      }

      const uploaded = Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null;
      if (!uploaded) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }

      const userFolder = req.user.userId; // Используем ID пользователя из токена
      const uploadPath = path.join(uploadsBaseDir, userFolder);
      console.log('Upload path:', uploadPath);

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

      console.log(`🔥 HOT RELOAD: Файл ${uploaded.originalname} загружен в папку ${userFolder}`);

      res.json({
        success: true,
        message: 'Файл успешно загружен',
        filename: uploaded.filename,
        userId: userFolder,
        filePath: uploaded.path,
        files: files
      });
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
  });
});

// Эндпоинт для получения списка файлов пользователя
app.get('/api/files', authenticateToken, (req, res) => {
  try {
    const userFolder = req.user.userId;
    const uploadPath = path.join(uploadsBaseDir, userFolder);
    
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



// Эндпоинт для отправки сообщения с HTML файлом в Gemini (с опциональной загрузкой файла)
app.post('/api/sendMessageWithFile', authenticateToken, tempUpload.single('file'), async (req, res) => {
  console.log('🔥 HOT RELOAD: Пришел запрос на отправку сообщения с файлом');
  console.log('🔥 HOT RELOAD: Тело запроса:', req.body);  
  console.log('🔥 HOT RELOAD: Загруженный файл:', req.file);

  let tempFilePath = null;

  try {
    const { message, emailHTML } = req.body || {};

    console.log('🔥 HOT RELOAD: Сообщение:', req.body.message);
    console.log('🔥 HOT RELOAD: Email HTML:', req.body.emailHTML);

    if (typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'message обязателен и должен быть строкой' });
    }
    if (typeof emailHTML !== 'string' || emailHTML.trim() === '') {
      return res.status(400).json({ error: 'emailHTML обязателен и должен быть строкой' });
    }

    // Проверяем наличие API ключа Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY не настроен' });
    }

    console.log('🔥 HOT RELOAD: process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
    console.log('🔥 HOT RELOAD: req.user.userId:', req.user.userId);

    // Создаем экземпляр GeminiClient
    const gemini = new GeminiClient(process.env.GEMINI_API_KEY);

    // Склеиваем сообщение и HTML тело письма
    const combinedMessage = `${message}\n\nHTML тело письма:\n${emailHTML}`;

    let result;

    // Если есть загруженный файл, передаем его путь в gemini
    if (req.file) {
      tempFilePath = req.file.path;
      console.log('🔥 HOT RELOAD: Отправляем сообщение с файлом в Gemini:', tempFilePath);
      result = await gemini.sendMessageWithFile(combinedMessage, tempFilePath, {
        userId: req.user.userId
      });
    } else {
      console.log('🔥 HOT RELOAD: Отправляем текстовое сообщение в Gemini');
      result = await gemini.sendMessage(combinedMessage, {
        userId: req.user.userId
      });
    }

    if (result.success) {
      console.log('🔥 HOT RELOAD: Успешный ответ от Gemini');
      console.log('🔥 HOT RELOAD: Результат:', result);
      return res.json({
        success: true,
        message: result.text,
        emailHtml: result.emailHtml,
        usage: result.usage,
        model: result.model,
        fileProcessed: result.fileProcessed || false,
        filesProcessed: result.filesProcessed || 0
      });
    } else {
      console.error('🔥 HOT RELOAD: Ошибка от Gemini:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

  } catch (error) {
    console.error('Ошибка при отправке сообщения с файлом:', error);
    res.status(500).json({ success: false, error: 'Ошибка при отправке сообщения с файлом' });
  } finally {
    // Удаляем временный файл после обработки
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🔥 HOT RELOAD: Временный файл удален:', tempFilePath);
      } catch (deleteError) {
        console.error('Ошибка при удалении временного файла:', deleteError);
      }
    }
  }
});







// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

// SSL сертификаты
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './ssl/private.key';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './ssl/certificate.crt';

// Функция для запуска сервера
const startServer = () => {
  try {
    // Проверяем наличие SSL сертификатов
    if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
      const privateKey = fs.readFileSync(SSL_KEY_PATH, 'utf8');
      const certificate = fs.readFileSync(SSL_CERT_PATH, 'utf8');
      
      const credentials = {
        key: privateKey,
        cert: certificate
      };
      
      // Запускаем HTTPS сервер
      const httpsServer = https.createServer(credentials, app);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS сервер запущен на порту ${HTTPS_PORT}`);
        console.log(`🌐 Доступен по адресу: https://62.182.192.42:${HTTPS_PORT}`);
      });
      
      // Также запускаем HTTP сервер как fallback
      app.listen(PORT, () => {
        console.log(`🚀 HTTP сервер запущен на порту ${PORT}`);
        console.log(`🌐 Доступен по адресу: http://62.182.192.42:${PORT}`);
      });
      
      // Graceful shutdown для HTTPS
      process.on('SIGTERM', async () => {
        console.log('SIGTERM получен, закрываю соединения...');
        httpsServer.close(async () => {
          await prisma.$disconnect();
          process.exit(0);
        });
      });
      
    } else {
      console.warn('⚠️  SSL сертификаты не найдены, запускаю HTTP сервер');
      console.warn(`   Ожидаемые пути: ${SSL_KEY_PATH}, ${SSL_CERT_PATH}`);
      
      // Запускаем HTTP сервер как fallback
      app.listen(PORT, () => {
        console.log(`🚀 HTTP сервер запущен на порту ${PORT}`);
        console.log(`🌐 Доступен по адресу: http://62.182.192.42:${PORT}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

// Экспортируем app для тестов
module.exports = app;

// Запускаем сервер только если файл запущен напрямую
if (require.main === module) {
  startServer();
} 