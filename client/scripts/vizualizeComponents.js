let audioContext = null;
let micAnalyser = null;
let micAnimId = null;

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

async function closeAudioContext() {
  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }
  cancelAnimationFrame(micAnimId);
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
