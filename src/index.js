const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

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

// Статические файлы для Next.js
app.use('/_next', express.static(path.join(__dirname, '../frontend/_next')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = req.params.userFolder;
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
app.get('/api/assets/:folder/:filename', (req, res) => {
  try {
    const { folder, filename } = req.params;
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
app.post('/api/upload/:userFolder', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const userFolder = req.params.userFolder;
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