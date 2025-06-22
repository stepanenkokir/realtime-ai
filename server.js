// server.js
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";
import { debugLog, sessionToken, health } from "./server/routes.js";
import { setupTelegramRoutes } from "./server/telegramRoutes.js";

dotenv.config();

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://127.0.0.1",
    credentials: true,
  })
);

// Serve static files from current directory (where the HTML file is)
app.use(express.static(path.join(__dirname, "./client")));

// Session token endpoint
app.get("/session-token", sessionToken);
app.post("/debug-log", debugLog);
app.get("/health", health);

setupTelegramRoutes(app);

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

// Проверяем наличие необходимых переменных окружения
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("⚠️  TELEGRAM_BOT_TOKEN не найден в .env файле");
  console.log("Добавьте в .env: TELEGRAM_BOT_TOKEN=your_bot_token_here");
}

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET не найден в .env файле, используется стандартный"
  );
  console.log(
    "Рекомендуется добавить в .env: JWT_SECRET=your_secure_random_string"
  );
}

// Create HTTPS server with certificates
const devHTTPS = process.env.DEV_HTTPS || 0;
let server;
if (devHTTPS == 1) {
  try {
    // Load certificates
    const privateKey = fs.readFileSync(
      path.join(__dirname, "./cert", "localhost-key.pem"),
      "utf8"
    );
    const certificate = fs.readFileSync(
      path.join(__dirname, "./cert", "localhost-cert.pem"),
      "utf8"
    );
    const credentials = { key: privateKey, cert: certificate };

    // Create HTTPS server
    server = https.createServer(credentials, app);
    console.log("HTTPS server configured");
  } catch (error) {
    console.warn("HTTPS certificates not found, falling back to HTTP");
    server = app;
  }
} else {
  server = app;
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the app at: localhost:${PORT}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error("⚠️  OPENAI_API_KEY not found in environment variables");
  }
});

export default app;
