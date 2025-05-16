/**
 * services/template.service.js
 * Сервис для работы с шаблонами сообщений
 */

/**
 * Форматирование шаблона сообщения с подстановкой переменных
 * @param {string} template - Шаблон сообщения с placeholders в формате {{variableName}}
 * @param {Object} data - Объект с данными для подстановки
 * @returns {string} Отформатированное сообщение
 */
export const formatMessage = (template, data) => {
  if (!template) {
    return '';
  }
  
  // Заменяем все placeholder'ы на соответствующие значения
  let formattedMessage = template;
  
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    formattedMessage = formattedMessage.replace(regex, data[key]);
  });
  
  return formattedMessage;
};

/**
 * Получение шаблона сообщения из базы данных или из констант
 * @param {string} templateKey - Ключ шаблона
 * @param {string} channel - Канал коммуникации
 * @returns {string} Шаблон сообщения
 */
export const getMessageTemplate = (templateKey, channel) => {
  // В будущем здесь может быть загрузка шаблонов из базы данных
  // Пока просто возвращаем шаблоны из констант
  
  // Разбираем ключ шаблона, например, "PREVENTIVE_-5"
  const [phase, day] = templateKey.split('_');
  
  // Импортируем константы только здесь, чтобы избежать циклических зависимостей
  const { MESSAGE_TEMPLATES } = require('../constants.js');
  
  try {
    return MESSAGE_TEMPLATES[phase][day][channel];
  } catch (error) {
    console.error(`Template not found: ${templateKey} for channel ${channel}`);
    return null;
  }
};