/**
 * app.js
 * Главный файл сервиса планирования уведомлений
 */

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Импорт логгера и middleware для логирования HTTP
import logger, { httpLogger } from "./config/logger.js";

// Загрузка переменных окружения
dotenv.config();

// Импорт конфигурации
import { APP_CONFIG, DB_CONFIG } from "./constants.js";

// Инициализация Express
const app = express();
const server = createServer(app);

// Путь к текущей директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создаем директорию для логов, если ее нет
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Подключение к MongoDB
mongoose
  .connect(DB_CONFIG.URI, DB_CONFIG.OPTIONS)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  });

const allowedUrl = ["https://server.walletroom.online"];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("CORS Origin запроса:", origin); // 👈
    if (!origin || allowedUrl.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Блокирован запрос с origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// Middlewares
app.use(helmet()); // Безопасность
app.use(compression()); // Сжатие ответов
app.options("*", cors(corsOptions)); // ← ОБЯЗАТЕЛЬНО для CORS preflight
app.use(cors(corsOptions));
app.use(express.json()); // Парсинг JSON
app.use(express.urlencoded({ extended: true })); // Парсинг URL-encoded
app.use(httpLogger); // Логирование HTTP-запросов

// Импорт обработчиков очередей
import "./workers/notificationWorkers.js";

// Основной маршрут для проверки работоспособности
app.get("/", (req, res) => {
  res.status(200).json({
    service: APP_CONFIG.SERVICE_NAME,
    version: APP_CONFIG.VERSION,
    status: "running",
  });
});

// Подключение маршрутов API
import notificationPlansRoutes from "./routes/notificationPlans.routes.js";
import statisticsRoutes from "./routes/statistics.routes.js";
import testRoutes from "./routes/test.routes.js";

app.use("/api/notification-plans", notificationPlansRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/test", testRoutes);

// Импорт middleware для обработки ошибок
import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";

// Обработка 404
app.use(notFoundHandler);

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
const PORT = APP_CONFIG.PORT;
server.listen(PORT, () => {
  logger.info(`${APP_CONFIG.SERVICE_NAME} running on port ${PORT}`);
  logger.info(`Environment: ${APP_CONFIG.NODE_ENV}`);
});

export default app;
