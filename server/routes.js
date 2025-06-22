export const sessionToken = async (req, res) => {
  const { passcode, token } = req.query;

  console.log("TOKEN = ", token);

  if (!token || token.length < 10) {
    const currentPassword = process.env.PASSWORD || 10000 * Math.random();
    if (!passcode || passcode !== currentPassword) {
      return res.status(401).json({ error: "Authentification failed" });
    }
  }

  try {
    console.log("Requesting session token from OpenAI...");

    const voiceInstruction = "";
    //"При включении начни диалог первым со вступления: Добро пожаловать в проект City Of Goodness!";
    //"Voice: Calm, soft, and giggly, like a happy person in euphoria or totally chilled. Tone: Relaxed and soothing, keeping things light even when the customer is frustrated. Speech Mannerisms: Uses casual, friendly phrasing with street slang like 'типа','это самое', 'ёкарный бабай' etc to keep the conversation chill. Pronunciation: Soft and drawn-out, with slightly stretched vowels and a naturally wavy rhythm. Tempo: Slow and easygoing, with a natural flow that creates a calming effect.";
    //" Voice: Laid-back, mellow, and effortlessly cool, like a surfer who's never in a rush.\n\nTone: Relaxed and reassuring, keeping things light even when the customer is frustrated.\n\nSpeech Mannerisms: Uses casual, friendly phrasing with surfer slang like dude, gnarly, and boom to keep the conversation chill.\n\nPronunciation: Soft and drawn-out, with slightly stretched vowels and a naturally wavy rhythm in speech.\n\nTempo: Slow and easygoing, with a natural flow that never feels rushed, creating a calming effect.";

    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "echo",
        instructions:
          "Ты голосовой помощник по имени Дилан. Отвечай кратко и дружелюбно на языке пользователя или на русском языке." +
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
};

export const health = async (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

export const debugLog = async (req, res) => {
  const { level, message, data, timestamp, userAgent } = req.body;

  console.log(`[CLIENT-${level}] ${timestamp} - ${message}`);
  if (data) {
    console.log("Data:", JSON.stringify(data, null, 2));
  }
  console.log("User Agent:", userAgent);
  console.log("---");

  res.json({ status: "logged" });
};
