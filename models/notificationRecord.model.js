/**
 * models/notificationRecord.model.js
 * Модель записи об отправленных уведомлениях
 */

import { model, Schema } from "mongoose";
import { NOTIFICATION_STATUSES, NOTIFICATION_STRATEGY } from "../constants.js";

// Схема для записи об уведомлении
const notificationRecordSchema = new Schema(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "notification-plan",
      required: true,
      index: true,
    },
    creditId: {
      type: String,
      required: true,
      index: true,
    },
    borrowerId: {
      type: String,
      required: true,
    },
    stage: {
      type: String,
      enum: Object.values(NOTIFICATION_STRATEGY.PHASES),
      required: true,
    },
    day: {
      type: Number,
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(NOTIFICATION_STRATEGY.CHANNELS),
      required: true,
    },
    messageTemplate: {
      type: String,
      required: true,
    },
    messageContent: {
      type: String,
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    sentAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUSES),
      default: NOTIFICATION_STATUSES.SCHEDULED,
    },
    failReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Object,
      default: {},
    },
    jobId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для оптимизации запросов
notificationRecordSchema.index({ scheduledFor: 1, status: 1 });
notificationRecordSchema.index({ creditId: 1, channel: 1, status: 1 });
notificationRecordSchema.index({ borrowerId: 1, scheduledFor: 1 });

export const NotificationRecord = model(
  "notification-record",
  notificationRecordSchema
);
