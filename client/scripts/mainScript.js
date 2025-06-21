let isSessionActive = false;
let peerConnection = null;
let micStream = null;

// Инициализируем server logger
const serverLogger = new ServerLogger();

// Перехватываем все логи и отправляем на сервер
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  originalConsoleLog.apply(console, args);
  serverLogger.log("LOG", args.join(" "));
};

console.error = (...args) => {
  originalConsoleError.apply(console, args);
  serverLogger.log("ERROR", args.join(" "));
};

// Добавляем специальные методы для отладки аудио
function logAudioDebug(message, data) {
  console.log(`[AUDIO] ${message}`, data);
  serverLogger.log("AUDIO", message, data);
}

function logWebRTCDebug(message, data) {
  console.log(`[WebRTC] ${message}`, data);
  serverLogger.log("WEBRTC", message, data);
}

// Переменная для хранения полного транскрипта (опционально, если нужно сохранять всю беседу)
let fullTranscript = [];

// API functions
async function getToken(passcode) {
  const response = await fetch(`/session-token?passcode=${passcode}`, {
    method: "GET",
  });
  if (response.status !== 200) {
    return null;
  }
  return await response.json();
}

// Функция для инициализации аудио с пользовательским взаимодействием
function initializeAudio() {
  const audioElement = document.getElementById("remoteAudio");

  // Попытка воспроизвести тишину для разблокировки аудио
  audioElement.muted = true;
  audioElement
    .play()
    .then(() => {
      console.log("Audio context unlocked");
      audioElement.muted = false;
    })
    .catch((err) => {
      console.log("Audio unlock failed:", err);
    });
}

// Функция для показа кнопки включения звука
function showAudioEnableButton() {
  const enableButton = document.createElement("button");
  enableButton.textContent = "Включить звук";
  enableButton.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 10px;
    font-size: 16px;
    z-index: 1000;
    cursor: pointer;
  `;

  enableButton.onclick = () => {
    const audioElement = document.getElementById("remoteAudio");
    audioElement
      .play()
      .then(() => {
        enableButton.remove();
      })
      .catch((err) => {
        console.log("Manual play failed:", err);
      });
  };

  document.body.appendChild(enableButton);
}

async function startSession() {
  try {
    showLoader("Получаю токен...");
    const passcode = document.getElementById("passwd").value;
    const data = await getToken(passcode);

    if (!data) {
      hideLoader();
      updateStatus("Нет доступа");
    }

    const EPHEMERAL_KEY = data.client_secret.value;

    const model = data.model;

    showLoader("Устанавливаю соединение...");

    // Инициализация аудио контекста для Android
    if (window.Telegram?.WebApp?.platform === "android") {
      try {
        ensureAudioContext();
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
      } catch (err) {
        console.log("AudioContext resume failed:", err);
      }
    }

    // Create peer connection
    peerConnection = new RTCPeerConnection();

    fullTranscript = [];

    peerConnection.oniceconnectionstatechange = () => {
      const s = peerConnection.iceConnectionState;
      if (s === "failed" || s === "disconnected") {
        console.warn("ICE state:", s);
        stopSession();
      }
    };

    // Set up remote audio
    peerConnection.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        const audioElement = document.getElementById("remoteAudio");
        audioElement.srcObject = e.streams[0];
        audioElement.autoplay = true;
        // Для Android в Telegram Mini App
        if (window.Telegram?.WebApp?.platform === "android") {
          // Явно устанавливаем свойства для Android
          audioElement.autoplay = true;
          audioElement.muted = false;
          audioElement.controls = false;

          // Попытка воспроизведения с задержкой
          setTimeout(() => {
            audioElement.play().catch((err) => {
              console.log("Autoplay failed, trying manual play:", err);
              // Показать пользователю кнопку для включения звука
              showAudioEnableButton();
            });
          }, 100);
        } else {
          audioElement.autoplay = true;
        }
      }
    };

    // Get microphone access
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    peerConnection.addTrack(micStream.getTracks()[0]);

    // Set up data channel
    const dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannel.addEventListener("message", (e) => {
      const rr = JSON.parse(e.data);
      // Request
      if (rr.type === "conversation.item.input_audio_transcription.completed") {
        fullTranscript.push({ sender: "user", text: rr.transcript });
        renderTranscript(fullTranscript);
      }

      // Response
      if (rr.type === "response.audio_transcript.done") {
        fullTranscript.push({ sender: "ai", text: rr.transcript });
        renderTranscript(fullTranscript);
      }
    });

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send to OpenAI
    const baseUrl = "https://api.openai.com/v1/realtime";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await peerConnection.setRemoteDescription(answer);

    // Success!
    isSessionActive = true;
    hideLoader();
    updateStatus("Сессия активна");

    // Update UI
    const startButton = document.getElementById("startButton");
    startButton.classList.add("recording");
    const btnText = document.getElementById("btnTxt");
    btnText.innerHTML = "Активна";

    // Show visualizations
    document.getElementById("micVisualSection").classList.add("active");

    // Start mic visualization
    visualizeMicAudio(micStream);
  } catch (error) {
    console.error("Error starting session:", error);
    hideLoader();
    updateStatus("Ошибка подключения");
    alert("Не удалось установить соединение. Проверьте сервер.");
  }
}

async function stopSession() {
  isSessionActive = false;

  if (peerConnection) {
    peerConnection.close();
  }

  if (micStream) {
    micStream.getTracks().forEach((track) => {
      track.stop();
      track.enabled = false; // Explicitly disable
    });
    micStream = null;
  }

  await closeAudioContext();

  // Reset UI
  const startButton = document.getElementById("startButton");
  startButton.classList.remove("recording");
  const btnText = document.getElementById("btnTxt");
  btnText.innerHTML = "Начать";

  document.getElementById("micVisualSection").classList.remove("active");

  updateStatus("Сессия завершена");

  // Clear canvases
  const micCanvas = document.getElementById("micCanvas");
  micCanvas.getContext("2d").clearRect(0, 0, micCanvas.width, micCanvas.height);

  // Force release microphone permissions (iOS workaround)
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    })
    .catch(() => {}); // Ignore errors, just ensure tracks are stopped
}

// Добавьте инициализацию при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  // Инициализация аудио при первом клике
  document
    .getElementById("startButton")
    .addEventListener("click", initializeAudio, { once: true });
});

// Event listeners
document.getElementById("startButton").addEventListener("click", () => {
  if (!isSessionActive) {
    startSession();
  } else {
    stopSession();
  }
});
