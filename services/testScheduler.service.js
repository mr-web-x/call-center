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

/**
 * Функция для создания тестовых задач уведомлений с минутными интервалами
 * @param {Object} plan - План уведомлений
 * @returns {Promise<Array>} Массив созданных записей уведомлений
 */
export const scheduleTestNotifications = async (plan) => {
  const createdRecords = [];
  const now = new Date();

  // Каналы связи для тестирования
  const channels = [
    NOTIFICATION_STRATEGY.CHANNELS.SMS,
    NOTIFICATION_STRATEGY.CHANNELS.EMAIL,
    NOTIFICATION_STRATEGY.CHANNELS.PUSH,
    NOTIFICATION_STRATEGY.CHANNELS.AI_CALL,
  ];

  // Создаем уведомления для каждого канала с интервалом в 1 минуту
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const scheduledDate = new Date(now.getTime() + (i + 1) * 60000); // +1, +2, +3, +4 минуты

    // Выбираем шаблон сообщения (используем превентивный шаблон)
    const messageTemplate =
      MESSAGE_TEMPLATES.PREVENTIVE["-1"]?.[channel] ||
      MESSAGE_TEMPLATES.PREVENTIVE["-2"]?.[channel] ||
      "Тестовое уведомление для {{creditNumber}}";

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
      day: -i, // Просто для отличия, не имеет особого значения
      channel,
      messageTemplate: "TEST_" + channel,
      messageContent,
      scheduledFor: scheduledDate,
      status: NOTIFICATION_STATUSES.SCHEDULED,
    });

    try {
      const savedRecord = await record.save();

      // Планируем задачу в соответствующей очереди
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
          delay: delay > 0 ? delay : 1000,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      // Обновляем запись с ID задачи
      savedRecord.jobId = job.id;
      await savedRecord.save();

      createdRecords.push(savedRecord);
      console.log(
        `Scheduled test ${channel} notification for credit ${plan.creditId} at ${scheduledDate}`
      );
    } catch (error) {
      console.error(`Error scheduling test notification:`, error);
    }
  }

  return createdRecords;
};
