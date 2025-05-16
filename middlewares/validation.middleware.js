/**
 * middlewares/validation.middleware.js
 * Middleware для валидации данных
 */

import Joi from "joi";
import { API_ERROR_CODES } from "../constants.js";

/**
 * Валидация данных плана уведомлений
 */
export const validateNotificationPlan = (req, res, next) => {
  // Схема валидации для создания/обновления плана уведомлений
  const schema = Joi.object({
    creditId: Joi.string().required(),
    borrowerId: Joi.string().required(),
    dueDate: Joi.date().iso().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().default("EUR"),
    status: Joi.string().valid("active", "completed", "cancelled"),
  });

  // При обновлении некоторые поля могут быть необязательными
  const updateSchema = Joi.object({
    dueDate: Joi.date().iso(),
    amount: Joi.number().positive(),
    currency: Joi.string(),
    status: Joi.string().valid("active", "completed", "cancelled"),
  });

  // Проверяем, является ли запрос созданием или обновлением
  const isUpdate = req.method === "PUT";
  const validationSchema = isUpdate ? updateSchema : schema;

  const { error, value } = validationSchema.validate(req.body);

  if (error) {
    return res.status(API_ERROR_CODES.BAD_REQUEST).json({
      success: false,
      error: error.details[0].message,
    });
  }

  // Если всё в порядке, добавляем валидированные данные в req.body
  req.body = value;
  next();
};

/**
 * Валидация параметров запроса статистики
 */
export const validateStatisticsQuery = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    channel: Joi.string(),
    stage: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    groupBy: Joi.string().valid("day", "week", "month").default("day"),
  });

  const { error, value } = schema.validate(req.query);

  if (error) {
    return res.status(API_ERROR_CODES.BAD_REQUEST).json({
      success: false,
      error: error.details[0].message,
    });
  }

  // Если всё в порядке, добавляем валидированные данные в req.query
  req.query = value;
  next();
};

/**
 * Валидация тестового уведомления
 */
export const validateTestNotification = (req, res, next) => {
  const schema = Joi.object({
    channel: Joi.string().valid("sms", "email", "push", "ai_call").required(),
    messageType: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(API_ERROR_CODES.BAD_REQUEST).json({
      success: false,
      error: error.details[0].message,
    });
  }

  // Если всё в порядке, добавляем валидированные данные в req.body
  req.body = value;
  next();
};
