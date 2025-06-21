// Получаем ссылку на элемент, куда будем выводить транскрипт
const transcriptOutputElement = document.getElementById("transcriptOutput");

function renderTranscript(transcriptText) {
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
}
