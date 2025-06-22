// Получаем ссылку на элемент, куда будем выводить транскрипт
const transcriptOutputElement = document.getElementById("transcriptOutput");

function renderTranscript(transcriptText, sessionName) {
  transcriptOutputElement.innerHTML = "";
  transcriptText.forEach(({ sender, text }) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${
      sender === "user" ? "user-message" : "ai-message"
    }`;
    messageDiv.textContent = text;
    transcriptOutputElement.appendChild(messageDiv);
  });
  transcriptOutputElement.scrollTop = transcriptOutputElement.scrollHeight;
  sendTranscript(transcriptText, sessionName);
}

async function sendTranscript(transcript, sessionName) {
  const token = localStorage.getItem("authToken") || "";

  console.log("SEND TRANSCRIPT", JSON.stringify(transcript));
  const response = await fetch(`/saveDialog?token=${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dialog: transcript, name: sessionName }),
  });
  if (response.status !== 200) {
    console.log("ERROR ", response);
  }
}
