const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

/**
 * Универсальный класс для работы с Gemini API
 * Поддерживает отправку текстовых сообщений и сообщений с файлами
 * Включает систему сессий для разделения пользователей
 */
class GeminiClient {
  instructions = ' если в ответе есть html код письма, то выведи его обернутым в тег <emailhtml> и </emailhtml> если нет, то не выводи и не упоминай';
  
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API ключ обязателен');
    }
    
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
    this.defaultModel = options.model || "gemini-2.5-flash";
    this.defaultConfig = {
      thinkingConfig: {
        thinkingBudget: options.thinkingBudget || 0
      },
      ...options.config
    };
    this.prisma = new PrismaClient();
  }

  /**
   * Сохраняет запрос и ответ в базу данных
   * @param {Object} data - Данные для сохранения
   * @returns {Promise<void>}
   * @private
   */
  async _saveRequest(data) {
    try {
      console.log('🔥 HOT RELOAD: Сохраняем запрос в БД:', {
        request: data.request?.substring(0, 100) + '...',
        success: data.success,
        userId: data.userId
      });
      
      const result = await this.prisma.geminiRequest.create({
        data: {
          request: data.request,
          response: data.response,
          emailHtml: data.emailHtml,
          model: data.model,
          usage: data.usage,
          success: data.success,
          error: data.error,
          fileProcessed: data.fileProcessed || false,
          filesProcessed: data.filesProcessed || null,
          userId: data.userId
        }
      });
      
      console.log('🔥 HOT RELOAD: Запрос успешно сохранен в БД с ID:', result.id);
    } catch (error) {
      console.error('🔥 HOT RELOAD: Ошибка сохранения запроса в БД:', error);
      console.error('🔥 HOT RELOAD: Данные для сохранения:', data);
    }
  }

  /**
   * Отправляет текстовое сообщение в Gemini
   * @param {string} message - Текстовое сообщение
   * @param {Object} options - Дополнительные опции (включая userId)
   * @returns {Promise<Object>} Результат запроса
   */
  async sendMessage(message, options = {}) {
    process.stdout.write('🔥 HOT RELOAD: === НАЧАЛО sendMessage ===\n');
    console.log('🔥 HOT RELOAD: === НАЧАЛО sendMessage ===');
    const { userId, ...otherOptions } = options;
    const originalMessage = message;
    message = message + this.instructions; 

    console.log('🔥 HOT RELOAD: sendMessage вызван с userId:', userId);
    console.log('🔥 HOT RELOAD: originalMessage:', originalMessage?.substring(0, 100) + '...');

    try {
      const config = {
        ...this.defaultConfig,
        ...otherOptions.config
      };

      console.log('🔥 HOT RELOAD: Отправляем запрос в Gemini API...');
      const response = await this.ai.models.generateContent({
        model: otherOptions.model || this.defaultModel,
        contents: message,
        config
      });
      console.log('🔥 HOT RELOAD: Получен ответ от Gemini API');
      
      const emailHtml = response.text.match(/<emailhtml>([\s\S]*?)<\/emailhtml>/);
      let result;
      
      if (emailHtml) {
        const cleanedText = response.text.replace(/<emailhtml>([\s\S]*?)<\/emailhtml>/, '');
        result = {
          emailHtml: emailHtml[1].trim(),
          success: true,
          text: cleanedText.trim(),
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          userId: userId
        };
      } else {
        result = {
          emailHtml: null,
          success: true,
          text: response.text,
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          userId: userId
        };
      }

      // Сохраняем запрос в БД (успешный или неуспешный)
      await this._saveRequest({
        request: originalMessage,
        response: result.text,
        emailHtml: result.emailHtml,
        model: result.model,
        usage: result.usage,
        success: result.success,
        error: result.error,
        userId: userId
      });

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        details: error,
        userId: userId
      };

      // Сохраняем ошибку в БД
      await this._saveRequest({
        request: originalMessage,
        response: null,
        emailHtml: null,
        model: otherOptions.model || this.defaultModel,
        usage: null,
        success: false,
        error: error.message,
        userId: userId
      });

      return result;
    }
  }

  /**
   * Отправляет сообщение с файлом (изображение, PDF, текст)
   * @param {string} message - Текстовое сообщение
   * @param {string|Buffer} file - Путь к файлу или Buffer с данными файла
   * @param {Object} options - Дополнительные опции (включая userId)
   * @returns {Promise<Object>} Результат запроса
   */
  async sendMessageWithFile(message, file, options = {}) {
    console.log('🔥 HOT RELOAD: === НАЧАЛО sendMessageWithFile ===');
    console.log('🔥 HOT RELOAD: message:', message);
    console.log('🔥 HOT RELOAD: file:', file);
    console.log('🔥 HOT RELOAD: options:', options);
    
    const { userId, ...otherOptions } = options;
    const originalMessage = message;
    message = message + this.instructions; 
    
    console.log('🔥 HOT RELOAD: userId:', userId);
    console.log('🔥 HOT RELOAD: message с инструкциями:', message);
    
    try {
      let fileData;
      let mimeType = otherOptions.mimeType;

      // Обработка файла
      console.log('🔥 HOT RELOAD: Начинаем обработку файла...');
      
      if (Buffer.isBuffer(file)) {
        console.log('🔥 HOT RELOAD: Файл - Buffer');
        fileData = file;
      } else if (typeof file === 'string') {
        console.log('🔥 HOT RELOAD: Файл - строка:', file);
        // Проверяем, является ли это путем к файлу или base64
        if (file.startsWith('data:')) {
          console.log('🔥 HOT RELOAD: Файл - base64 строка');
          // Base64 строка
          const [header, data] = file.split(',');
          mimeType = mimeType || header.match(/data:([^;]+)/)?.[1];
          fileData = Buffer.from(data, 'base64');
        } else {
          console.log('🔥 HOT RELOAD: Файл - путь к файлу');
          // Путь к файлу
          if (!fs.existsSync(file)) {
            console.log('🔥 HOT RELOAD: ОШИБКА - файл не найден:', file);
            throw new Error(`Файл не найден: ${file}`);
          }
          console.log('🔥 HOT RELOAD: Файл существует, читаем...');
          fileData = fs.readFileSync(file);
          mimeType = mimeType || this._getMimeType(file);
          console.log('🔥 HOT RELOAD: MIME тип:', mimeType);
        }
      } else {
        console.log('🔥 HOT RELOAD: ОШИБКА - неподдерживаемый тип файла:', typeof file);
        throw new Error('Неподдерживаемый тип файла');
      }
      
      console.log('🔥 HOT RELOAD: Файл обработан, размер:', fileData.length);

      // Создаем содержимое с файлом
      console.log('🔥 HOT RELOAD: Создаем содержимое с файлом...');
      const contents = [
        {
          parts: [
            { text: message },
            {
              inlineData: {
                mimeType: mimeType,
                data: fileData.toString('base64')
              }
            }
          ]
        }
      ];

      console.log('🔥 HOT RELOAD: Содержимое создано, parts:', contents[0].parts.length);

      const config = {
        ...this.defaultConfig,
        ...otherOptions.config
      };
      
      console.log('🔥 HOT RELOAD: Конфигурация:', config);

      console.log('🔥 HOT RELOAD: Отправляем запрос в Gemini...');
      const response = await this.ai.models.generateContent({
        model: otherOptions.model || this.defaultModel,
        contents,
        config
      });

      console.log('🔥 HOT RELOAD: Получили ответ от Gemini, длина:', response.text?.length || 0);
      console.log('🔥 HOT RELOAD: Ответ:', response.text);

      const emailHtml = response.text.match(/<emailhtml>([\s\S]*?)<\/emailhtml>/);
      let result;
      
      if (emailHtml) {
        response.text = response.text.replace(/<emailhtml>([\s\S]*?)<\/emailhtml>/, '');
        result = {
          emailHtml: emailHtml[1].trim(),
          success: true,
          text: response.text.trim(),
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          fileProcessed: true,
          userId: userId
        };
      } else {
        result = {
          emailHtml: null,
          success: true,
          text: response.text,
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          fileProcessed: true,
          userId: userId
        };
      }

      // Сохраняем запрос в БД
      console.log('🔥 HOT RELOAD: Сохраняем запрос в БД...');
      await this._saveRequest({
        request: originalMessage,
        response: result.text,
        emailHtml: result.emailHtml,
        model: result.model,
        usage: result.usage,
        success: result.success,
        fileProcessed: true,
        userId: userId
      });
      console.log('🔥 HOT RELOAD: Запрос сохранен в БД');

      console.log('🔥 HOT RELOAD: === КОНЕЦ sendMessageWithFile ===');
      return result;
    } catch (error) {
      console.log('🔥 HOT RELOAD: ОШИБКА в sendMessageWithFile:', error.message);
      console.log('🔥 HOT RELOAD: Стек ошибки:', error.stack);
      
      const result = {
        success: false,
        error: error.message,
        details: error,
        userId: userId
      };

      // Сохраняем ошибку в БД
      await this._saveRequest({
        request: originalMessage,
        response: null,
        emailHtml: null,
        model: otherOptions.model || this.defaultModel,
        usage: null,
        success: false,
        error: error.message,
        fileProcessed: true,
        userId: userId
      });

      return result;
    }
  }

  /**
   * Отправляет сообщение с несколькими файлами
   * @param {string} message - Текстовое сообщение
   * @param {Array} files - Массив файлов (пути или Buffer)
   * @param {Object} options - Дополнительные опции (включая userId)
   * @returns {Promise<Object>} Результат запроса
   */
  async sendMessageWithFiles(message, files, options = {}) {
    console.log('🔥 HOT RELOAD: === НАЧАЛО sendMessageWithFiles ===');
    console.log('🔥 HOT RELOAD: files:', files);
    const { userId, ...otherOptions } = options;
    const originalMessage = message;
    message = message + this.instructions; 
    try {
      const parts = [{ text: message }];

      for (const file of files) {
        let fileData;
        let mimeType;

        if (Buffer.isBuffer(file)) {
          fileData = file;
        } else if (typeof file === 'string') {
          if (file.startsWith('data:')) {
            const [header, data] = file.split(',');
            mimeType = header.match(/data:([^;]+)/)?.[1];
            fileData = Buffer.from(data, 'base64');
          } else {
            if (!fs.existsSync(file)) {
              throw new Error(`Файл не найден: ${file}`);
            }
            fileData = fs.readFileSync(file);
            mimeType = this._getMimeType(file);
          }
        } else {
          throw new Error('Неподдерживаемый тип файла');
        }

        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileData.toString('base64')
          }
        });
      }

      const contents = [{ parts }];
      const config = {
        ...this.defaultConfig,
        ...otherOptions.config
      };

      const response = await this.ai.models.generateContent({
        model: otherOptions.model || this.defaultModel,
        contents,
        config
      });

      const emailHtml = response.text.match(/<emailhtml>([\s\S]*?)<\/emailhtml>/);
      let result;
      
      if (emailHtml) {
        response.text = response.text.replace(/<emailhtml>([\s\S]*?)<\/emailhtml>/, '');
        result = {
          emailHtml: emailHtml[1].trim(),
          success: true,
          text: response.text.trim(),
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          filesProcessed: files.length,
          userId: userId
        };
      } else {
        result = {
          emailHtml: null,
          success: true,
          text: response.text,
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          filesProcessed: files.length,
          userId: userId
        };
      }

      // Сохраняем запрос в БД
      await this._saveRequest({
        request: originalMessage,
        response: result.text,
        emailHtml: result.emailHtml,
        model: result.model,
        usage: result.usage,
        success: result.success,
        filesProcessed: files.length,
        userId: userId
      });

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        details: error,
        userId: userId
      };

      // Сохраняем ошибку в БД
      await this._saveRequest({
        request: originalMessage,
        response: null,
        emailHtml: null,
        model: otherOptions.model || this.defaultModel,
        usage: null,
        success: false,
        error: error.message,
        filesProcessed: files.length,
        userId: userId
      });

      return result;
    }
  }

  /**
   * Определяет MIME тип файла по расширению
   * @param {string} filePath - Путь к файлу
   * @returns {string} MIME тип
   * @private
   */
  _getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.svg': 'image/svg+xml'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Проверяет доступность API
   * @returns {Promise<boolean>} Статус доступности
   */
  async checkHealth() {
    try {
      const result = await this.sendMessage('Привет');
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Получает информацию о модели
   * @param {string} model - Название модели
   * @returns {Promise<Object>} Информация о модели
   */
  async getModelInfo(model = null) {
    try {
      const modelName = model || this.defaultModel;
      const result = await this.sendMessage('Расскажи о своих возможностях', { model: modelName });
      return {
        model: modelName,
        available: result.success,
        capabilities: result.text
      };
    } catch (error) {
      return {
        model: model || this.defaultModel,
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Закрывает соединение с базой данных
   * @returns {Promise<void>}
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = GeminiClient;
