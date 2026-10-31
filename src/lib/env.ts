import "server-only";
import { z } from "zod";

function booleanFromEnv(fallback: boolean) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return fallback;
  }, z.boolean());
}

function positiveIntFromEnv(fallback: number) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }, z.number().int().positive());
}

const envSchema = z.object({
  MONGODB_URI: z.string().trim().default(""),

  GEMMA_API_KEY: z.string().trim().default(""),
  GEMMA_MODEL: z.string().trim().default(""),

  ELEVENLABS_API_KEY: z.string().trim().default(""),
  ELEVENLABS_VOICE_ID: z.string().trim().default(""),

  OCR_PROVIDER: z.string().trim().default(""),

  AUTH_MODE: z.literal("mock").default("mock"),
  SESSION_SECRET: z.string().default(""),

  AI_ENABLED: booleanFromEnv(true),
  RATE_LIMIT_PER_MINUTE: positiveIntFromEnv(20),
  DAILY_AI_BUDGET_PER_USER: positiveIntFromEnv(100),
  MAX_UPLOAD_MB: positiveIntFromEnv(10),
  MAX_PDF_PAGES: positiveIntFromEnv(20),

  CACHE_DRIVER: z.literal("memory").default("memory"),

  EXTENSION_ALLOWED_ORIGINS: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const keys = parsed.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");
  throw new Error(`Invalid environment configuration for: ${keys}`);
}

export const env = parsed.data;

export type ServicesStatus = {
  gemma: boolean;
  elevenlabs: boolean;
  ocr: boolean;
  database: boolean;
};

export const ocrProvider = env.OCR_PROVIDER.trim().toLowerCase();

export const services: ServicesStatus = {
  gemma: env.AI_ENABLED && Boolean(env.GEMMA_API_KEY) && Boolean(env.GEMMA_MODEL),
  elevenlabs: Boolean(env.ELEVENLABS_API_KEY) && Boolean(env.ELEVENLABS_VOICE_ID),
  ocr: ocrProvider === "tesseract",
  database: Boolean(env.MONGODB_URI),
};

export function unavailableServiceLabels(): string[] {
  const labels: string[] = [];
  if (!services.gemma) labels.push("Gemma AI");
  if (!services.elevenlabs) labels.push("ElevenLabs voice");
  if (!services.ocr) labels.push("scanned-page OCR");
  return labels;
}
