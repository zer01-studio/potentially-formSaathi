import "server-only";
import { connectDb } from "@/lib/db/connect";
import { Form } from "@/lib/db/models/form";
import { ApiHttpError } from "@/lib/api/errors";
import { simplifyFieldsWithGemma } from "@/lib/ai/simplify";
import { env } from "@/lib/env";
import { extractionCache, extractionCacheKey } from "@/lib/extraction/cache";
import { extractImage, extractPdf, hashBuffer } from "@/lib/extraction/files";
import { extractFormFromHtml } from "@/lib/extraction/html";
import { fetchFormPage } from "@/lib/extraction/link";
import type { ExtractionOutcome } from "@/lib/extraction/results";
import { logEvent } from "@/lib/security/log";
import {
  detectFileKind,
  sanitizeSourceLabel,
  scheduleUploadRemoval,
  storeUpload,
} from "@/lib/storage/uploads";
import { toFormSummary, type FormRecordLike } from "./mappers";
import type { FormSummaryDto, SourceType } from "./types";

async function insertForm(options: {
  userId: string;
  sourceType: SourceType;
  sourceLabel: string;
  contentHash: string;
  outcome: ExtractionOutcome;
  instructions?: string;
}): Promise<FormSummaryDto> {
  const { userId, sourceType, sourceLabel, contentHash, outcome } = options;
  await connectDb();

  const instructions = options.instructions
    ?.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);

  let fields = outcome.fields;
  let aiEnhanced = false;

  if (outcome.mode !== "demo" && outcome.fields.length > 0) {
    const simplified = await simplifyFieldsWithGemma({
      userId,
      title: outcome.title,
      fields: outcome.fields,
      instructions: instructions || undefined,
    });
    fields = simplified.fields;
    aiEnhanced = simplified.usedAi;
  }

  const created = await Form.create({
    userId,
    sourceType,
    sourceLabel: sourceLabel.slice(0, 120) || "Form",
    contentHash,
    title: outcome.title.slice(0, 160) || "Untitled form",
    fields,
    extractionMode: outcome.mode,
    demoFallback: outcome.demoFallback,
    aiEnhanced,
    ...(instructions ? { aiInstructions: instructions } : {}),
    ...(outcome.note ? { extractionNote: outcome.note.slice(0, 300) } : {}),
  });

  logEvent("form.created", {
    source: sourceType,
    mode: outcome.mode,
    fields: outcome.fields.length,
    demo: outcome.demoFallback,
    ai: aiEnhanced,
  });

  return toFormSummary(created.toObject() as unknown as FormRecordLike, 0);
}

export async function createFormFromUrl(options: {
  userId: string;
  url: string;
  instructions?: string;
}): Promise<FormSummaryDto> {
  const page = await fetchFormPage(options.url);
  const cached = extractionCache.get(extractionCacheKey(page.contentHash));

  let outcome: ExtractionOutcome;

  if (cached) {
    outcome = { ...cached, demoFallback: false };
  } else {
    const parsed = extractFormFromHtml(page.html);
    outcome = { ...parsed, mode: "html", demoFallback: false };
    extractionCache.set(extractionCacheKey(page.contentHash), {
      title: parsed.title,
      fields: parsed.fields,
      mode: "html",
    });
  }

  const hostname = new URL(page.finalUrl).hostname || "Web form";

  return insertForm({
    userId: options.userId,
    sourceType: "url",
    sourceLabel: hostname,
    contentHash: page.contentHash,
    outcome,
    instructions: options.instructions,
  });
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 10 ? megabytes.toFixed(0) : megabytes.toFixed(1);
}

export async function createFormFromFile(options: {
  userId: string;
  file: File;
  instructions?: string;
}): Promise<FormSummaryDto> {
  const { file } = options;
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;

  if (file.size === 0) {
    throw new ApiHttpError(400, "empty_file", "That file looks empty. Pick a form file and try again.");
  }
  if (file.size > maxBytes) {
    throw new ApiHttpError(
      413,
      "file_too_large",
      `That file is ${formatMegabytes(file.size)} MB. The limit is ${env.MAX_UPLOAD_MB} MB. Try compressing it or uploading fewer pages.`,
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    throw new ApiHttpError(400, "file_unreadable", "We couldn’t read that file. Try again.");
  }

  if (buffer.byteLength > maxBytes) {
    throw new ApiHttpError(
      413,
      "file_too_large",
      `That file is larger than the ${env.MAX_UPLOAD_MB} MB limit. Try compressing it or uploading fewer pages.`,
    );
  }

  const kind = detectFileKind(buffer.subarray(0, 16));
  if (!kind) {
    throw new ApiHttpError(
      415,
      "unsupported_file",
      "That file type isn’t supported. Upload a PDF, JPG, PNG, or WEBP.",
    );
  }

  const sourceLabel = sanitizeSourceLabel(file.name);
  const contentHash = hashBuffer(buffer);
  const fullPath = await storeUpload(buffer, kind);

  try {
    const outcome =
      kind === "pdf"
        ? await extractPdf({
            buffer,
            filePath: fullPath,
            contentHash,
            maxPages: env.MAX_PDF_PAGES,
          })
        : await extractImage(buffer, contentHash);

    return await insertForm({
      userId: options.userId,
      sourceType: kind === "pdf" ? "pdf" : "image",
      sourceLabel,
      contentHash,
      outcome,
      instructions: options.instructions,
    });
  } finally {
    scheduleUploadRemoval(fullPath);
  }
}
