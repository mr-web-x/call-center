// Создаем новый файл routes/test.routes.js
import express from "express";
import { NotificationPlan } from "../models/notificationPlan.model.js";
import { scheduleTestNotifications } from "../services/testScheduler.service.js";

const router = express.Router();

// Эндпоинт для создания тестового плана уведомлений с минутными интервалами
router.post("/quick-test-plan", async (req, res) => {
  try {
    const { creditId, borrowerId, amount, currency = "EUR" } = req.body;

    // Создаем новый план уведомлений
    const newPlan = new NotificationPlan({
      creditId,
      borrowerId,
      dueDate: new Date(Date.now() + 5 * 60000), // дата платежа через 10 минут
      amount,
      currency,
      status: "active",
    });

    const savedPlan = await newPlan.save();

    // Планируем тестовые уведомления с интервалом в 1 минуту
    const scheduledNotifications = await scheduleTestNotifications(savedPlan);

    res.status(201).json({
      success: true,
      data: {
        plan: savedPlan,
        scheduledNotifications: scheduledNotifications.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
