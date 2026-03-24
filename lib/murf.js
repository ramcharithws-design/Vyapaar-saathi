import axios from "axios";
import { LANGUAGES } from "./languages";

export async function textToSpeech(text, languageCode) {
  try {
    const language = LANGUAGES[languageCode];
    const voiceId = language?.murfVoiceId || "hi-IN-aarav";

    const response = await axios.post(
      "https://api.murf.ai/v1/speech/stream",
      { text, voiceId, format: "MP3", modelVersion: "FALCON" },
      {
        headers: {
          "api-key": process.env.MURF_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    const audioBase64 = Buffer.from(response.data).toString("base64");
    return { success: true, audio: audioBase64 };
  } catch (error) {
    console.error("Murf error:", error?.response?.data || error.message);
    return { success: false, error: error.message };
  }
}
