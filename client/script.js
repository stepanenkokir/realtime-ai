let isSessionActive = false;
let peerConnection = null;
let micStream = null;
let micAnalyser = null;
let audioContext = null;
let micAnimId = null;

// Переменная для хранения полного транскрипта (опционально, если нужно сохранять всю беседу)
let fullTranscript = [];
// Получаем ссылку на элемент, куда будем выводить транскрипт
const transcriptOutputElement = document.getElementById("transcriptOutput");

// Utility functions
function showLoader(text = "Загрузка...") {
  document.getElementById("loaderText").textContent = text;
  document.getElementById("loader").classList.add("show");
}

function hideLoader() {
  document.getElementById("loader").classList.remove("show");
}

function updateStatus(text) {
  document.getElementById("status").textContent = text;
}

function ensureAudioContext() {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Audio visualization
function visualizeMicAudio(stream) {
  const canvas = document.getElementById("micCanvas");
  const ctx = canvas.getContext("2d");

  ensureAudioContext();

  const source = audioContext.createMediaStreamSource(stream);
  micAnalyser = audioContext.createAnalyser();
  source.connect(micAnalyser);

  micAnalyser.fftSize = 256;
  const bufferLength = micAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!isSessionActive) {
      cancelAnimationFrame(micAnimId);
      return;
    }

    micAnimId = requestAnimationFrame(draw);
    micAnalyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;

      const hue = (i / bufferLength) * 60 + 200; // Blue to cyan
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  draw();
}

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
    const audioElement = document.getElementById("remoteAudio");

    peerConnection.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        const audioElement = document.getElementById("remoteAudio");
        audioElement.srcObject = e.streams[0];
        audioElement.autoplay = true;
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
      //  console.log(rr);
      // Request
      if (rr.type === "conversation.item.input_audio_transcription.completed") {
        // console.log("------------------------------------------------------");
        console.log("REQUEST: ", rr.transcript);
        //  console.log("------------------------------------------------------");
        fullTranscript.push({ sender: "user", text: rr.transcript });
        renderTranscript();
        // fullTranscript += `<span>Вы: ${rr.transcript}</span>`; // Добавляем к полному транскрипту
        // transcriptOutputElement.textContent = fullTranscript; // Обновляем отображение
        // transcriptOutputElement.scrollTop =
        //   transcriptOutputElement.scrollHeight; // Прокручиваем вниз
      }

      // Response
      if (rr.type === "response.audio_transcript.done") {
        // console.log("======================================================");
        console.log("Response: ", rr.transcript);
        // console.log("======================================================");

        fullTranscript.push({ sender: "ai", text: rr.transcript });
        renderTranscript();
        // fullTranscript += `<span>AI: ${rr.transcript}</span>`;
        // transcriptOutputElement.textContent = fullTranscript;
        // transcriptOutputElement.scrollTop =
        //   transcriptOutputElement.scrollHeight;
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

function renderTranscript() {
  transcriptOutputElement.innerHTML = "";
  fullTranscript.forEach(({ sender, text }) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${
      sender === "user" ? "user-message" : "ai-message"
    }`;
    messageDiv.textContent = text;
    transcriptOutputElement.appendChild(messageDiv);
  });
  transcriptOutputElement.scrollTop = transcriptOutputElement.scrollHeight;
}

function stopSession() {
  isSessionActive = false;

  if (peerConnection) {
    peerConnection.close();
  }

  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
  }

  if (audioContext) {
    audioContext.close();
  }

  cancelAnimationFrame(micAnimId);

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
}

// Event listeners
document.getElementById("startButton").addEventListener("click", () => {
  if (!isSessionActive) {
    startSession();
  } else {
    stopSession();
  }
});
