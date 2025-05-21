/**
 * routes/test.routes.js
 * Маршруты для тестирования сценариев отправки уведомлений
 */

import express from "express";
import { NotificationPlan } from "../models/notificationPlan.model.js";
import {
  scheduleTestNotifications,
  schedulePhaseTestNotifications,
  scheduleChannelTestNotifications,
} from "../services/testScheduler.service.js";
import { NOTIFICATION_STRATEGY } from "../constants.js";

const router = express.Router();

/**
 * @route POST /api/test/quick-test-plan
 * @desc Создание тестового плана уведомлений с минутными интервалами
 */
router.post("/quick-test-plan", async (req, res) => {
  try {
    const { creditId, borrowerId, amount, currency = "EUR" } = req.body;

    // Проверяем наличие обязательных полей
    if (!creditId || !borrowerId || !amount) {
      return res.status(400).json({
        success: false,
        error: "Отсутствуют обязательные поля: creditId, borrowerId, amount",
      });
    }

    // Создаем новый план уведомлений
    const newPlan = new NotificationPlan({
      creditId,
      borrowerId,
      dueDate: new Date(Date.now() + 5 * 60000), // дата платежа через 5 минут
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

/**
 * @route POST /api/test/scenario-test
 * @desc Создание тестового плана уведомлений с указанными параметрами
 */
router.post("/scenario-test", async (req, res) => {
  try {
    const {
      creditId,
      borrowerId,
      amount,
      currency = "EUR",
      minuteInterval = 1,
      phase = null,
      channels = null,
    } = req.body;

    // Проверяем наличие обязательных полей
    if (!creditId || !borrowerId || !amount) {
      return res.status(400).json({
        success: false,
        error: "Отсутствуют обязательные поля: creditId, borrowerId, amount",
      });
    }

    // Проверяем валидность phase, если она указана
    if (phase && !Object.values(NOTIFICATION_STRATEGY.PHASES).includes(phase)) {
      return res.status(400).json({
        success: false,
        error: `Неверная фаза. Допустимые значения: ${Object.values(
          NOTIFICATION_STRATEGY.PHASES
        ).join(", ")}`,
      });
    }

    // Проверяем валидность channels, если они указаны
    if (channels && Array.isArray(channels)) {
      const invalidChannels = channels.filter(
        (ch) => !Object.values(NOTIFICATION_STRATEGY.CHANNELS).includes(ch)
      );
      if (invalidChannels.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Неверные каналы: ${invalidChannels.join(
            ", "
          )}. Допустимые значения: ${Object.values(
            NOTIFICATION_STRATEGY.CHANNELS
          ).join(", ")}`,
        });
      }
    }

    // Создаем новый план уведомлений
    const newPlan = new NotificationPlan({
      creditId,
      borrowerId,
      dueDate: new Date(Date.now() + 5 * 60000), // дата платежа через 5 минут
      amount,
      currency,
      status: "active",
    });

    const savedPlan = await newPlan.save();

    // Планируем тестовые уведомления с заданными параметрами
    const scheduledNotifications = await scheduleTestNotifications(savedPlan, {
      minuteInterval,
      phase,
      channels,
    });

    res.status(201).json({
      success: true,
      data: {
        plan: savedPlan,
        scheduledNotifications: scheduledNotifications.length,
        options: {
          minuteInterval,
          phase: phase || "all phases",
          channels: channels || "all channels",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/test/phase-test
 * @desc Создание тестового плана уведомлений для конкретной фазы
 */
router.post("/phase-test", async (req, res) => {
  try {
    const {
      creditId,
      borrowerId,
      amount,
      currency = "EUR",
      phase,
      minuteInterval = 1,
    } = req.body;

    // Проверяем наличие обязательных полей
    if (!creditId || !borrowerId || !amount || !phase) {
      return res.status(400).json({
        success: false,
        error:
          "Отсутствуют обязательные поля: creditId, borrowerId, amount, phase",
      });
    }

    // Проверяем валидность phase
    if (!Object.values(NOTIFICATION_STRATEGY.PHASES).includes(phase)) {
      return res.status(400).json({
        success: false,
        error: `Неверная фаза. Допустимые значения: ${Object.values(
          NOTIFICATION_STRATEGY.PHASES
        ).join(", ")}`,
      });
    }

    // Создаем новый план уведомлений
    const newPlan = new NotificationPlan({
      creditId,
      borrowerId,
      dueDate: new Date(Date.now() + 5 * 60000), // дата платежа через 5 минут
      amount,
      currency,
      status: "active",
    });

    const savedPlan = await newPlan.save();

    // Планируем тестовые уведомления для указанной фазы
    const scheduledNotifications = await schedulePhaseTestNotifications(
      savedPlan,
      phase,
      minuteInterval
    );

    res.status(201).json({
      success: true,
      data: {
        plan: savedPlan,
        scheduledNotifications: scheduledNotifications.length,
        phase,
        minuteInterval,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/test/channel-test
 * @desc Создание тестового плана уведомлений для конкретных каналов
 */
router.post("/channel-test", async (req, res) => {
  try {
    const {
      creditId,
      borrowerId,
      amount,
      currency = "EUR",
      channels,
      minuteInterval = 1,
    } = req.body;

    // Проверяем наличие обязательных полей
    if (
      !creditId ||
      !borrowerId ||
      !amount ||
      !channels ||
      !Array.isArray(channels) ||
      channels.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Отсутствуют обязательные поля: creditId, borrowerId, amount, channels (массив)",
      });
    }

    // Проверяем валидность channels
    const invalidChannels = channels.filter(
      (ch) => !Object.values(NOTIFICATION_STRATEGY.CHANNELS).includes(ch)
    );
    if (invalidChannels.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Неверные каналы: ${invalidChannels.join(
          ", "
        )}. Допустимые значения: ${Object.values(
          NOTIFICATION_STRATEGY.CHANNELS
        ).join(", ")}`,
      });
    }

    // Создаем новый план уведомлений
    const newPlan = new NotificationPlan({
      creditId,
      borrowerId,
      dueDate: new Date(Date.now() + 5 * 60000), // дата платежа через 5 минут
      amount,
      currency,
      status: "active",
    });

    const savedPlan = await newPlan.save();

    // Планируем тестовые уведомления для указанных каналов
    const scheduledNotifications = await scheduleChannelTestNotifications(
      savedPlan,
      channels,
      minuteInterval
    );

    res.status(201).json({
      success: true,
      data: {
        plan: savedPlan,
        scheduledNotifications: scheduledNotifications.length,
        channels,
        minuteInterval,
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
