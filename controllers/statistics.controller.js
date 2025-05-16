/**
 * controllers/statistics.controller.js
 * Контроллер для получения статистики уведомлений
 */

import { NotificationPlan } from "../models/notificationPlan.model.js";
import { NotificationRecord } from "../models/notificationRecord.model.js";
import {
  ERROR_MESSAGES,
  API_ERROR_CODES,
  NOTIFICATION_STRATEGY,
} from "../constants.js";

/**
 * Получение общей статистики по уведомлениям
 */
export const getOverallStatistics = async (req, res, next) => {
  try {
    // Общее количество активных планов
    const activePlans = await NotificationPlan.countDocuments({
      status: "active",
    });

    // Общее количество уведомлений по статусам
    const notificationsByStatus = await NotificationRecord.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Общее количество уведомлений по каналам
    const notificationsByChannel = await NotificationRecord.aggregate([
      {
        $group: {
          _id: "$channel",
          count: { $sum: 1 },
        },
      },
    ]);

    // Общее количество уведомлений по этапам
    const notificationsByStage = await NotificationRecord.aggregate([
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
        },
      },
    ]);

    // Статистика за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const notificationsLast30Days = await NotificationRecord.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        activePlans,
        notificationsByStatus: notificationsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsByChannel: notificationsByChannel.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsByStage: notificationsByStage.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsLast30Days,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение статистики по конкретному кредиту
 */
export const getCreditStatistics = async (req, res, next) => {
  try {
    const { creditId } = req.params;

    // Проверяем существование плана
    const plan = await NotificationPlan.findOne({ creditId });

    if (!plan) {
      return res.status(API_ERROR_CODES.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.NOTIFICATION_PLAN_NOT_FOUND,
      });
    }

    // Статистика по статусам
    const notificationsByStatus = await NotificationRecord.aggregate([
      {
        $match: { creditId },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Статистика по каналам
    const notificationsByChannel = await NotificationRecord.aggregate([
      {
        $match: { creditId },
      },
      {
        $group: {
          _id: "$channel",
          count: { $sum: 1 },
        },
      },
    ]);

    // Статистика по этапам
    const notificationsByStage = await NotificationRecord.aggregate([
      {
        $match: { creditId },
      },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
        },
      },
    ]);

    // Хронология уведомлений
    const notificationsTimeline = await NotificationRecord.find({ creditId })
      .sort({ scheduledFor: 1 })
      .select("channel stage day status scheduledFor sentAt");

    res.status(200).json({
      success: true,
      data: {
        plan,
        notificationsByStatus: notificationsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsByChannel: notificationsByChannel.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsByStage: notificationsByStage.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsTimeline,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение статистики по заемщику
 */
export const getBorrowerStatistics = async (req, res, next) => {
  try {
    const { borrowerId } = req.params;

    // Проверяем наличие планов для данного заемщика
    const plans = await NotificationPlan.find({ borrowerId });

    if (plans.length === 0) {
      return res.status(API_ERROR_CODES.NOT_FOUND).json({
        success: false,
        error: "No notification plans found for this borrower",
      });
    }

    // Получаем ID всех кредитов данного заемщика
    const creditIds = plans.map((plan) => plan.creditId);

    // Статистика по статусам
    const notificationsByStatus = await NotificationRecord.aggregate([
      {
        $match: { creditId: { $in: creditIds } },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Статистика по каналам
    const notificationsByChannel = await NotificationRecord.aggregate([
      {
        $match: { creditId: { $in: creditIds } },
      },
      {
        $group: {
          _id: "$channel",
          count: { $sum: 1 },
        },
      },
    ]);

    // Статистика по этапам
    const notificationsByStage = await NotificationRecord.aggregate([
      {
        $match: { creditId: { $in: creditIds } },
      },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
        },
      },
    ]);

    // Статистика по кредитам
    const notificationsByCredit = await NotificationRecord.aggregate([
      {
        $match: { creditId: { $in: creditIds } },
      },
      {
        $group: {
          _id: "$creditId",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        borrowerId,
        plansCount: plans.length,
        plans,
        notificationsByStatus: notificationsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsByChannel: notificationsByChannel.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsByStage: notificationsByStage.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        notificationsByCredit: notificationsByCredit.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение статистики по каналам коммуникации
 */
export const getChannelStatistics = async (req, res, next) => {
  try {
    const { channel, startDate, endDate } = req.query;

    const match = {};

    if (channel) {
      match.channel = channel;
    }

    if (startDate || endDate) {
      match.scheduledFor = {};
      if (startDate) {
        match.scheduledFor.$gte = new Date(startDate);
      }
      if (endDate) {
        match.scheduledFor.$lte = new Date(endDate);
      }
    }

    // Статистика по каналам
    const channelStats = await NotificationRecord.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$channel",
          total: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [{ $eq: ["$status", "sent"] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
            },
          },
          scheduled: {
            $sum: {
              $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Статистика по времени отправки
    const timeOfDayStats = await NotificationRecord.aggregate([
      {
        $match: {
          ...match,
          status: "sent",
          sentAt: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$sentAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.hour": 1 },
      },
    ]);

    // Статистика по дням недели
    const dayOfWeekStats = await NotificationRecord.aggregate([
      {
        $match: {
          ...match,
          status: "sent",
          sentAt: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: "$sentAt" }, // 1 = воскресенье, 2 = понедельник, ...
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.dayOfWeek": 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        channelStats,
        timeOfDayStats,
        dayOfWeekStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение статистики по этапам стратегии
 */
export const getStageStatistics = async (req, res, next) => {
  try {
    const { stage, startDate, endDate } = req.query;

    const match = {};

    if (stage) {
      match.stage = stage;
    }

    if (startDate || endDate) {
      match.scheduledFor = {};
      if (startDate) {
        match.scheduledFor.$gte = new Date(startDate);
      }
      if (endDate) {
        match.scheduledFor.$lte = new Date(endDate);
      }
    }

    // Статистика по этапам
    const stageStats = await NotificationRecord.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$stage",
          total: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [{ $eq: ["$status", "sent"] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
            },
          },
          scheduled: {
            $sum: {
              $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Статистика по дням каждого этапа
    const dayStats = await NotificationRecord.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: {
            stage: "$stage",
            day: "$day",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.stage": 1,
          "_id.day": 1,
        },
      },
    ]);

    // Статистика по каналам для каждого этапа
    const channelStageStats = await NotificationRecord.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: {
            stage: "$stage",
            channel: "$channel",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.stage": 1,
          "_id.channel": 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stageStats,
        dayStats,
        channelStageStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получение статистики за определенный период
 */
export const getPeriodStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = "day" } = req.query;

    if (!startDate || !endDate) {
      return res.status(API_ERROR_CODES.BAD_REQUEST).json({
        success: false,
        error: "Start date and end date are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Проверяем валидность дат
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(API_ERROR_CODES.BAD_REQUEST).json({
        success: false,
        error: "Invalid date format",
      });
    }

    // Формат группировки
    let dateFormat;
    switch (groupBy) {
      case "day":
        dateFormat = "%Y-%m-%d";
        break;
      case "week":
        dateFormat = "%Y-%U"; // Неделя года
        break;
      case "month":
        dateFormat = "%Y-%m";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }

    // Статистика по созданию планов
    const planCreationStats = await NotificationPlan.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: dateFormat, date: "$createdAt" },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Статистика по отправленным уведомлениям
    const sentNotificationStats = await NotificationRecord.aggregate([
      {
        $match: {
          sentAt: {
            $gte: start,
            $lte: end,
          },
          status: "sent",
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: dateFormat, date: "$sentAt" },
            },
            channel: "$channel",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1, "_id.channel": 1 },
      },
    ]);

    // Группировка данных по датам для более удобного формата
    const sentByDate = {};
    sentNotificationStats.forEach((item) => {
      const { date, channel } = item._id;
      if (!sentByDate[date]) {
        sentByDate[date] = {};
      }
      sentByDate[date][channel] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        planCreationStats,
        sentNotificationStats: Object.keys(sentByDate).map((date) => ({
          date,
          ...sentByDate[date],
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
