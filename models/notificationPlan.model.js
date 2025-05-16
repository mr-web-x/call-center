/**
 * models/notificationPlan.model.js
 * Модель плана уведомлений
 */

import { model, Schema } from "mongoose";
import { CREDIT_STATUSES } from "../constants.js";

// Схема для плана уведомлений
const notificationPlanSchema = new Schema(
  {
    creditId: {
      type: String,
      required: true,
      index: true,
    },
    borrowerId: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "EUR",
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    creditStatus: {
      type: String,
      enum: Object.values(CREDIT_STATUSES),
      default: CREDIT_STATUSES.ACTIVE,
    },
    lastCheckDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для оптимизации запросов
notificationPlanSchema.index({ creditId: 1, status: 1 });
notificationPlanSchema.index({ dueDate: 1, status: 1 });

export const NotificationPlan = model(
  "notification-plan",
  notificationPlanSchema
);
