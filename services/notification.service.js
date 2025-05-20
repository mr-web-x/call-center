/**
 * services/notification.service.js
 * Сервис для отправки уведомлений
 */
import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
import { NotificationRecord } from "../models/notificationRecord.model.js";
import {
  NOTIFICATION_STRATEGY,
  NOTIFICATION_STATUSES,
  EMAIL_TEMPLATE_MAP,
} from "../constants.js";
import {
  isValidTime,
  getNextValidTime,
  checkDailyNotificationLimit,
} from "./time.service.js";
import { fetchCredit } from "./api.service.js";
dotenv.config();

/**
 * Отправка SMS уведомления
 * @param {Object} notification - Объект уведомления
 * @returns {Promise<Object>} Результат отправки
 */
const sendSMS = async (notification) => {
  try {
    // Здесь будет код для интеграции с SMS-провайдером
    console.log(`[SMS] Отправка сообщения: ${notification.messageContent}`);

    // Имитация отправки (в реальном сервисе здесь будет API SMS-провайдера)
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      provider: "SMS-Provider",
      messageId: `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  } catch (error) {
    console.error("SMS sending error:", error);
    throw error;
  }
};

/**
 * Отправка Email уведомления
 * @param {Object} notification - Объект уведомления
 * @returns {Promise<Object>} Результат отправки
 */
const sendEmail = async ({
  email,
  code,
  idNumber,
  type,
  companyName,
  authLink,
  notification,
}) => {
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.EMAIL_PROVIDER_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const templateId = EMAIL_TEMPLATE_MAP[type]?.[companyName];

    if (!templateId) {
      throw new Error(
        `Не найден templateId для type: ${type}, companyName: ${companyName}`
      );
    }

    const sendSmtpEmailParams = {};

    if (idNumber) sendSmtpEmailParams.idNumber = idNumber;
    if (code) sendSmtpEmailParams.code = code;
    if (authLink) sendSmtpEmailParams.authLink = authLink;
    if (notification)
      sendSmtpEmailParams.notification = notification.messageContent;

    const sendSmtpEmail = {
      to: [{ email }],
      templateId: templateId,
      params: sendSmtpEmailParams,
    };

    // Здесь будет код для интеграции с Email-провайдером
    console.log(
      `[Email] Отправка сообщения c параметрами: ${JSON.stringify(
        sendSmtpEmailParams,
        null,
        2
      )}`
    );

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[Email] Email успешно отправлен!`);

    return {
      success: true,
      provider: "Email-Provider",
      messageId: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  } catch (error) {
    console.error("[Email] Email sending error:", error);
    throw error;
  }
};

/**
 * Отправка Push уведомления
 * @param {Object} notification - Объект уведомления
 * @returns {Promise<Object>} Результат отправки
 */
const sendPush = async (notification) => {
  try {
    // Здесь будет код для интеграции с Push-провайдером
    console.log(`[Push] Отправка сообщения: ${notification.messageContent}`);

    // Имитация отправки (в реальном сервисе здесь будет API Push-провайдера)
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      provider: "Push-Provider",
      messageId: `push-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  } catch (error) {
    console.error("Push sending error:", error);
    throw error;
  }
};

/**
 * Отправка AI-звонка
 * @param {Object} notification - Объект уведомления
 * @returns {Promise<Object>} Результат отправки
 */
const sendAICall = async (notification) => {
  try {
    // Здесь будет код для интеграции с сервисом AI-звонков
    console.log(`[AI-Call] Отправка сообщения: ${notification.messageContent}`);

    // Имитация отправки (в реальном сервисе здесь будет API сервиса звонков)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      provider: "AI-Call-Provider",
      messageId: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  } catch (error) {
    console.error("AI Call error:", error);
    throw error;
  }
};

/**
 * Обработчик для отправки уведомления
 * Эта функция вызывается из обработчиков очередей Bull
 * @param {string} recordId - ID записи уведомления
 * @returns {Promise<Object>} Результат отправки
 */
export const sendNotification = async (recordId) => {
  // Получаем запись уведомления из базы данных
  const record = await NotificationRecord.findById(recordId);

  if (!record) {
    throw new Error(`Notification record not found: ${recordId}`);
  }

  // Если уведомление уже отправлено или отменено, игнорируем
  if (record.status !== NOTIFICATION_STATUSES.SCHEDULED) {
    console.log(
      `Notification ${recordId} status is ${record.status}, skipping`
    );
    return { success: false, reason: `Status is ${record.status}` };
  }

  // Проверяем временные ограничения (не в ночное время, не в выходные и т.д.)
  // if (!isValidTime(new Date())) {
  //   console.log(`Invalid time for notification ${recordId}, rescheduling`);

  //   // Получаем следующее допустимое время
  //   const nextValidTime = getNextValidTime(new Date());

  //   // Обновляем запись уведомления в базе данных
  //   await NotificationRecord.findByIdAndUpdate(record._id, {
  //     scheduledFor: nextValidTime,
  //   });

  //   // Перепланируем задачу в очереди (эта функция должна быть реализована в scheduler.service.js)
  //    await rescheduleBullJob(record._id, nextValidTime);

  //   return {
  //     success: false,
  //     reason: "Invalid time, rescheduled",
  //     nextAttempt: nextValidTime,
  //   };
  // }

  // Проверяем ограничение по количеству уведомлений в день
  const isWithinLimit = await checkDailyNotificationLimit(
    record.borrowerId,
    new Date()
  );

  if (!isWithinLimit) {
    console.log(
      `Daily notification limit exceeded for borrower ${record.borrowerId}`
    );

    // Получаем следующее допустимое время (обычно на следующий день)
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(
      NOTIFICATION_STRATEGY.TIME_CONSTRAINTS.START_HOUR,
      0,
      0,
      0
    );

    // Обновляем запись уведомления в базе данных
    await NotificationRecord.findByIdAndUpdate(record._id, {
      scheduledFor: nextDay,
    });

    // Перепланируем задачу в очереди
    await rescheduleBullJob(record._id, nextDay);

    return {
      success: false,
      reason: "Daily notification limit exceeded",
      nextAttempt: nextDay,
    };
  }

  try {
    let result;

    const creditInfo = await fetchCredit(record.creditId);

    console.log("[creditInfo]", JSON.stringify(creditInfo, null, 2));

    const { kontakteUdaje, companyName } = creditInfo?.borrower || {};

    // Отправляем уведомление в зависимости от канала
    switch (record.channel) {
      case NOTIFICATION_STRATEGY.CHANNELS.SMS:
        result = await sendSMS(record);
        break;
      case NOTIFICATION_STRATEGY.CHANNELS.EMAIL:
        result = await sendEmail({
          email: kontakteUdaje?.email,
          type: "notification",
          companyName,
          notification: record.messageContent,
        });
        break;
      case NOTIFICATION_STRATEGY.CHANNELS.PUSH:
        result = await sendPush(record);
        break;
      case NOTIFICATION_STRATEGY.CHANNELS.AI_CALL:
        result = await sendAICall(record);
        break;
      default:
        throw new Error(`Unknown notification channel: ${record.channel}`);
    }

    // Обновляем запись уведомления в базе данных
    await NotificationRecord.findByIdAndUpdate(record._id, {
      status: NOTIFICATION_STATUSES.SENT,
      sentAt: new Date(),
      metadata: {
        ...record.metadata,
        providerResponse: result,
      },
    });

    console.log(
      `Notification ${recordId} sent successfully via ${record.channel}`
    );

    return {
      success: true,
      recordId: record._id.toString(),
      channel: record.channel,
      sentAt: new Date(),
      result,
    };
  } catch (error) {
    console.error(`Error sending notification ${recordId}:`, error);

    // Обновляем запись уведомления в базе данных
    await NotificationRecord.findByIdAndUpdate(record._id, {
      status: NOTIFICATION_STATUSES.FAILED,
      metadata: {
        ...record.metadata,
        error: error.message,
        retryCount: (record.retryCount || 0) + 1,
      },
    });

    // Если количество попыток не превысило максимальное, перепланируем уведомление
    if ((record.retryCount || 0) < 2) {
      // Рассчитываем время следующей попытки (через час)
      const nextRetryTime = new Date();
      nextRetryTime.setHours(nextRetryTime.getHours() + 1);

      // Обновляем запись уведомления в базе данных
      await NotificationRecord.findByIdAndUpdate(record._id, {
        status: NOTIFICATION_STATUSES.SCHEDULED,
        scheduledFor: nextRetryTime,
        retryCount: (record.retryCount || 0) + 1,
      });

      // Перепланируем задачу в очереди
      await rescheduleBullJob(record._id, nextRetryTime);

      return {
        success: false,
        reason: "Error sending notification, rescheduled",
        error: error.message,
        nextAttempt: nextRetryTime,
      };
    }

    throw error;
  }
};

/**
 * Получение контактных данных заемщика
 * @param {string} borrowerId - ID заемщика
 * @returns {Promise<Object>} Контактные данные
 */
export const getBorrowerContacts = async (borrowerId) => {
  // Здесь должен быть запрос к основному сервису для получения контактных данных
  // Можно использовать HTTP-запрос или другой механизм интеграции

  // Для имитации вернем заглушку
  return {
    email: "borrower@example.com",
    phoneNumber: "+421123456789",
    hasApp: true, // Для Push-уведомлений
  };
};
