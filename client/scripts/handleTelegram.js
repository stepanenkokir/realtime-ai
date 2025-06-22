// Инициализация Telegram Web App
window.Telegram.WebApp.ready();

// Функция для отправки данных на сервер
async function sendUserDataToServer() {
  try {
    // Получаем initData от Telegram
    const initData = window.Telegram.WebApp.initData;
    if (!initData) {
      console.error("InitData не найдена");
      return;
    }

    // Отправляем данные на сервер
    const response = await fetch("/api/auth/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: initData,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Пользователь авторизован:", JSON.stringify(result.user));

      const passwdInput = document.getElementById("passwd");
      passwdInput.style.display = "none";

      // Сохраняем токен для дальнейших запросов
      localStorage.setItem("authToken", result.token);

      // Закрываем WebApp после успешной авторизации (опционально)
      // window.Telegram.WebApp.close();
    } else {
      console.error("Ошибка авторизации:", await response.text());
    }
  } catch (error) {
    console.error("Ошибка при отправке данных:", error);
  }
}
