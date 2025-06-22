// server/telegramRoutes.js
import { verifyTelegramInitData, generateUserToken } from "./telegramAuth.js";

export function setupTelegramRoutes(app) {
  // Роут для авторизации через Telegram
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { initData } = req.body;

      if (!initData) {
        return res.status(400).json({
          error: "InitData отсутствует",
        });
      }

      // Верифицируем данные
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error("TELEGRAM_BOT_TOKEN не найден в .env");
        return res.status(500).json({
          error: "Ошибка конфигурации сервера",
        });
      }

      const verifiedData = verifyTelegramInitData(initData, botToken);

      if (!verifiedData) {
        return res.status(401).json({
          error: "Не удалось верифицировать данные Telegram",
        });
      }

      // Генерируем токен для пользователя
      const token = generateUserToken(verifiedData);

      // Сохраняем пользователя в базе данных (если нужно)
      // await saveUserToDatabase(verifiedData.user);

      res.json({
        success: true,
        user: verifiedData.user,
        token: token,
        message: "Авторизация успешна",
      });
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      res.status(500).json({
        error: "Внутренняя ошибка сервера",
      });
    }
  });

  // Middleware для проверки авторизации на защищенных роутах
  app.use("/api/protected", (req, res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Токен не предоставлен" });
    }

    try {
      // Проверяем JWT токен (упрощенная версия)
      const [header, payload, signature] = token.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payload, "base64url").toString()
      );

      // Проверяем срок действия
      if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ error: "Токен истек" });
      }

      req.user = decodedPayload;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Недействительный токен" });
    }
  });

  // Пример защищенного роута
  app.get("/api/protected/profile", (req, res) => {
    res.json({
      user: req.user,
      message: "Данные профиля",
    });
  });

  // Роут для получения информации о пользователе
  app.get("/api/user/info", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Токен не предоставлен" });
    }

    try {
      const [header, payload, signature] = token.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payload, "base64url").toString()
      );

      res.json({
        userId: decodedPayload.userId,
        username: decodedPayload.username,
        firstName: decodedPayload.firstName,
        lastName: decodedPayload.lastName,
      });
    } catch (error) {
      res.status(401).json({ error: "Недействительный токен" });
    }
  });
}
