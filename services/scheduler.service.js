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
  CREDIT_STATUSES,
} from "../constants.js";
import {
  smsQueue,
  emailQueue,
  pushQueue,
  aiCallQueue,
  statusCheckQueue,
} from "../config/bull.js";
import { formatMessage } from "./template.service.js";
import logger from "../config/logger.js";
import { fetchCreditStatus } from "./api.service.js";

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

  logger.info(
    `Scheduled ${createdRecords.length} notifications for credit ${plan.creditId}`
  );

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

      try {
        const savedRecord = await record.save();

        // Планируем задачу в соответствующей очереди
        const job = await scheduleNotificationTask(savedRecord, channel);

        // Обновляем запись с ID задачи
        savedRecord.jobId = job.id;
        await savedRecord.save();

        createdRecords.push(savedRecord);
        logger.debug(
          `Scheduled ${channel} notification for credit ${plan.creditId}, day ${day} at ${scheduledDate}`
        );
      } catch (error) {
        logger.error(
          `Error scheduling notification for credit ${plan.creditId}, day ${day}, channel ${channel}:`,
          error
        );
        // Продолжаем с другими каналами даже при ошибке с одним
      }
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

      try {
        const savedRecord = await record.save();

        // Планируем задачу в соответствующей очереди
        const job = await scheduleNotificationTask(savedRecord, channel);

        // Обновляем запись с ID задачи
        savedRecord.jobId = job.id;
        await savedRecord.save();

        createdRecords.push(savedRecord);
        logger.debug(
          `Scheduled ${channel} notification for credit ${plan.creditId}, day ${day} at ${scheduledDate}`
        );
      } catch (error) {
        logger.error(
          `Error scheduling notification for credit ${plan.creditId}, day ${day}, channel ${channel}:`,
          error
        );
      }
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

      try {
        const savedRecord = await record.save();

        // Планируем задачу в соответствующей очереди
        const job = await scheduleNotificationTask(savedRecord, channel);

        // Обновляем запись с ID задачи
        savedRecord.jobId = job.id;
        await savedRecord.save();

        createdRecords.push(savedRecord);
        logger.debug(
          `Scheduled ${channel} notification for credit ${plan.creditId}, day ${day} at ${scheduledDate}`
        );
      } catch (error) {
        logger.error(
          `Error scheduling notification for credit ${plan.creditId}, day ${day}, channel ${channel}:`,
          error
        );
      }
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

      // Получаем дату аукциона (dueDate + 30 дней)
      const auctionDate = getAuctionDate(dueDate);

      // Форматируем сообщение с данными кредита
      const messageContent = formatMessage(messageTemplate, {
        creditNumber: plan.creditId,
        amount: plan.amount,
        currency: plan.currency,
        remainingDays: 30 - day, // Для отсчета дней до аукциона
        auctionDate: auctionDate,
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

      try {
        const savedRecord = await record.save();

        // Планируем задачу в соответствующей очереди
        const job = await scheduleNotificationTask(savedRecord, channel);

        // Обновляем запись с ID задачи
        savedRecord.jobId = job.id;
        await savedRecord.save();

        createdRecords.push(savedRecord);
        logger.debug(
          `Scheduled ${channel} notification for credit ${plan.creditId}, day ${day} at ${scheduledDate}`
        );
      } catch (error) {
        logger.error(
          `Error scheduling notification for credit ${plan.creditId}, day ${day}, channel ${channel}:`,
          error
        );
      }
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

  // Создаем уникальный идентификатор задачи для предотвращения дублирования
  const jobId = `${record._id.toString()}-${record.scheduledFor.getTime()}`;

  // Рассчитываем задержку до отправки
  const delay = record.scheduledFor.getTime() - Date.now();

  // Если задержка отрицательная (дата в прошлом), устанавливаем минимальную задержку
  const actualDelay = delay > 0 ? delay : 1000;

  // Проверяем, существует ли уже задача с таким ID
  const existingJob = await queue.getJob(jobId);

  if (existingJob) {
    // Если задача уже существует, возвращаем ее
    logger.debug(`Job ${jobId} already exists for record ${record._id}`);
    return existingJob;
  }

  // Создаем задачу в очереди с конкретным ID
  const job = await queue.add(
    {
      recordId: record._id.toString(),
      creditId: record.creditId,
      borrowerId: record.borrowerId,
      content: record.messageContent,
    },
    {
      jobId: jobId,
      delay: actualDelay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60000, // 1 минута
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  logger.debug(
    `Created job ${job.id} for record ${record._id}, scheduled at ${record.scheduledFor}`
  );

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

  // Проверяем валидность новой даты
  if (!(newDate instanceof Date) || isNaN(newDate.getTime())) {
    throw new Error(`Invalid date provided for rescheduling: ${newDate}`);
  }

  logger.info(
    `Rescheduling notification ${recordId} from ${record.scheduledFor} to ${newDate}`
  );

  // Начало транзакции (MongoDB не поддерживает настоящие транзакции в некоторых случаях,
  // поэтому используем последовательные операции с обработкой ошибок)
  try {
    // Сначала обновляем запись в БД
    const updatedRecord = await NotificationRecord.findByIdAndUpdate(
      recordId,
      {
        scheduledFor: newDate,
        status: NOTIFICATION_STATUSES.SCHEDULED,
      },
      { new: true }
    );

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
        const job = await queue.getJob(record.jobId);
        if (job) {
          await job.remove();
          logger.debug(
            `Removed old job ${record.jobId} for record ${recordId}`
          );
        }
      } catch (error) {
        logger.warn(
          `Could not remove old job ${record.jobId} for record ${recordId}:`,
          error
        );
        // Продолжаем, даже если не удалось удалить старую задачу
      }
    }

    // Создаем новую задачу с обновленной датой
    const job = await scheduleNotificationTask(
      updatedRecord,
      updatedRecord.channel
    );

    // Обновляем запись с новым ID задачи
    await NotificationRecord.findByIdAndUpdate(
      recordId,
      { jobId: job.id },
      { new: true }
    );

    logger.info(
      `Successfully rescheduled notification ${recordId} to ${newDate}, new job ID: ${job.id}`
    );

    return job;
  } catch (error) {
    logger.error(
      `Error rescheduling notification ${recordId} to ${newDate}:`,
      error
    );

    // Восстанавливаем исходное состояние записи при ошибке
    await NotificationRecord.findByIdAndUpdate(
      recordId,
      {
        scheduledFor: record.scheduledFor,
        status: record.status,
      },
      { new: true }
    );

    throw error;
  }
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

  logger.info(
    `Cancelling ${records.length} scheduled notifications for credit ${creditId}`
  );

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
        const job = await queue.getJob(record.jobId);
        if (job) {
          await job.remove();
          logger.debug(
            `Removed old job ${record.jobId} for record ${recordId}`
          );
        }
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

      logger.debug(
        `Cancelled notification ${record._id} for credit ${creditId}`
      );
    } catch (error) {
      logger.error(
        `Error cancelling notification ${record._id} for credit ${creditId}:`,
        error
      );

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
 * Проверка и обновление статуса кредита
 * @param {string} creditId - ID кредита
 * @returns {Promise<Object>} Обновленный статус
 */
export const checkCreditStatus = async (creditId) => {
  try {
    logger.info(`Checking status for credit ${creditId}`);

    // Получаем актуальный статус кредита из API основного сервиса
    const newStatus = await fetchCreditStatus(creditId);

    // Обновляем план уведомлений с новым статусом
    const plan = await NotificationPlan.findOneAndUpdate(
      { creditId },
      {
        creditStatus: newStatus,
        lastCheckDate: new Date(),
      },
      { new: true }
    );

    if (!plan) {
      logger.warn(`No notification plan found for credit ${creditId}`);
      return { creditId, status: newStatus, updated: false };
    }

    // Если кредит закрыт, отменен или реструктуризирован, отменяем все запланированные уведомления
    if (
      newStatus === CREDIT_STATUSES.CLOSED ||
      newStatus === CREDIT_STATUSES.CANCELLED ||
      newStatus === CREDIT_STATUSES.RESTRUCTURED
    ) {
      logger.info(
        `Credit ${creditId} status changed to ${newStatus}, cancelling all notifications`
      );

      const cancelResult = await cancelScheduledNotifications(creditId);

      return {
        creditId,
        status: newStatus,
        updated: true,
        notificationsCancelled: cancelResult.totalCancelled,
      };
    }

    return { creditId, status: newStatus, updated: true };
  } catch (error) {
    logger.error(`Error checking status for credit ${creditId}:`, error);
    throw error;
  }
};

/**
 * Создание задач для периодической проверки статусов кредитов
 * @returns {Promise<void>}
 */
export const setupCreditStatusChecks = async () => {
  try {
    // Создаем повторяющуюся задачу для проверки статусов кредитов
    const job = await statusCheckQueue.add(
      { type: "periodic-check" },
      {
        repeat: {
          cron: "0 */1 * * *", // Каждый час
        },
        jobId: "periodic-credit-status-check",
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info(`Set up periodic credit status checks, job ID: ${job.id}`);
  } catch (error) {
    logger.error("Error setting up credit status checks:", error);
    throw error;
  }
};
