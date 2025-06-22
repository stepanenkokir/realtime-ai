// server/telegramAuth.js
import crypto from "crypto";

/**
 * Верификация initData от Telegram WebApp
 * @param {string} initData - строка initData от Telegram
 * @param {string} botToken - токен бота
 * @returns {Object|null} - данные пользователя или null если верификация не прошла
 */
export function verifyTelegramInitData(initData, botToken) {
  try {
    // Парсим initData
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");

    if (!hash) {
      return null;
    }

    // Удаляем hash из параметров
    urlParams.delete("hash");

    // Сортируем параметры по ключу
    const sortedParams = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Вычисляем HMAC
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(sortedParams)
      .digest("hex");

    // Проверяем хеш
    if (calculatedHash !== hash) {
      return null;
    }

    // Проверяем время (initData действительна 24 часа)
    const authDate = parseInt(urlParams.get("auth_date"));
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime - authDate > 86400) {
      // 24 часа
      return null;
    }

    // Парсим данные пользователя
    const userString = urlParams.get("user");
    const user = userString ? JSON.parse(userString) : null;

    return {
      user,
      auth_date: authDate,
      query_id: urlParams.get("query_id"),
      chat_type: urlParams.get("chat_type"),
      chat_instance: urlParams.get("chat_instance"),
    };
  } catch (error) {
    console.error("Ошибка верификации initData:", error);
    return null;
  }
}

/**
 * Генерация JWT токена для пользователя
 * @param {Object} userData - данные пользователя
 * @returns {string} - JWT токен
 */
export function generateUserToken(userData) {
  // Простая реализация JWT (в продакшене используйте библиотеку jsonwebtoken)
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    userId: userData.user.id,
    username: userData.user.username,
    firstName: userData.user.first_name,
    lastName: userData.user.last_name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 дней
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "your-jwt-secret")
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
