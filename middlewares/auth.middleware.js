/**
 * middlewares/auth.middleware.js
 * Middleware для аутентификации и авторизации
 */

import { APP_CONFIG, API_ERROR_CODES } from "../constants.js";

/**
 * Проверка API ключа для доступа к API
 */
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(API_ERROR_CODES.UNAUTHORIZED).json({
      success: false,
      error: "API key is required",
    });
  }

  if (apiKey !== APP_CONFIG.API_SECRET_KEY) {
    return res.status(API_ERROR_CODES.FORBIDDEN).json({
      success: false,
      error: "Invalid API key",
    });
  }

  next();
};
