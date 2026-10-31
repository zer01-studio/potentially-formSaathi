import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { FIELD_TYPES, type FieldType } from "@/lib/forms/types";

export class GemmaError extends Error {
  readonly code: string;

  constructor(code: string, message = "Gemma request failed.") {
    super(message);
    this.name = "GemmaError";
    this.code = code;
  }
}

const formPlanItemSchema = z
  .object({
    id: z.number().int().nonnegative(),
    plainQuestion: z.string().trim().min(1).max(220),
    label: z.string().trim().min(1).max(60).nullish(),
    helpText: z.string().trim().max(160).nullish(),
    type: z.enum(FIELD_TYPES).nullish(),
    step: z.number().int().nonnegative().max(29).nullish(),
    stepTitle: z.string().trim().max(80).nullish(),
  })
  .strict();

const formPlanResponseSchema = z
  .object({
    questions: z.array(formPlanItemSchema).min(1).max(30),
  })
  .strict();

export type FormPlanItem = z.infer<typeof formPlanItemSchema>;

type GemmaPayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

function candidateText(payload: unknown): string {
  const data = payload as GemmaPayload;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function extractJsonObject(text: string): unknown {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new GemmaError("invalid_json");
  }

  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch {
    throw new GemmaError("invalid_json");
  }
}

async function requestGeneration(prompt: string): Promise<string> {
  if (!env.GEMMA_API_KEY || !env.GEMMA_MODEL) {
    throw new GemmaError("not_configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    env.GEMMA_MODEL,
  )}:generateContent`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": env.GEMMA_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new GemmaError(
      "network_error",
      error instanceof Error ? error.message : "Gemma network error.",
    );
  }

  if (!response.ok) {
    throw new GemmaError(`http_${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GemmaError("invalid_response");
  }

  const text = candidateText(payload);
  if (!text) throw new GemmaError("empty_response");

  return text;
}

function isRetryable(promptError: unknown): boolean {
  return (
    promptError instanceof GemmaError &&
    /^http_5\d\d$/.test(promptError.code)
  );
}

async function requestGenerationWithRetry(prompt: string): Promise<string> {
  try {
    return await requestGeneration(prompt);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 700));
    return requestGeneration(prompt);
  }
}

export async function generateFormPlan(
  prompt: string,
): Promise<FormPlanItem[]> {
  let lastFailure: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const attemptPrompt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous reply was not valid JSON matching the required shape. Reply with ONLY the JSON object.`;

    const text = await requestGenerationWithRetry(attemptPrompt);

    try {
      const parsed = formPlanResponseSchema.parse(extractJsonObject(text));
      return parsed.questions;
    } catch (error) {
      lastFailure = error;
    }
  }

  throw new GemmaError(
    "invalid_output",
    lastFailure instanceof Error ? lastFailure.message : "Gemma returned invalid output.",
  );
}

export function isAllowedTypeChange(
  suggested: FieldType | null | undefined,
  current: FieldType,
  hasOptions: boolean,
): suggested is FieldType {
  if (!suggested) return false;
  if (hasOptions) return false;
  if (suggested === "choice") return false;
  return FIELD_TYPES.includes(suggested) && suggested !== current;
}
