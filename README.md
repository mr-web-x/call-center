Сервис планирования уведомлений для P2P платформы
Микросервис для планирования и отправки уведомлений заемщикам о предстоящих и просроченных платежах по кредитам согласно стратегии управления просроченной задолженностью.

Функциональность
Планирование уведомлений на основе стратегии взыскания
Отправка уведомлений через различные каналы коммуникации (SMS, Email, Push, AI-звонки)
Мониторинг статуса кредитов
Сбор статистики по отправленным уведомлениям
Технический стек
Node.js: v16+
Express.js: для REST API
MongoDB: для хранения данных
Redis: для работы с очередями
Bull: для планирования и управления задачами
Предварительные требования
Node.js v16 или выше
MongoDB
Redis
Установка
Клонировать репозиторий:
bash
git clone https://your-repository-url.git
cd notification-scheduler-service
Установить зависимости:
bash
npm install
Создать файл .env на основе шаблона .env.example:
bash
cp .env.example .env
Настроить переменные окружения в файле .env:
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/notification-scheduler
REDIS_URL=redis://127.0.0.1:6379
MAIN_SERVICE_URL=http://localhost:3000
API_SECRET_KEY=your-secure-key
Запуск
Режим разработки
bash
npm run dev
Режим production
bash
npm start
Структура проекта
notification-scheduler-service/
├── config/ # Конфигурационные файлы
│ ├── bull.js # Настройка Bull
│ └── logger.js # Настройка логирования
│
├── controllers/ # Контроллеры
│ ├── notificationPlan.controller.js
│ └── statistics.controller.js
│
├── middlewares/ # Middleware
│ ├── auth.middleware.js
│ ├── error.middleware.js
│ └── validation.middleware.js
│
├── models/ # Модели данных
│ ├── notificationPlan.model.js
│ └── notificationRecord.model.js
│
├── routes/ # Маршруты API
│ ├── notificationPlans.routes.js
│ └── statistics.routes.js
│
├── services/ # Сервисы
│ ├── api.service.js
│ ├── notification.service.js
│ ├── scheduler.service.js
│ ├── template.service.js
│ └── time.service.js
│
├── workers/ # Обработчики очередей
│ └── notificationWorkers.js
│
├── .env # Переменные окружения
├── .gitignore
├── app.js # Главный файл приложения
├── constants.js # Константы
├── package.json
└── README.md
API Endpoints
Управление планами уведомлений
GET /api/notification-plans - Получение всех планов уведомлений
GET /api/notification-plans/:creditId - Получение плана по ID кредита
POST /api/notification-plans - Создание нового плана
PUT /api/notification-plans/:creditId - Обновление плана
DELETE /api/notification-plans/:creditId - Отмена плана
GET /api/notification-plans/:creditId/notifications - Получение уведомлений для кредита
POST /api/notification-plans/:creditId/send-test - Отправка тестового уведомления
Статистика
GET /api/statistics - Общая статистика
GET /api/statistics/credit/:creditId - Статистика по кредиту
GET /api/statistics/borrower/:borrowerId - Статистика по заемщику
GET /api/statistics/channels - Статистика по каналам коммуникации
GET /api/statistics/stages - Статистика по этапам стратегии
GET /api/statistics/period - Статистика за период
Аутентификация
Все запросы к API должны содержать заголовок x-api-key с API-ключом, указанным в переменных окружения.

Мониторинг
Логи сохраняются в директории logs/:

logs/all.log - все логи
logs/error.log - только ошибки
Работа с очередями
Для управления очередями используется Bull + Redis. Сервис автоматически создает следующие очереди:

sms-notifications - очередь SMS-уведомлений
email-notifications - очередь Email-уведомлений
push-notifications - очередь Push-уведомлений
ai-call-notifications - очередь AI-звонков
credit-status-check - очередь проверки статуса кредита
Стратегия уведомлений
Сервис реализует следующие фазы стратегии управления просроченной задолженностью:

Превентивная фаза (до наступления срока платежа): -5, -3, -2, -1, 0 дней
Фаза ранней просрочки (1-7 дней)
Фаза средней просрочки (8-15 дней)
Фаза поздней просрочки (16-30 дней)
Правовые аспекты
Сервис соблюдает ограничения по времени отправки уведомлений:

Не отправляет уведомления в ночное время (22:00-8:00)
Не отправляет более 3 уведомлений в день одному заемщику
Соблюдает законодательство ЕС и Словакии о защите персональных данных
Лицензия
MIT
