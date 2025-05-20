import CryptoJS from "crypto-js";
import dotenv from "dotenv";
dotenv.config();

export function cryptoData(data) {
  // Шифрование данных
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    process.env.SECRET_CRYPTO
  ).toString();

  return encryptedData;
}

export function decryptData(encryptedData) {
  const secretKey = process.env.SECRET_CRYPTO;
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  return decryptedData;
}

export function encryptImage(base64Image) {
  try {
    // Шифруем изображение с помощью AES
    const encrypted = CryptoJS.AES.encrypt(
      base64Image,
      process.env.SECRET_CRYPTO
    ).toString();
    return encrypted;
  } catch (error) {
    console.error("Ошибка шифрования:", error);
    return null;
  }
}
