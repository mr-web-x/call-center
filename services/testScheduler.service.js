/**
 * services/testScheduler.service.js
 * Сервис для тестирования сценариев отправки уведомлений с минутными интервалами
 */

import { NotificationRecord } from "../models/notificationRecord.model.js";
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
import logger from "../config/logger.js";

/**
 * Получение всех сценариев уведомлений из MESSAGE_TEMPLATES
 * @returns {Array} Массив сценариев уведомлений
 */
const getAllNotificationScenarios = () => {
  const scenarios = [];

  // Обрабатываем превентивную фазу
  Object.entries(MESSAGE_TEMPLATES.PREVENTIVE).forEach(([day, channels]) => {
    Object.entries(channels).forEach(([channel, messageTemplate]) => {
      scenarios.push({
        phase: NOTIFICATION_STRATEGY.PHASES.PREVENTIVE,
        day: parseInt(day),
        channel,
        messageTemplate,
      });
    });
  });

  // Обрабатываем фазу ранней просрочки
  Object.entries(MESSAGE_TEMPLATES.EARLY_DELAY).forEach(([day, channels]) => {
    Object.entries(channels).forEach(([channel, messageTemplate]) => {
      scenarios.push({
        phase: NOTIFICATION_STRATEGY.PHASES.EARLY_DELAY,
        day: parseInt(day),
        channel,
        messageTemplate,
      });
    });
  });

  // Обрабатываем фазу средней просрочки
  Object.entries(MESSAGE_TEMPLATES.MEDIUM_DELAY).forEach(([day, channels]) => {
    Object.entries(channels).forEach(([channel, messageTemplate]) => {
      scenarios.push({
        phase: NOTIFICATION_STRATEGY.PHASES.MEDIUM_DELAY,
        day: parseInt(day),
        channel,
        messageTemplate,
      });
    });
  });

  // Обрабатываем фазу поздней просрочки
  Object.entries(MESSAGE_TEMPLATES.LATE_DELAY).forEach(([day, channels]) => {
    Object.entries(channels).forEach(([channel, messageTemplate]) => {
      scenarios.push({
        phase: NOTIFICATION_STRATEGY.PHASES.LATE_DELAY,
        day: parseInt(day),
        channel,
        messageTemplate,
      });
    });
  });

  return scenarios;
};

/**
 * Функция для создания тестовых задач уведомлений с минутными интервалами
 * на основе всех сценариев из MESSAGE_TEMPLATES
 * @param {Object} plan - План уведомлений
 * @param {Object} options - Дополнительные параметры
 * @param {number} options.minuteInterval - Интервал между уведомлениями в минутах (по умолчанию 1)
 * @param {string} options.phase - Фаза для фильтрации сценариев (если нужно тестировать только одну фазу)
 * @param {Array} options.channels - Массив каналов для фильтрации сценариев (если нужно тестировать только определенные каналы)
 * @returns {Promise<Array>} Массив созданных записей уведомлений
 */
export const scheduleTestNotifications = async (plan, options = {}) => {
  const createdRecords = [];
  const now = new Date();

  const { minuteInterval = 1, phase = null, channels = null } = options;

  // Получаем все сценарии уведомлений
  let scenarios = getAllNotificationScenarios();

  // Фильтруем сценарии по фазе, если она указана
  if (phase) {
    scenarios = scenarios.filter((scenario) => scenario.phase === phase);
  }

  // Фильтруем сценарии по каналам, если они указаны
  if (channels && Array.isArray(channels) && channels.length > 0) {
    scenarios = scenarios.filter((scenario) =>
      channels.includes(scenario.channel)
    );
  }

  // Сортируем сценарии по фазе и дню для более последовательной отправки
  scenarios.sort((a, b) => {
    // Порядок фаз: preventive, early_delay, medium_delay, late_delay
    const phases = [
      NOTIFICATION_STRATEGY.PHASES.PREVENTIVE,
      NOTIFICATION_STRATEGY.PHASES.EARLY_DELAY,
      NOTIFICATION_STRATEGY.PHASES.MEDIUM_DELAY,
      NOTIFICATION_STRATEGY.PHASES.LATE_DELAY,
    ];

    const phaseOrderA = phases.indexOf(a.phase);
    const phaseOrderB = phases.indexOf(b.phase);

    if (phaseOrderA !== phaseOrderB) {
      return phaseOrderA - phaseOrderB;
    }

    // Если фазы одинаковые, сортируем по дню
    return a.day - b.day;
  });

  logger.info(
    `Scheduling ${scenarios.length} test notifications with ${minuteInterval} minute interval`
  );

  // Создаем уведомления для каждого сценария с заданным интервалом
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const scheduledDate = new Date(
      now.getTime() + (i + 1) * (minuteInterval * 60000)
    );

    // Данные для шаблона сообщения
    const templateData = {
      creditNumber: plan.creditId,
      amount: plan.amount,
      currency: plan.currency,
      remainingDays: 30 - (scenario.day > 0 ? scenario.day : 0),
      auctionDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // через 30 дней
      companyName: "Collection Agency Ltd.", // Заглушка для названия компании
    };

    // Форматируем сообщение с данными кредита
    const messageContent = formatMessage(
      scenario.messageTemplate,
      templateData
    );

    // Создаем запись уведомления
    const record = new NotificationRecord({
      planId: plan._id,
      creditId: plan.creditId,
      borrowerId: plan.borrowerId,
      stage: scenario.phase,
      day: scenario.day,
      channel: scenario.channel,
      messageTemplate: `${scenario.phase.toUpperCase()}_${scenario.day}`,
      messageContent,
      scheduledFor: scheduledDate,
      status: NOTIFICATION_STATUSES.SCHEDULED,
    });

    try {
      const savedRecord = await record.save();

      // Определяем, какую очередь использовать для данного канала
      let queue;
      switch (scenario.channel) {
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
          throw new Error(`Unknown notification channel: ${scenario.channel}`);
      }

      // Создаем задачу с минутной задержкой
      const jobId = `test-${savedRecord._id.toString()}`;
      const delay = scheduledDate.getTime() - Date.now();

      const job = await queue.add(
        {
          recordId: savedRecord._id.toString(),
          creditId: plan.creditId,
          borrowerId: plan.borrowerId,
          content: savedRecord.messageContent,
        },
        {
          jobId,
          delay: delay > 0 ? delay : 1000, // минимальная задержка 1 секунда
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      // Обновляем запись с ID задачи
      savedRecord.jobId = job.id;
      await savedRecord.save();

      createdRecords.push(savedRecord);
      logger.info(
        `Scheduled test ${scenario.channel} notification for phase ${
          scenario.phase
        }, day ${scenario.day} at ${scheduledDate.toISOString()}`
      );
    } catch (error) {
      logger.error(`Error scheduling test notification:`, error);
    }
  }

  return createdRecords;
};

/**
 * Функция для создания тестовых задач уведомлений для конкретной фазы
 * @param {Object} plan - План уведомлений
 * @param {string} phase - Фаза для тестирования
 * @param {number} minuteInterval - Интервал между уведомлениями в минутах
 * @returns {Promise<Array>} Массив созданных записей уведомлений
 */
export const schedulePhaseTestNotifications = async (
  plan,
  phase,
  minuteInterval = 1
) => {
  return scheduleTestNotifications(plan, { phase, minuteInterval });
};

/**
 * Функция для создания тестовых задач уведомлений для конкретных каналов
 * @param {Object} plan - План уведомлений
 * @param {Array} channels - Массив каналов для тестирования
 * @param {number} minuteInterval - Интервал между уведомлениями в минутах
 * @returns {Promise<Array>} Массив созданных записей уведомлений
 */
export const scheduleChannelTestNotifications = async (
  plan,
  channels,
  minuteInterval = 1
) => {
  return scheduleTestNotifications(plan, { channels, minuteInterval });
};
