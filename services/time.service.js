/**
 * services/time.service.js
 * Сервис для проверки временных ограничений
 */

import { NOTIFICATION_STRATEGY } from "../constants.js";

/**
 * Проверка, подходит ли текущее время для отправки уведомлений
 * @param {Date} date - Дата и время для проверки
 * @returns {boolean} Подходит ли время для отправки
 */
export const isValidTime = (date) => {
  const hour = date.getHours();
  const dayOfWeek = date.getDay(); // 0 - воскресенье, 1 - понедельник, ..., 6 - суббота

  // Проверка времени суток
  if (
    hour < NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.START_HOUR ||
    hour >= NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.END_HOUR
  ) {
    return false;
  }

  // Проверка выходных дней (если отключены)
  if (
    !NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.WEEKEND_ENABLED &&
    (dayOfWeek === 0 || dayOfWeek === 6)
  ) {
    return false;
  }

  // Проверка праздников (если отключены)
  if (
    !NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.HOLIDAYS_ENABLED &&
    isHoliday(date)
  ) {
    return false;
  }

  return true;
};

/**
 * Проверка, является ли дата праздником
 * @param {Date} date - Дата для проверки
 * @returns {boolean} Является ли дата праздником
 */
const isHoliday = (date) => {
  // Здесь должна быть логика проверки праздников
  // Можно использовать внешнюю библиотеку или API
  // Для простоты вернем false
  return false;
};

/**
 * Получение следующего допустимого времени для отправки уведомления
 * @param {Date} currentDate - Текущая дата и время
 * @returns {Date} Следующее допустимое время
 */
export const getNextValidTime = (currentDate) => {
  const nextDate = new Date(currentDate);
  const hour = nextDate.getHours();

  // Если текущее время меньше времени начала, устанавливаем время начала
  if (hour < NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.START_HOUR) {
    nextDate.setHours(
      NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.START_HOUR,
      0,
      0,
      0
    );
    return nextDate;
  }

  // Если текущее время больше времени окончания, переходим на следующий день
  if (hour >= NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.END_HOUR) {
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(
      NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.START_HOUR,
      0,
      0,
      0
    );
  }

  // Проверяем, не выпадает ли следующее время на выходные
  const dayOfWeek = nextDate.getDay();
  if (
    !NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.WEEKEND_ENABLED &&
    (dayOfWeek === 0 || dayOfWeek === 6)
  ) {
    // Если сегодня суббота, переходим на понедельник
    if (dayOfWeek === 6) {
      nextDate.setDate(nextDate.getDate() + 2);
    }
    // Если сегодня воскресенье, переходим на понедельник
    else if (dayOfWeek === 0) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    nextDate.setHours(
      NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.START_HOUR,
      0,
      0,
      0
    );
  }

  // Проверяем, не выпадает ли следующее время на праздники
  if (
    !NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.HOLIDAYS_ENABLED &&
    isHoliday(nextDate)
  ) {
    // Ищем ближайший непраздничный день
    let daysToAdd = 1;
    let testDate = new Date(nextDate);
    while (isHoliday(testDate)) {
      testDate.setDate(testDate.getDate() + 1);
      daysToAdd++;
    }
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(
      NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.START_HOUR,
      0,
      0,
      0
    );
  }

  return nextDate;
};

/**
 * Проверка, не превышено ли количество уведомлений в день для заемщика
 * @param {string} borrowerId - ID заемщика
 * @param {Date} date - Дата для проверки
 * @returns {Promise<boolean>} Не превышено ли количество уведомлений
 */
export const checkDailyNotificationLimit = async (borrowerId, date) => {
  // Здесь должен быть запрос к базе данных для проверки количества уведомлений
  // Для простоты вернем true
  return true;
};
