/**
 * routes/statistics.routes.js
 * Маршруты API для статистики уведомлений
 */

import express from "express";
import * as StatisticsController from "../controllers/statistics.controller.js";
import { validateApiKey } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Применяем middleware проверки API ключа ко всем маршрутам
router.use(validateApiKey);

// Получение общей статистики по уведомлениям
router.get("/", StatisticsController.getOverallStatistics);

// Получение статистики по конкретному кредиту
router.get("/credit/:creditId", StatisticsController.getCreditStatistics);

// Получение статистики по заемщику
router.get("/borrower/:borrowerId", StatisticsController.getBorrowerStatistics);

// Получение статистики по каналам коммуникации
router.get("/channels", StatisticsController.getChannelStatistics);

// Получение статистики по этапам стратегии
router.get("/stages", StatisticsController.getStageStatistics);

// Получение статистики за определенный период
router.get("/period", StatisticsController.getPeriodStatistics);

export default router;
