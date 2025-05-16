/**
 * workers/notificationWorkers.js
 * Обработчики задач для очередей уведомлений
 */

import {
  smsQueue,
  emailQueue,
  pushQueue,
  aiCallQueue,
  statusCheckQueue,
} from "../config/bull.js";
import { sendNotification } from "../services/notification.service.js";
import { checkCreditStatus } from "../services/scheduler.service.js";
import { NotificationRecord } from "../models/notificationRecord.model.js";
import { NotificationPlan } from "../models/notificationPlan.model.js";
import { CREDIT_STATUS_CHECK } from "../constants.js";

/**
 * Обработчик задачи для отправки SMS
 */
smsQueue.process(async (job) => {
  console.log(`Processing SMS job ${job.id} for record ${job.data.recordId}`);

  try {
    // Вызываем сервис отправки уведомлений
    const result = await sendNotification(job.data.recordId);
    return result;
  } catch (error) {
    console.error(`Error processing SMS job ${job.id}:`, error);
    throw error;
  }
});

/**
 * Обработчик задачи для отправки Email
 */
emailQueue.process(async (job) => {
  console.log(`Processing Email job ${job.id} for record ${job.data.recordId}`);

  try {
    // Вызываем сервис отправки уведомлений
    const result = await sendNotification(job.data.recordId);
    return result;
  } catch (error) {
    console.error(`Error processing Email job ${job.id}:`, error);
    throw error;
  }
});

/**
 * Обработчик задачи для отправки Push-уведомлений
 */
pushQueue.process(async (job) => {
  console.log(`Processing Push job ${job.id} for record ${job.data.recordId}`);

  try {
    // Вызываем сервис отправки уведомлений
    const result = await sendNotification(job.data.recordId);
    return result;
  } catch (error) {
    console.error(`Error processing Push job ${job.id}:`, error);
    throw error;
  }
});

/**
 * Обработчик задачи для отправки AI-звонков
 */
aiCallQueue.process(async (job) => {
  console.log(
    `Processing AI-Call job ${job.id} for record ${job.data.recordId}`
  );

  try {
    // Вызываем сервис отправки уведомлений
    const result = await sendNotification(job.data.recordId);
    return result;
  } catch (error) {
    console.error(`Error processing AI-Call job ${job.id}:`, error);
    throw error;
  }
});

/**
 * Обработчик задачи для проверки статуса кредита
 */
statusCheckQueue.process(async (job) => {
  console.log(`Processing status check job ${job.id}`);

  try {
    // Получаем пакет кредитов для проверки
    const plans = await NotificationPlan.find({
      status: "active",
      lastCheckDate: {
        $lt: new Date(Date.now() - CREDIT_STATUS_CHECK.CHECK_INTERVAL),
      },
    })
      .limit(CREDIT_STATUS_CHECK.BATCH_SIZE)
      .sort({ lastCheckDate: 1 });

    console.log(`Found ${plans.length} plans to check`);

    // Проверяем статус каждого кредита
    const results = [];

    for (const plan of plans) {
      try {
        const result = await checkCreditStatus(plan.creditId);
        results.push(result);
      } catch (error) {
        console.error(
          `Error checking credit status for ${plan.creditId}:`,
          error
        );
        results.push({
          creditId: plan.creditId,
          status: "error",
          error: error.message,
        });
      }
    }

    return {
      checked: plans.length,
      results,
    };
  } catch (error) {
    console.error(`Error processing status check job ${job.id}:`, error);
    throw error;
  }
});

/**
 * Настройка повторяющейся проверки статусов кредитов
 */
export const setupRecurringChecks = async () => {
  try {
    // Удаляем все повторяющиеся задачи
    const repeatedJobs = await statusCheckQueue.getRepeatableJobs();

    for (const job of repeatedJobs) {
      await statusCheckQueue.removeRepeatableByKey(job.key);
    }

    // Создаем новую повторяющуюся задачу
    await statusCheckQueue.add(
      { type: "recurring-check" },
      {
        repeat: {
          every: CREDIT_STATUS_CHECK.CHECK_INTERVAL,
        },
        removeOnComplete: true,
      }
    );

    console.log("Recurring status check job set up successfully");
  } catch (error) {
    console.error("Error setting up recurring status checks:", error);
    throw error;
  }
};

/**
 * Настройка обработчиков событий для очередей
 */
const setupQueueListeners = (queue) => {
  queue.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed in queue ${queue.name}`);
  });

  queue.on("failed", (job, error) => {
    console.error(`Job ${job.id} failed in queue ${queue.name}:`, error);

    // Если задача связана с отправкой уведомления, обновляем статус в базе данных
    if (job.data.recordId) {
      NotificationRecord.findByIdAndUpdate(job.data.recordId, {
        status: "failed",
        metadata: {
          error: error.message,
          failedAt: new Date(),
          attempts: job.attemptsMade,
        },
      }).catch((updateError) => {
        console.error(
          `Error updating notification record ${job.data.recordId}:`,
          updateError
        );
      });
    }
  });

  queue.on("error", (error) => {
    console.error(`Error in queue ${queue.name}:`, error);
  });
};

// Применяем обработчики событий ко всем очередям
setupQueueListeners(smsQueue);
setupQueueListeners(emailQueue);
setupQueueListeners(pushQueue);
setupQueueListeners(aiCallQueue);
setupQueueListeners(statusCheckQueue);

// Запускаем периодическую проверку статусов кредитов при запуске приложения
setupRecurringChecks().catch((error) => {
  console.error("Failed to set up recurring checks:", error);
});

export { smsQueue, emailQueue, pushQueue, aiCallQueue, statusCheckQueue };
