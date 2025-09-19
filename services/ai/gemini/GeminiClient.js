const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');
const path = require('path');

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
  }

  /**
   * Отправляет текстовое сообщение в Gemini
   * @param {string} message - Текстовое сообщение
   * @param {Object} options - Дополнительные опции (включая userId)
   * @returns {Promise<Object>} Результат запроса
   */
  async sendMessage(message, options = {}) {
    const { userId, ...otherOptions } = options;
    message = message + this.instructions; 

    try {
      const config = {
        ...this.defaultConfig,
        ...otherOptions.config
      };

      const response = await this.ai.models.generateContent({
        model: otherOptions.model || this.defaultModel,
        contents: message,
        config
      });
      
      const emailHtml = response.text.match(/<emailhtml>([\s\S]*?)<\/emailhtml>/);
      if (emailHtml) {
        const cleanedText = response.text.replace(/<emailhtml>([\s\S]*?)<\/emailhtml>/, '');
        return {
          emailHtml: emailHtml[1].trim(),
          success: true,
          text: cleanedText.trim(),
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          userId: userId
        };
      }

      return {
        emailHtml: null,
        success: true,
        text: response.text,
        usage: response.usage,
        model: otherOptions.model || this.defaultModel,
        userId: userId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error,
        userId: userId
      };
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
    const { userId, ...otherOptions } = options;
    message = message + this.instructions; 
    try {
      let fileData;
      let mimeType = otherOptions.mimeType;

      // Обработка файла
      if (Buffer.isBuffer(file)) {
        fileData = file;
      } else if (typeof file === 'string') {
        // Проверяем, является ли это путем к файлу или base64
        if (file.startsWith('data:')) {
          // Base64 строка
          const [header, data] = file.split(',');
          mimeType = mimeType || header.match(/data:([^;]+)/)?.[1];
          fileData = Buffer.from(data, 'base64');
        } else {
          // Путь к файлу
          if (!fs.existsSync(file)) {
            throw new Error(`Файл не найден: ${file}`);
          }
          fileData = fs.readFileSync(file);
          mimeType = mimeType || this._getMimeType(file);
        }
      } else {
        throw new Error('Неподдерживаемый тип файла');
      }

      // Создаем содержимое с файлом
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
      if (emailHtml) {
        response.text = response.text.replace(/<emailhtml>([\s\S]*?)<\/emailhtml>/, '');
        return {
          emailHtml: emailHtml[1].trim(),
          success: true,
          text: response.text.trim(),
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          fileProcessed: true,
          userId: userId
        };
      }
      
      return {
        emailHtml: null,
        success: true,
        text: response.text,
        usage: response.usage,
        model: otherOptions.model || this.defaultModel,
        fileProcessed: true,
        userId: userId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error,
        userId: userId
      };
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
    const { userId, ...otherOptions } = options;
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
      if (emailHtml) {
        response.text = response.text.replace(/<emailhtml>([\s\S]*?)<\/emailhtml>/, '');
        return {
          emailHtml: emailHtml[1].trim(),
          success: true,
          text: response.text.trim(),
          usage: response.usage,
          model: otherOptions.model || this.defaultModel,
          filesProcessed: files.length,
          userId: userId
        };
      }
      
      return {
        emailHtml: null,
        success: true,
        text: response.text,
        usage: response.usage,
        model: otherOptions.model || this.defaultModel,
        filesProcessed: files.length,
        userId: userId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error,
        userId: userId
      };
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
}

module.exports = GeminiClient;
