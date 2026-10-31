import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiHttpError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { requireSessionAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { env, voiceCapabilities } from "@/lib/env";
import { logEvent } from "@/lib/security/log";
import { speechCache, speechCacheKey, type CachedSpeech } from "@/lib/voice/cache";
import { MAX_TTS_CHARS } from "@/lib/voice/constants";
import { synthesizeSpeech, VoiceError } from "@/lib/voice/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 60;

const speakSchema = z.strictObject({
  text: z
    .string()
    .trim()
    .min(1, { message: "There’s nothing to read aloud." })
    .max(MAX_TTS_CHARS, { message: "That text is too long to read aloud." }),
});

function audioResponse(speech: CachedSpeech): NextResponse {
  return new NextResponse(new Uint8Array(speech.audio), {
    status: 200,
    headers: {
      "Content-Type": speech.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Api-Version": "v1",
    },
  });
}

export const POST = withApi(
  {
    auth: "required",
    rateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "voice-speak",
    },
    userRateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "voice-speak",
    },
  },
  async ({ request, auth }) => {
    requireSessionAuth(auth);

    const body = parseWithSchema(speakSchema, await readJsonBody(request));

    if (!voiceCapabilities.tts) {
      throw new ApiHttpError(
        503,
        "voice_unavailable",
        "Voice replies aren’t configured yet. Questions stay in text.",
      );
    }

    const cacheKey = speechCacheKey(body.text);
    const cached = speechCache.get(cacheKey);
    if (cached) return audioResponse(cached);

    try {
      const speech = await synthesizeSpeech(body.text);
      speechCache.set(cacheKey, speech);
      logEvent("voice.tts_generated", { chars: body.text.length });
      return audioResponse(speech);
    } catch (error) {
      if (error instanceof VoiceError) {
        throw new ApiHttpError(error.status, error.code, error.message);
      }
      throw error;
    }
  },
);
