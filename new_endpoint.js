// Эндпоинт для отправки сообщения с загруженным файлом в Gemini
app.post('/api/sendMessageWithUploadedFile', authenticateToken, upload.single('file'), async (req, res) => {
  console.log('🔥 HOT RELOAD: Пришел запрос на отправку сообщения с загруженным файлом');
  console.log('🔥 HOT RELOAD: Файл:', req.file);
  console.log('🔥 HOT RELOAD: Сообщение:', req.body.message);

  try {
    const { message } = req.body || {};

    if (typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'message обязателен и должен быть строкой' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл обязателен' });
    }

    // Проверяем наличие API ключа Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY не настроен' });
    }

    console.log('🔥 HOT RELOAD: process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
    console.log('🔥 HOT RELOAD: req.user.userId:', req.user.userId);

    // Создаем экземпляр GeminiClient
    const gemini = new GeminiClient(process.env.GEMINI_API_KEY);

    // Определяем MIME тип файла
    const ext = path.extname(req.file.originalname).toLowerCase();
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

    console.log('🔥 HOT RELOAD: Отправляем сообщение с файлом в Gemini');
    console.log('🔥 HOT RELOAD: MIME тип:', mimeType);
    console.log('🔥 HOT RELOAD: Путь к файлу:', req.file.path);

    // Отправляем сообщение с файлом в Gemini
    const result = await gemini.sendMessageWithFile(message, req.file.path, {
      userId: req.user.userId,
      mimeType: mimeType
    });

    if (result.success) {
      console.log('🔥 HOT RELOAD: Результат:', result);
      return res.json({
        success: true,
        message: result.text,
        emailHtml: result.emailHtml,
        usage: result.usage,
        model: result.model,
        fileProcessed: result.fileProcessed || false,
        filesProcessed: result.filesProcessed || 0,
        fileName: req.file.originalname,
        fileSize: req.file.size
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
    console.error('Ошибка при отправке сообщения с загруженным файлом:', error);
    res.status(500).json({ success: false, error: 'Ошибка при отправке сообщения с загруженным файлом' });
  }
});
