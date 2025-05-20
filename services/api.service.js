/**
 * services/api.service.js
 * Сервис для взаимодействия с основным сервисом
 */

import axios from "axios";
import { APP_CONFIG, ERROR_MESSAGES } from "../constants.js";
import { cryptoData, decryptData } from "../utils/crypto.js";

// Создание экземпляра axios с предустановленными параметрами
const apiClient = axios.create({
  baseURL: APP_CONFIG.MAIN_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": APP_CONFIG.API_SECRET_KEY,
  },
  timeout: 5000, // 5 секунд таймаут
});

/**
 * Получение информации о кредите из основного сервиса
 * @param {string} creditId - ID кредита
 * @returns {Promise<Object>} Данные кредита
 */
export const fetchCreditInfo = async (creditId) => {
  try {
    const response = await apiClient.get(`/api/credits/${creditId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching credit info for ${creditId}:`, error);

    if (error.response) {
      // Ошибка от сервера
      if (error.response.status === 404) {
        throw new Error(ERROR_MESSAGES.CREDIT_NOT_FOUND);
      }
      throw new Error(
        error.response.data.error || "Error fetching credit info"
      );
    } else if (error.request) {
      // Нет ответа от сервера
      throw new Error("No response from main service");
    } else {
      // Другие ошибки
      throw error;
    }
  }
};

/**
 * Получение информации о заемщике из основного сервиса
 * @param {string} borrowerId - ID заемщика
 * @returns {Promise<Object>} Данные заемщика
 */
export const fetchBorrowerInfo = async (borrowerId) => {
  try {
    const response = await apiClient.get(`/api/borrowers/${borrowerId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching borrower info for ${borrowerId}:`, error);

    if (error.response) {
      // Ошибка от сервера
      if (error.response.status === 404) {
        throw new Error(ERROR_MESSAGES.BORROWER_NOT_FOUND);
      }
      throw new Error(
        error.response.data.error || "Error fetching borrower info"
      );
    } else if (error.request) {
      // Нет ответа от сервера
      throw new Error("No response from main service");
    } else {
      // Другие ошибки
      throw error;
    }
  }
};

/**
 * Получение контактных данных заемщика для отправки уведомлений
 * @param {string} borrowerId - ID заемщика
 * @returns {Promise<Object>} Контактные данные
 */
export const fetchBorrowerContacts = async (borrowerId) => {
  try {
    const response = await apiClient.get(
      `/api/borrowers/${borrowerId}/contacts`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching borrower contacts for ${borrowerId}:`, error);

    if (error.response) {
      // Ошибка от сервера
      if (error.response.status === 404) {
        throw new Error(ERROR_MESSAGES.BORROWER_NOT_FOUND);
      }
      throw new Error(
        error.response.data.error || "Error fetching borrower contacts"
      );
    } else if (error.request) {
      // Нет ответа от сервера
      throw new Error("No response from main service");
    } else {
      // Другие ошибки
      throw error;
    }
  }
};

/**
 * Получение статуса кредита из основного сервиса
 * @param {string} creditId - ID кредита
 * @returns {Promise<string>} Статус кредита
 */
export const fetchCredit = async (creditId) => {
  try {
    const readyData = cryptoData({ creditId });

    const response = await apiClient.post(`/credit/api/get-credit`, {
      data: readyData,
    });

    const decryptedData = decryptData(response.data);

    return decryptedData.credit;
  } catch (error) {
    console.error(`Error fetching credit status for ${creditId}:`, error);

    if (error.response) {
      // Ошибка от сервера
      if (error.response.status === 404) {
        throw new Error(ERROR_MESSAGES.CREDIT_NOT_FOUND);
      }
      throw new Error(
        error.response.data.error || "Error fetching credit status"
      );
    } else if (error.request) {
      // Нет ответа от сервера
      throw new Error("No response from main service");
    } else {
      // Другие ошибки
      throw error;
    }
  }
};

/**
 * Обновление статуса уведомления в основном сервисе
 * @param {string} creditId - ID кредита
 * @param {Object} notificationData - Данные о отправленном уведомлении
 * @returns {Promise<Object>} Результат обновления
 */
export const updateNotificationStatus = async (creditId, notificationData) => {
  try {
    const response = await apiClient.post(
      `/api/credits/${creditId}/notifications`,
      notificationData
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating notification status for ${creditId}:`, error);

    if (error.response) {
      // Ошибка от сервера
      throw new Error(
        error.response.data.error || "Error updating notification status"
      );
    } else if (error.request) {
      // Нет ответа от сервера
      throw new Error("No response from main service");
    } else {
      // Другие ошибки
      throw error;
    }
  }
};

/**
 * Получение списка новых кредитов, для которых нужно создать планы уведомлений
 * @returns {Promise<Array>} Список новых кредитов
 */
export const fetchNewCredits = async () => {
  try {
    const response = await apiClient.get("/api/credits/new");
    return response.data;
  } catch (error) {
    console.error("Error fetching new credits:", error);

    if (error.response) {
      // Ошибка от сервера
      throw new Error(
        error.response.data.error || "Error fetching new credits"
      );
    } else if (error.request) {
      // Нет ответа от сервера
      throw new Error("No response from main service");
    } else {
      // Другие ошибки
      throw error;
    }
  }
};

/**
 * Получение списка обновленных кредитов, для которых нужно обновить планы уведомлений
 * @param {Date} lastCheckDate - Дата последней проверки
 * @returns {Promise<Array>} Список обновленных кредитов
 */
export const fetchUpdatedCredits = async (lastCheckDate) => {
  try {
    const response = await apiClient.get("/api/credits/updated", {
      params: {
        lastCheckDate: lastCheckDate.toISOString(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching updated credits:", error);

    if (error.response) {
      // Ошибка от сервера
      throw new Error(
        error.response.data.error || "Error fetching updated credits"
      );
    } else if (error.request) {
      // Нет ответа от сервера
      throw new Error("No response from main service");
    } else {
      // Другие ошибки
      throw error;
    }
  }
};
