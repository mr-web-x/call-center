/**
 * config/logger.js
 * Настройка логирования
 */

import winston from "winston";
import { APP_CONFIG } from "../constants.js";

// Уровни логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Уровень логирования в зависимости от окружения
const level = () => {
  return APP_CONFIG.NODE_ENV === "development" ? "debug" : "info";
};

// Цвета для разных уровней логирования
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Добавляем цвета к уровням Winston
winston.addColors(colors);

// Формат логов
const format = winston.format.combine(
  // Добавляем информацию о времени
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  // Добавляем контекст ошибки если есть
  winston.format.errors({ stack: true }),
  // Добавляем цвета в консоли
  winston.format.colorize({ all: true }),
  // Форматируем вывод
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ""}`
  )
);

// Определяем транспорты для логов
const transports = [
  // Вывод в консоль
  new winston.transports.Console(),

  // Сохранение всех логов в файл
  new winston.transports.File({
    filename: "logs/all.log",
  }),

  // Сохранение логов ошибок в отдельный файл
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
  }),
];

// Создаем экземпляр логгера
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Экспортируем логгер
export default logger;

/**
 * Функция для логирования HTTP-запросов
 * Может использоваться как middleware для Express
 */
export const httpLogger = (req, res, next) => {
  // Логируем начало запроса
  logger.http(`${req.method} ${req.originalUrl} [START]`);

  // Сохраняем время начала запроса
  const start = Date.now();

  // Продолжаем обработку запроса
  res.on("finish", () => {
    // Вычисляем время выполнения запроса
    const duration = Date.now() - start;

    // Логируем результат запроса
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} [${duration}ms]`;

    // Выбираем уровень логирования в зависимости от статуса ответа
    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });

  next();
};

/**
 * Обработчик необработанных исключений
 */
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);

  // Завершаем процесс с ошибкой
  process.exit(1);
});

/**
 * Обработчик необработанных отклонений промисов
 */
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);

  // Завершаем процесс с ошибкой
  process.exit(1);
});
