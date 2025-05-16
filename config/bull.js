import Bull from "bull";
import { BULL_CONFIG } from "../constants.js";

// Создание очередей для разных типов уведомлений
const smsQueue = new Bull(BULL_CONFIG.QUEUES.SMS, BULL_CONFIG.REDIS_URL, {
  defaultJobOptions: BULL_CONFIG.DEFAULT_JOB_OPTIONS,
});

const emailQueue = new Bull(BULL_CONFIG.QUEUES.EMAIL, BULL_CONFIG.REDIS_URL, {
  defaultJobOptions: BULL_CONFIG.DEFAULT_JOB_OPTIONS,
});

const pushQueue = new Bull(BULL_CONFIG.QUEUES.PUSH, BULL_CONFIG.REDIS_URL, {
  defaultJobOptions: BULL_CONFIG.DEFAULT_JOB_OPTIONS,
});

const aiCallQueue = new Bull(
  BULL_CONFIG.QUEUES.AI_CALL,
  BULL_CONFIG.REDIS_URL,
  {
    defaultJobOptions: BULL_CONFIG.DEFAULT_JOB_OPTIONS,
  }
);

const statusCheckQueue = new Bull(
  BULL_CONFIG.QUEUES.STATUS_CHECK,
  BULL_CONFIG.REDIS_URL,
  {
    defaultJobOptions: BULL_CONFIG.DEFAULT_JOB_OPTIONS,
  }
);

// Настройка обработчиков событий для логирования
const setupQueueListeners = (queue) => {
  queue.on("completed", (job) => {
    console.log(`Job ${job.id} completed in queue ${queue.name}`);
  });

  queue.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed in queue ${queue.name}:`, err);
  });

  queue.on("error", (error) => {
    console.error(`Error in queue ${queue.name}:`, error);
  });
};

// Применение слушателей ко всем очередям
setupQueueListeners(smsQueue);
setupQueueListeners(emailQueue);
setupQueueListeners(pushQueue);
setupQueueListeners(aiCallQueue);
setupQueueListeners(statusCheckQueue);

export { smsQueue, emailQueue, pushQueue, aiCallQueue, statusCheckQueue };
