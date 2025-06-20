// server.js
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";

dotenv.config();

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const currentPassword = process.env.PASSWORD || 10000 * Math.random();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from current directory (where the HTML file is)
app.use(express.static(path.join(__dirname, "./client")));

// Session token endpoint
app.get("/session-token", async (req, res) => {
  const { passcode } = req.query;
  if (!passcode || passcode !== currentPassword) {
    return res.status(401).json({ error: "Authentification failed" });
  }
  try {
    console.log("Requesting session token from OpenAI...");

    const voiceInstruction = "";
    //"Voice: Calm, soft, and giggly, like a happy person in euphoria or totally chilled. Tone: Relaxed and soothing, keeping things light even when the customer is frustrated. Speech Mannerisms: Uses casual, friendly phrasing with street slang like 'типа','это самое', 'ёкарный бабай' etc to keep the conversation chill. Pronunciation: Soft and drawn-out, with slightly stretched vowels and a naturally wavy rhythm. Tempo: Slow and easygoing, with a natural flow that creates a calming effect.";
    //      " Voice: Laid-back, mellow, and effortlessly cool, like a surfer who's never in a rush.\n\nTone: Relaxed and reassuring, keeping things light even when the customer is frustrated.\n\nSpeech Mannerisms: Uses casual, friendly phrasing with surfer slang like dude, gnarly, and boom to keep the conversation chill.\n\nPronunciation: Soft and drawn-out, with slightly stretched vowels and a naturally wavy rhythm in speech.\n\nTempo: Slow and easygoing, with a natural flow that never feels rushed, creating a calming effect.";

    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2025-06-03",
        voice: "echo",
        instructions:
          "Ты голосовой помощник по имени Дилан. Отвечай кратко и дружелюбно на русском языке. Если тема позволяет - шути и смейся " +
          voiceInstruction,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
      }),
    });

    if (!resp.ok) {
      console.log(`OpenAI API error: ${resp.status} ${resp.statusText}`);
      throw new Error(`OpenAI API error: ${resp.status} ${resp.statusText}`);
    }

    const json = await resp.json();
    console.log("Session created successfully");
    res.json(json);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({
      error: "Failed to create session",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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
