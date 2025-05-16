/**
 * services/scheduler.service.js
 * Сервис для планирования уведомлений
 */

import { NotificationRecord } from "../models/notificationRecord.model.js";
import { NotificationPlan } from "../models/notificationPlan.model.js";
import {
  NOTIFICATION_STRATEGY,
  MESSAGE_TEMPLATES,
  NOTIFICATION_STATUSES,
} from "../constants.js";
import {
  smsQueue,
  emailQueue,
  pushQueue,
  aiCallQueue,
} from "../config/bull.js";
import { formatMessage } from "./template.service.js";

/**
 * Функция для создания задач уведомлений по плану
 * @param {Object} plan - План уведомлений
 * @returns {Promise<Array>} Массив созданных записей уведомлений
 */
export const scheduleNotifications = async (plan) => {
  const createdRecords = [];

  // Получаем дату погашения
  const dueDate = new Date(plan.dueDate);
  const now = new Date();

  // Планируем уведомления для каждой фазы
  await schedulePreventivePhase(plan, dueDate, now, createdRecords);
  await scheduleEarlyDelayPhase(plan, dueDate, now, createdRecords);
  await scheduleMediumDelayPhase(plan, dueDate, now, createdRecords);
  await scheduleLateDelayPhase(plan, dueDate, now, createdRecords);

  return createdRecords;
};

/**
 * Планирование превентивной фазы (до наступления срока платежа)
 * @param {Object} plan - План уведомлений
 * @param {Date} dueDate - Дата погашения
 * @param {Date} now - Текущая дата
 * @param {Array} createdRecords - Массив для накопления созданных записей
 */
const schedulePreventivePhase = async (plan, dueDate, now, createdRecords) => {
  const days = NOTIFICATION_STRATEGY.DAYS.PREVENTIVE;

  for (const day of days) {
    // Рассчитываем дату отправки уведомления
    const scheduledDate = new Date(dueDate);
    scheduledDate.setDate(scheduledDate.getDate() + day);

    // Пропускаем прошедшие даты
    if (scheduledDate < now) continue;

    // Получаем каналы для этого дня
    const channels = NOTIFICATION_STRATEGY.PREVENTIVE_PHASE_CHANNELS[day];

    if (!channels) continue;

    // Создаем уведомления для каждого канала
    for (const channel of channels) {
      // Получаем шаблон сообщения
      const messageTemplate = MESSAGE_TEMPLATES.PREVENTIVE[day]?.[channel];

      if (!messageTemplate) continue;

      // Форматируем сообщение с данными кредита
      const messageContent = formatMessage(messageTemplate, {
        creditNumber: plan.creditId,
        amount: plan.amount,
        currency: plan.currency,
      });

      // Создаем запись уведомления
      const record = new NotificationRecord({
        planId: plan._id,
        creditId: plan.creditId,
        borrowerId: plan.borrowerId,
        stage: NOTIFICATION_STRATEGY.PHASES.PREVENTIVE,
        day,
        channel,
        messageTemplate: "PREVENTIVE_" + day,
        messageContent,
        scheduledFor: scheduledDate,
        status: NOTIFICATION_STATUSES.SCHEDULED,
      });

      const savedRecord = await record.save();
      createdRecords.push(savedRecord);

      // Планируем задачу в соответствующей очереди
      await scheduleNotificationTask(savedRecord, channel);
    }
  }
};

/**
 * Планирование фазы ранней просрочки (1-7 дней)
 * @param {Object} plan - План уведомлений
 * @param {Date} dueDate - Дата погашения
 * @param {Date} now - Текущая дата
 * @param {Array} createdRecords - Массив для накопления созданных записей
 */
const scheduleEarlyDelayPhase = async (plan, dueDate, now, createdRecords) => {
  const days = NOTIFICATION_STRATEGY.DAYS.EARLY_DELAY;

  for (const day of days) {
    // Рассчитываем дату отправки уведомления
    const scheduledDate = new Date(dueDate);
    scheduledDate.setDate(scheduledDate.getDate() + day);

    // Пропускаем прошедшие даты
    if (scheduledDate < now) continue;

    // Получаем каналы для этого дня
    const channels = NOTIFICATION_STRATEGY.EARLY_DELAY_PHASE_CHANNELS[day];

    if (!channels) continue;

    // Создаем уведомления для каждого канала
    for (const channel of channels) {
      // Получаем шаблон сообщения
      const messageTemplate = MESSAGE_TEMPLATES.EARLY_DELAY[day]?.[channel];

      if (!messageTemplate) continue;

      // Форматируем сообщение с данными кредита
      const messageContent = formatMessage(messageTemplate, {
        creditNumber: plan.creditId,
        amount: plan.amount,
        currency: plan.currency,
      });

      // Создаем запись уведомления
      const record = new NotificationRecord({
        planId: plan._id,
        creditId: plan.creditId,
        borrowerId: plan.borrowerId,
        stage: NOTIFICATION_STRATEGY.PHASES.EARLY_DELAY,
        day,
        channel,
        messageTemplate: "EARLY_DELAY_" + day,
        messageContent,
        scheduledFor: scheduledDate,
        status: NOTIFICATION_STATUSES.SCHEDULED,
      });

      const savedRecord = await record.save();
      createdRecords.push(savedRecord);

      // Планируем задачу в соответствующей очереди
      await scheduleNotificationTask(savedRecord, channel);
    }
  }
};

/**
 * Планирование фазы средней просрочки (8-15 дней)
 * @param {Object} plan - План уведомлений
 * @param {Date} dueDate - Дата погашения
 * @param {Date} now - Текущая дата
 * @param {Array} createdRecords - Массив для накопления созданных записей
 */
const scheduleMediumDelayPhase = async (plan, dueDate, now, createdRecords) => {
  const days = NOTIFICATION_STRATEGY.DAYS.MEDIUM_DELAY;

  for (const day of days) {
    // Рассчитываем дату отправки уведомления
    const scheduledDate = new Date(dueDate);
    scheduledDate.setDate(scheduledDate.getDate() + day);

    // Пропускаем прошедшие даты
    if (scheduledDate < now) continue;

    // Получаем каналы для этого дня
    const channels = NOTIFICATION_STRATEGY.MEDIUM_DELAY_PHASE_CHANNELS[day];

    if (!channels) continue;

    // Создаем уведомления для каждого канала
    for (const channel of channels) {
      // Получаем шаблон сообщения
      const messageTemplate = MESSAGE_TEMPLATES.MEDIUM_DELAY[day]?.[channel];

      if (!messageTemplate) continue;

      // Форматируем сообщение с данными кредита
      const messageContent = formatMessage(messageTemplate, {
        creditNumber: plan.creditId,
        amount: plan.amount,
        currency: plan.currency,
      });

      // Создаем запись уведомления
      const record = new NotificationRecord({
        planId: plan._id,
        creditId: plan.creditId,
        borrowerId: plan.borrowerId,
        stage: NOTIFICATION_STRATEGY.PHASES.MEDIUM_DELAY,
        day,
        channel,
        messageTemplate: "MEDIUM_DELAY_" + day,
        messageContent,
        scheduledFor: scheduledDate,
        status: NOTIFICATION_STATUSES.SCHEDULED,
      });

      const savedRecord = await record.save();
      createdRecords.push(savedRecord);

      // Планируем задачу в соответствующей очереди
      await scheduleNotificationTask(savedRecord, channel);
    }
  }
};

/**
 * Планирование фазы поздней просрочки (16-30 дней)
 * @param {Object} plan - План уведомлений
 * @param {Date} dueDate - Дата погашения
 * @param {Date} now - Текущая дата
 * @param {Array} createdRecords - Массив для накопления созданных записей
 */
const scheduleLateDelayPhase = async (plan, dueDate, now, createdRecords) => {
  const days = NOTIFICATION_STRATEGY.DAYS.LATE_DELAY;

  for (const day of days) {
    // Рассчитываем дату отправки уведомления
    const scheduledDate = new Date(dueDate);
    scheduledDate.setDate(scheduledDate.getDate() + day);

    // Пропускаем прошедшие даты
    if (scheduledDate < now) continue;

    // Получаем каналы для этого дня
    const channels = NOTIFICATION_STRATEGY.LATE_DELAY_PHASE_CHANNELS[day];

    if (!channels) continue;

    // Создаем уведомления для каждого канала
    for (const channel of channels) {
      // Получаем шаблон сообщения
      const messageTemplate = MESSAGE_TEMPLATES.LATE_DELAY[day]?.[channel];

      if (!messageTemplate) continue;

      // Форматируем сообщение с данными кредита
      const messageContent = formatMessage(messageTemplate, {
        creditNumber: plan.creditId,
        amount: plan.amount,
        currency: plan.currency,
        remainingDays: 30 - day, // Для отсчета дней до аукциона
        auctionDate: getAuctionDate(dueDate), // Дата аукциона (dueDate + 30 дней)
        companyName: "Collection Agency Ltd.", // Заглушка для названия компании
      });

      // Создаем запись уведомления
      const record = new NotificationRecord({
        planId: plan._id,
        creditId: plan.creditId,
        borrowerId: plan.borrowerId,
        stage: NOTIFICATION_STRATEGY.PHASES.LATE_DELAY,
        day,
        channel,
        messageTemplate: "LATE_DELAY_" + day,
        messageContent,
        scheduledFor: scheduledDate,
        status: NOTIFICATION_STATUSES.SCHEDULED,
      });

      const savedRecord = await record.save();
      createdRecords.push(savedRecord);

      // Планируем задачу в соответствующей очереди
      await scheduleNotificationTask(savedRecord, channel);
    }
  }
};

/**
 * Планирование задачи в соответствующей очереди Bull
 * @param {Object} record - Запись уведомления
 * @param {string} channel - Канал коммуникации
 * @returns {Promise<Object>} Созданная задача
 */
const scheduleNotificationTask = async (record, channel) => {
  // Определяем нужную очередь в зависимости от канала
  let queue;
  switch (channel) {
    case NOTIFICATION_STRATEGY.CHANNELS.SMS:
      queue = smsQueue;
      break;
    case NOTIFICATION_STRATEGY.CHANNELS.EMAIL:
      queue = emailQueue;
      break;
    case NOTIFICATION_STRATEGY.CHANNELS.PUSH:
      queue = pushQueue;
      break;
    case NOTIFICATION_STRATEGY.CHANNELS.AI_CALL:
      queue = aiCallQueue;
      break;
    default:
      throw new Error(`Unknown notification channel: ${channel}`);
  }

  // Рассчитываем задержку до отправки
  const delay = record.scheduledFor.getTime() - Date.now();

  // Если задержка отрицательная (дата в прошлом), устанавливаем минимальную задержку
  const actualDelay = delay > 0 ? delay : 1000;

  // Создаем задачу в очереди
  const job = await queue.add(
    {
      recordId: record._id.toString(),
      creditId: record.creditId,
      borrowerId: record.borrowerId,
      content: record.messageContent,
    },
    {
      delay: actualDelay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60000, // 1 минута
      },
      removeOnComplete: true,
    }
  );

  // Обновляем запись с ID задачи
  await NotificationRecord.findByIdAndUpdate(record._id, {
    jobId: job.id,
  });

  return job;
};

/**
 * Получение даты аукциона (для фазы поздней просрочки)
 * @param {Date} dueDate - Дата погашения
 * @returns {string} Дата аукциона в формате YYYY-MM-DD
 */
const getAuctionDate = (dueDate) => {
  const auctionDate = new Date(dueDate);
  auctionDate.setDate(auctionDate.getDate() + 30);
  return auctionDate.toISOString().split("T")[0]; // Формат YYYY-MM-DD
};

/**
 * Отмена запланированных уведомлений для кредита
 * @param {string} creditId - ID кредита
 * @returns {Promise<Object>} Результат отмены
 */
export const cancelScheduledNotifications = async (creditId) => {
  // Получаем все запланированные уведомления для кредита
  const records = await NotificationRecord.find({
    creditId,
    status: NOTIFICATION_STATUSES.SCHEDULED,
  });

  // Отменяем каждое уведомление
  const cancelResults = [];

  for (const record of records) {
    try {
      // Определяем очередь в зависимости от канала
      let queue;
      switch (record.channel) {
        case NOTIFICATION_STRATEGY.CHANNELS.SMS:
          queue = smsQueue;
          break;
        case NOTIFICATION_STRATEGY.CHANNELS.EMAIL:
          queue = emailQueue;
          break;
        case NOTIFICATION_STRATEGY.CHANNELS.PUSH:
          queue = pushQueue;
          break;
        case NOTIFICATION_STRATEGY.CHANNELS.AI_CALL:
          queue = aiCallQueue;
          break;
        default:
          throw new Error(`Unknown notification channel: ${record.channel}`);
      }

      // Если есть ID задачи, отменяем задачу в очереди
      if (record.jobId) {
        await queue.removeJobs(record.jobId);
      }

      // Обновляем статус в базе данных
      await NotificationRecord.findByIdAndUpdate(record._id, {
        status: NOTIFICATION_STATUSES.CANCELLED,
      });

      cancelResults.push({
        recordId: record._id,
        status: "cancelled",
        success: true,
      });
    } catch (error) {
      console.error(`Error cancelling notification ${record._id}:`, error);

      cancelResults.push({
        recordId: record._id,
        status: "error",
        success: false,
        error: error.message,
      });
    }
  }

  return {
    totalCancelled: cancelResults.filter((r) => r.success).length,
    totalFailed: cancelResults.filter((r) => !r.success).length,
    details: cancelResults,
  };
};

/**
 * Перепланирование задачи в очереди
 * @param {string} recordId - ID записи уведомления
 * @param {Date} newDate - Новая дата отправки
 * @returns {Promise<Object>} Обновленная задача
 */
export const rescheduleBullJob = async (recordId, newDate) => {
  // Получаем запись уведомления
  const record = await NotificationRecord.findById(recordId);

  if (!record) {
    throw new Error(`Notification record not found: ${recordId}`);
  }

  // Если у записи есть старая задача, удаляем ее
  if (record.jobId) {
    let queue;
    switch (record.channel) {
      case NOTIFICATION_STRATEGY.CHANNELS.SMS:
        queue = smsQueue;
        break;
      case NOTIFICATION_STRATEGY.CHANNELS.EMAIL:
        queue = emailQueue;
        break;
      case NOTIFICATION_STRATEGY.CHANNELS.PUSH:
        queue = pushQueue;
        break;
      case NOTIFICATION_STRATEGY.CHANNELS.AI_CALL:
        queue = aiCallQueue;
        break;
      default:
        throw new Error(`Unknown notification channel: ${record.channel}`);
    }

    try {
      await queue.removeJobs(record.jobId);
    } catch (error) {
      console.warn(`Could not remove old job ${record.jobId}:`, error);
    }
  }

  // Создаем новую задачу
  return await scheduleNotificationTask(record, record.channel);
};

/**
 * Проверка и обновление статуса кредита
 * @param {string} creditId - ID кредита
 * @returns {Promise<Object>} Обновленный статус
 */
export const checkCreditStatus = async (creditId) => {
  // Здесь должен быть запрос к основному сервису для получения статуса кредита
  // Пример имитации
  const newStatus = await fetchCreditStatus(creditId);

  // Обновляем план уведомлений
  await NotificationPlan.findOneAndUpdate(
    { creditId },
    {
      creditStatus: newStatus,
      lastCheckDate: new Date(),
    }
  );

  // Если кредит закрыт или отменен, отменяем все запланированные уведомления
  if (newStatus === "closed" || newStatus === "cancelled") {
    await cancelScheduledNotifications(creditId);
  }

  return { creditId, status: newStatus };
};

/**
 * Получение статуса кредита из основного сервиса
 * @param {string} creditId - ID кредита
 * @returns {Promise<string>} Статус кредита
 */
const fetchCreditStatus = async (creditId) => {
  // Здесь должен быть HTTP-запрос к основному сервису
  // Имитация
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Для имитации - 80% кредитов активны, 15% просрочены, 5% закрыты
  const rand = Math.random();
  if (rand < 0.8) {
    return "active";
  } else if (rand < 0.95) {
    return "overdue";
  } else {
    return "closed";
  }
};

/**
 * Создание задач для периодической проверки статусов кредитов
 * @returns {Promise<void>}
 */
export const setupCreditStatusChecks = async () => {
  // Периодическая проверка статусов кредитов
  // ...
  // Реализация будет добавлена в контексте настройки периодических задач
};
