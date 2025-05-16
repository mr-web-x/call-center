/**
 * controllers/notificationPlan.controller.js
 * Контроллер для управления планами уведомлений
 */

import { NotificationPlan } from "../models/notificationPlan.model.js";
import { NotificationRecord } from "../models/notificationRecord.model.js";
import { ERROR_MESSAGES, API_ERROR_CODES } from "../constants.js";
import { scheduleNotifications } from "../services/scheduler.service.js";
import { sendNotification } from "../services/notification.service.js";

/**
 * Получение всех планов уведомлений
 */
export const getAllPlans = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const plans = await NotificationPlan.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await NotificationPlan.countDocuments(query);

    res.status(200).json({
      success: true,
      data: plans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение плана уведомлений по ID кредита
 */
export const getPlanByCreditId = async (req, res, next) => {
  try {
    const { creditId } = req.params;

    const plan = await NotificationPlan.findOne({ creditId });

    if (!plan) {
      return res.status(API_ERROR_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.NOTIFICATION_PLAN_NOT_FOUND,
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Создание нового плана уведомлений
 */
export const createPlan = async (req, res, next) => {
  try {
    const { creditId, borrowerId, dueDate, amount, currency } = req.body;

    // Проверяем, существует ли уже план для данного кредита
    const existingPlan = await NotificationPlan.findOne({ creditId });

    if (existingPlan) {
      return res.status(API_ERROR_CODES.BAD_REQUEST).json({
        success: false,
        error: "Notification plan for this credit already exists",
      });
    }

    // Создаем новый план уведомлений
    const newPlan = new NotificationPlan({
      creditId,
      borrowerId,
      dueDate: new Date(dueDate),
      amount,
      currency: currency || "EUR",
      status: "active",
    });

    const savedPlan = await newPlan.save();

    // Планируем уведомления на основе стратегии
    const scheduledNotifications = await scheduleNotifications(savedPlan);

    res.status(201).json({
      success: true,
      data: {
        plan: savedPlan,
        scheduledNotifications: scheduledNotifications.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Обновление плана уведомлений
 */
export const updatePlan = async (req, res, next) => {
  try {
    const { creditId } = req.params;
    const updateData = req.body;

    // Находим план для обновления
    const plan = await NotificationPlan.findOne({ creditId });

    if (!plan) {
      return res.status(API_ERROR_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.NOTIFICATION_PLAN_NOT_FOUND,
      });
    }

    // Если меняется дата погашения, отменяем все запланированные уведомления
    if (
      updateData.dueDate &&
      new Date(updateData.dueDate).getTime() !==
        new Date(plan.dueDate).getTime()
    ) {
      // Отмена всех запланированных уведомлений
      await NotificationRecord.updateMany(
        { planId: plan._id, status: "scheduled" },
        { status: "cancelled" }
      );

      // Обновляем план
      plan.dueDate = new Date(updateData.dueDate);
      if (updateData.amount) plan.amount = updateData.amount;
      if (updateData.currency) plan.currency = updateData.currency;
      if (updateData.status) plan.status = updateData.status;

      const updatedPlan = await plan.save();

      // Перепланируем уведомления
      const scheduledNotifications = await scheduleNotifications(updatedPlan);

      return res.status(200).json({
        success: true,
        data: {
          plan: updatedPlan,
          scheduledNotifications: scheduledNotifications.length,
        },
      });
    }

    // Если дата не меняется, просто обновляем другие поля
    if (updateData.amount) plan.amount = updateData.amount;
    if (updateData.currency) plan.currency = updateData.currency;
    if (updateData.status) plan.status = updateData.status;

    const updatedPlan = await plan.save();

    res.status(200).json({
      success: true,
      data: updatedPlan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Отмена плана уведомлений
 */
export const cancelPlan = async (req, res, next) => {
  try {
    const { creditId } = req.params;

    // Находим план для отмены
    const plan = await NotificationPlan.findOne({ creditId });

    if (!plan) {
      return res.status(API_ERROR_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.NOTIFICATION_PLAN_NOT_FOUND,
      });
    }

    // Отменяем план
    plan.status = "cancelled";
    await plan.save();

    // Отменяем все запланированные уведомления
    await NotificationRecord.updateMany(
      { planId: plan._id, status: "scheduled" },
      { status: "cancelled" }
    );

    res.status(200).json({
      success: true,
      message: "Notification plan cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение запланированных уведомлений для кредита
 */
export const getPlanNotifications = async (req, res, next) => {
  try {
    const { creditId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Находим план
    const plan = await NotificationPlan.findOne({ creditId });

    if (!plan) {
      return res.status(API_ERROR_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.NOTIFICATION_PLAN_NOT_FOUND,
      });
    }

    const query = { creditId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const notifications = await NotificationRecord.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ scheduledFor: 1 });

    const total = await NotificationRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Отправка тестового уведомления (для отладки)
 */
export const sendTestNotification = async (req, res, next) => {
  try {
    const { creditId } = req.params;
    const { channel, messageType } = req.body;

    if (!channel || !messageType) {
      return res.status(API_ERROR_CODES.BAD_REQUEST).json({
        success: false,
        error: "Channel and messageType are required",
      });
    }

    // Находим план
    const plan = await NotificationPlan.findOne({ creditId });

    if (!plan) {
      return res.status(API_ERROR_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.NOTIFICATION_PLAN_NOT_FOUND,
      });
    }

    // Создаем тестовую запись
    const testRecord = new NotificationRecord({
      planId: plan._id,
      creditId,
      borrowerId: plan.borrowerId,
      stage: "test",
      day: 0,
      channel,
      messageTemplate: messageType,
      messageContent: `Test notification: ${messageType} via ${channel}`,
      scheduledFor: new Date(),
      status: "scheduled",
    });

    await testRecord.save();

    // Отправляем уведомление
    const result = await sendNotification(testRecord);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
