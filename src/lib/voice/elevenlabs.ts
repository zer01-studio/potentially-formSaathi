import "server-only";
import { z } from "zod";
import { env, voiceCapabilities } from "@/lib/env";
import {
  ELEVENLABS_STT_MODEL,
  ELEVENLABS_TTS_MODEL,
  MAX_TRANSCRIPT_CHARS,
} from "./constants";

export class VoiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "VoiceError";
    this.code = code;
    this.status = status;
  }
}

const sttResponseSchema = z
  .object({
    text: z.string(),
  })
  .passthrough();

export async function synthesizeSpeech(
  text: string,
): Promise<{ audio: Buffer; contentType: string }> {
  if (!voiceCapabilities.tts) {
    throw new VoiceError(
      "voice_unavailable",
      503,
      "Voice replies aren't configured yet. Questions stay in text.",
    );
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    env.ELEVENLABS_VOICE_ID,
  )}?output_format=mp3_44100_128`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_TTS_MODEL,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new VoiceError(
      "voice_unavailable",
      502,
      "Voice took too long to respond. Questions stay in text.",
    );
  }

  if (!response.ok) {
    throw new VoiceError(
      "voice_unavailable",
      502,
      "Voice isn't available right now. Questions stay in text.",
    );
  }

  const contentType = response.headers.get("content-type") ?? "audio/mpeg";
  if (!contentType.toLowerCase().startsWith("audio/")) {
    throw new VoiceError(
      "voice_unavailable",
      502,
      "Voice returned an unexpected response. Questions stay in text.",
    );
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.byteLength === 0 || audio.byteLength > 5 * 1024 * 1024) {
    throw new VoiceError(
      "voice_unavailable",
      502,
      "Voice returned an unusable response. Questions stay in text.",
    );
  }

  return { audio, contentType };
}

export async function transcribeAudio(file: File): Promise<string> {
  if (!voiceCapabilities.stt) {
    throw new VoiceError(
      "voice_unavailable",
      503,
      "Spoken answers aren't configured yet. Please type your answer.",
    );
  }

  const body = new FormData();
  body.append("file", file, "answer.webm");
  body.append("model_id", ELEVENLABS_STT_MODEL);

  let response: Response;
  try {
    response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
      body,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new VoiceError(
      "transcription_failed",
      502,
      "We couldn't transcribe that recording. Please type your answer.",
    );
  }

  if (!response.ok) {
    throw new VoiceError(
      "transcription_failed",
      502,
      "We couldn't transcribe that recording. Please type your answer.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new VoiceError(
      "transcription_failed",
      502,
      "We couldn't transcribe that recording. Please type your answer.",
    );
  }

  const parsed = sttResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new VoiceError(
      "transcription_failed",
      502,
      "We couldn't read the transcription. Please type your answer.",
    );
  }

  const text = parsed.data.text.trim().slice(0, MAX_TRANSCRIPT_CHARS);
  if (!text) {
    throw new VoiceError(
      "empty_transcription",
      422,
      "We couldn't hear an answer. Try again, or type it instead.",
    );
  }

  return text;
}
