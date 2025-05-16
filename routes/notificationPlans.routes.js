/**
 * routes/notificationPlans.routes.js
 * Маршруты API для управления планами уведомлений
 */

import express from "express";
import * as NotificationPlanController from "../controllers/notificationPlan.controller.js";
import { validateApiKey } from "../middlewares/auth.middleware.js";
import { validateNotificationPlan } from "../middlewares/validation.middleware.js";

const router = express.Router();

// Применяем middleware проверки API ключа ко всем маршрутам
router.use(validateApiKey);

// Получение всех планов уведомлений
router.get("/", NotificationPlanController.getAllPlans);

// Получение плана уведомлений по ID кредита
router.get("/:creditId", NotificationPlanController.getPlanByCreditId);

// Создание нового плана уведомлений
router.post(
  "/",
  validateNotificationPlan,
  NotificationPlanController.createPlan
);

// Обновление плана уведомлений
router.put(
  "/:creditId",
  validateNotificationPlan,
  NotificationPlanController.updatePlan
);

// Отмена плана уведомлений
router.delete("/:creditId", NotificationPlanController.cancelPlan);

// Получение запланированных уведомлений для кредита
router.get(
  "/:creditId/notifications",
  NotificationPlanController.getPlanNotifications
);

// Ручная отправка уведомления (для тестирования)
router.post(
  "/:creditId/send-test",
  NotificationPlanController.sendTestNotification
);

export default router;
