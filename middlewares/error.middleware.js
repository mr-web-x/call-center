/**
 * middlewares/error.middleware.js
 * Middleware для обработки ошибок
 */

import { API_ERROR_CODES, ERROR_MESSAGES } from "../constants.js";

/**
 * Middleware для обработки несуществующих маршрутов (404)
 */
export const notFoundHandler = (req, res, next) => {
  res.status(API_ERROR_CODES.NOT_FOUND).json({
    success: false,
    error: "API endpoint not found",
  });
};

/**
 * Middleware для обработки всех ошибок
 */
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Определяем тип ошибки и статус код
  let statusCode = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";

  // Mongoose ошибки валидации
  if (err.name === "ValidationError") {
    statusCode = API_ERROR_CODES.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongoose ошибка дублирования
  else if (err.code === 11000) {
    statusCode = API_ERROR_CODES.BAD_REQUEST;
    message = "Duplicate field value entered";
  }

  // Mongoose ошибка ObjectId
  else if (err.name === "CastError") {
    statusCode = API_ERROR_CODES.BAD_REQUEST;
    message = "Invalid ID format";
  }

  // Ошибка Bull
  else if (err.name === "BullError") {
    statusCode = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
    message = ERROR_MESSAGES.BULL_QUEUE_ERROR;
  }

  // Проверяем, есть ли в ошибке своя информация о статусе и сообщении
  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  if (err.message) {
    message = err.message;
  }

  // Ошибки Redis
  if (err.name === "RedisError") {
    statusCode = API_ERROR_CODES.SERVICE_UNAVAILABLE;
    message = ERROR_MESSAGES.REDIS_CONNECTION_ERROR;
  }

  // Отправляем ответ с ошибкой
  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

/**
 * Middleware для ограничения запросов (rate limiting)
 */
export const rateLimit = (req, res, next) => {
  // Простая реализация ограничения запросов
  // В реальном приложении используйте библиотеку express-rate-limit
  next();
};
