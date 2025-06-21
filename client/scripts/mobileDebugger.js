// Добавьте этот код в начало script.js для создания debug overlay

class MobileDebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 50;
    this.isVisible = false;
    this.createDebugOverlay();
    this.interceptConsole();
  }

  createDebugOverlay() {
    // Создаем кнопку для показа/скрытия логов
    this.toggleButton = document.createElement("button");
    this.toggleButton.innerHTML = "🐛";
    this.toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 40px;
      height: 40px;
      background: rgba(255, 0, 0, 0.8);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 16px;
      z-index: 9999;
      cursor: pointer;
    `;
    this.toggleButton.onclick = () => this.toggleDebugPanel();
    document.body.appendChild(this.toggleButton);

    // Создаем панель для логов
    this.debugPanel = document.createElement("div");
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 60px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 8px;
      z-index: 9998;
      overflow-y: auto;
      display: none;
      white-space: pre-wrap;
      word-break: break-all;
    `;
    document.body.appendChild(this.debugPanel);

    // Кнопка очистки логов
    this.clearButton = document.createElement("button");
    this.clearButton.innerHTML = "🗑️";
    this.clearButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 60px;
      width: 40px;
      height: 40px;
      background: rgba(0, 0, 255, 0.8);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 16px;
      z-index: 9999;
      cursor: pointer;
    `;
    this.clearButton.onclick = () => this.clearLogs();
    document.body.appendChild(this.clearButton);
  }

  interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.addLog("LOG", args);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog("ERROR", args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog("WARN", args);
      originalWarn.apply(console, args);
    };

    // Перехватываем ошибки
    window.addEventListener("error", (event) => {
      this.addLog("ERROR", [
        `${event.message} at ${event.filename}:${event.lineno}`,
      ]);
    });

    // Перехватываем нераспознанные Promise реджекты
    window.addEventListener("unhandledrejection", (event) => {
      this.addLog("PROMISE_ERROR", [event.reason]);
    });
  }

  addLog(type, args) {
    const timestamp = new Date().toLocaleTimeString();
    const message = args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");

    const logEntry = `[${timestamp}] ${type}: ${message}`;
    this.logs.push(logEntry);

    // Ограничиваем количество логов
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.updateDebugPanel();
  }

  updateDebugPanel() {
    if (this.debugPanel) {
      this.debugPanel.textContent = this.logs.join("\n");
      this.debugPanel.scrollTop = this.debugPanel.scrollHeight;
    }
  }

  toggleDebugPanel() {
    this.isVisible = !this.isVisible;
    this.debugPanel.style.display = this.isVisible ? "block" : "none";
    this.toggleButton.style.background = this.isVisible
      ? "rgba(0, 255, 0, 0.8)"
      : "rgba(255, 0, 0, 0.8)";
  }

  clearLogs() {
    this.logs = [];
    this.updateDebugPanel();
  }

  // Метод для добавления кастомных логов
  debug(message, data = null) {
    if (data) {
      this.addLog("DEBUG", [message, data]);
    } else {
      this.addLog("DEBUG", [message]);
    }
  }
}

// Инициализируем debug logger
const debugLogger = new MobileDebugLogger();

// Добавляем специальные логи для аудио отладки
function logAudioState(audioElement, context) {
  debugLogger.debug(`Audio State [${context}]:`, {
    paused: audioElement.paused,
    muted: audioElement.muted,
    volume: audioElement.volume,
    readyState: audioElement.readyState,
    networkState: audioElement.networkState,
    currentTime: audioElement.currentTime,
    duration: audioElement.duration || "unknown",
    srcObject: !!audioElement.srcObject,
    autoplay: audioElement.autoplay,
  });
}

// Функция для логирования WebRTC состояния
function logWebRTCState(peerConnection, context) {
  if (!peerConnection) return;

  debugLogger.debug(`WebRTC State [${context}]:`, {
    connectionState: peerConnection.connectionState,
    iceConnectionState: peerConnection.iceConnectionState,
    iceGatheringState: peerConnection.iceGatheringState,
    signalingState: peerConnection.signalingState,
  });
}

// Функция для логирования Telegram WebApp API
function logTelegramState() {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    debugLogger.debug("Telegram WebApp State:", {
      platform: tg.platform,
      version: tg.version,
      isExpanded: tg.isExpanded,
      viewportHeight: tg.viewportHeight,
      viewportStableHeight: tg.viewportStableHeight,
      colorScheme: tg.colorScheme,
    });
  } else {
    debugLogger.debug("Telegram WebApp API not available");
  }
}

// Автоматическое логирование при старте
document.addEventListener("DOMContentLoaded", () => {
  debugLogger.debug("=== DEBUG SESSION STARTED ===");
  debugLogger.debug("User Agent:", navigator.userAgent);
  debugLogger.debug("Screen:", `${screen.width}x${screen.height}`);
  debugLogger.debug("Viewport:", `${window.innerWidth}x${window.innerHeight}`);

  logTelegramState();

  // Проверяем поддержку WebRTC
  debugLogger.debug("WebRTC Support:", {
    RTCPeerConnection: !!window.RTCPeerConnection,
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    AudioContext: !!(window.AudioContext || window.webkitAudioContext),
  });
});
