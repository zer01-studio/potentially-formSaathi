import "server-only";
import { createHash } from "node:crypto";
import { MemoryLruCache } from "@/lib/cache/memory-lru";
import { env } from "@/lib/env";
import { ELEVENLABS_TTS_MODEL } from "./constants";

export type CachedSpeech = {
  audio: Buffer;
  contentType: string;
};

export const speechCache = new MemoryLruCache<CachedSpeech>(
  "elevenlabs-tts",
  40,
  60 * 60 * 1000,
);

export function speechCacheKey(text: string): string {
  return createHash("sha256")
    .update(`${env.ELEVENLABS_VOICE_ID}|${ELEVENLABS_TTS_MODEL}|${text}`)
    .digest("hex");
}
