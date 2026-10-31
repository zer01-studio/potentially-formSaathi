import { ApiHttpError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { requireSessionAuth } from "@/lib/api/guards";
import { apiSuccess } from "@/lib/api/response";
import { env, voiceCapabilities } from "@/lib/env";
import { MAX_AUDIO_BYTES } from "@/lib/voice/constants";
import { transcribeAudio, VoiceError } from "@/lib/voice/elevenlabs";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "video/webm",
]);

export const POST = withApi(
  {
    auth: "required",
    rateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "voice-transcribe",
    },
    userRateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "voice-transcribe",
    },
  },
  async ({ request, auth }) => {
    requireSessionAuth(auth);

    if (!voiceCapabilities.stt) {
      throw new ApiHttpError(
        503,
        "voice_unavailable",
        "Spoken answers aren’t configured yet. Please type your answer.",
      );
    }

    const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("multipart/form-data")) {
      throw new ApiHttpError(
        415,
        "unsupported_media_type",
        "Send the recording as a multipart form upload.",
      );
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_AUDIO_BYTES + 64 * 1024
    ) {
      throw new ApiHttpError(
        413,
        "audio_too_large",
        "That recording is too large. Keep spoken answers under 10 MB.",
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApiHttpError(
        400,
        "invalid_audio",
        "We couldn’t read that recording. Please try again.",
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiHttpError(
        400,
        "audio_required",
        "Record an answer first, then try again.",
      );
    }

    if (file.size === 0) {
      throw new ApiHttpError(
        400,
        "audio_empty",
        "We didn’t catch any audio. Try recording again.",
      );
    }

    if (file.size > MAX_AUDIO_BYTES) {
      throw new ApiHttpError(
        413,
        "audio_too_large",
        "That recording is too large. Keep spoken answers under 10 MB.",
      );
    }

    const baseType = (file.type || "").split(";")[0].trim().toLowerCase();
    if (baseType && !ALLOWED_AUDIO_TYPES.has(baseType)) {
      throw new ApiHttpError(
        415,
        "unsupported_audio",
        "That recording format isn’t supported. Try again, or type your answer.",
      );
    }

    try {
      const text = await transcribeAudio(file);
      return apiSuccess({ text });
    } catch (error) {
      if (error instanceof VoiceError) {
        throw new ApiHttpError(error.status, error.code, error.message);
      }
      throw error;
    }
  },
);
