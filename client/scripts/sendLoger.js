class ServerLogger {
  constructor() {
    this.logs = [];
    this.sendInterval = 5000; // Отправляем каждые 5 секунд
    this.maxLogsPerBatch = 10;

    this.startSending();
  }

  log(level, message, data = null) {
    const logEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    this.logs.push(logEntry);

    // Если критическая ошибка - отправляем сразу
    if (level === "ERROR") {
      this.sendLogs();
    }
  }

  async sendLogs() {
    if (this.logs.length === 0) return;

    const logsToSend = this.logs.splice(0, this.maxLogsPerBatch);

    try {
      for (const log of logsToSend) {
        await fetch("/debug-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(log),
        });
      }
    } catch (error) {
      console.error("Failed to send logs to server:", error);
      // Возвращаем логи обратно в очередь
      this.logs.unshift(...logsToSend);
    }
  }

  startSending() {
    setInterval(() => {
      this.sendLogs();
    }, this.sendInterval);
  }
}
