import "server-only";
import { createHash } from "node:crypto";
import { ApiHttpError } from "@/lib/api/errors";
import { services } from "@/lib/env";
import {
  buildFields,
  inferTitle,
  splitQuestionCandidates,
} from "@/lib/forms/field-rules";
import { getDemoForm } from "@/lib/forms/sample-forms";
import { logWarn } from "@/lib/security/log";
import { extractionCache } from "./cache";
import { recognizeImage } from "./ocr";
import { readPdfText } from "./pdf-text";
import type { ExtractionOutcome } from "./results";
import { ocrPdfPages } from "./scanned-pdf";

export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function demoOutcome(seed: string, note: string): ExtractionOutcome {
  const sample = getDemoForm(seed);
  return {
    title: sample.title,
    fields: sample.fields,
    mode: "demo",
    demoFallback: true,
    note,
  };
}

function outcomeFromText(
  text: string,
  titleFallback: string,
  mode: "text" | "ocr",
): ExtractionOutcome | null {
  const questions = splitQuestionCandidates(text);
  if (questions.length === 0) return null;

  const fields = buildFields(questions.map((question) => ({ question })));
  if (fields.length === 0) return null;

  return {
    title: inferTitle(text, titleFallback),
    fields,
    mode,
    demoFallback: false,
  };
}

export async function extractImage(
  buffer: Buffer,
  contentHash: string,
): Promise<ExtractionOutcome> {
  const cached = extractionCache.get(contentHash);
  if (cached) return { ...cached, demoFallback: false };

  if (!services.ocr) {
    return demoOutcome(
      contentHash,
      "Local OCR isn’t enabled, so we’ve loaded a bundled sample form. Set OCR_PROVIDER=tesseract to read uploads.",
    );
  }

  try {
    const { text } = await recognizeImage(buffer);
    const outcome = outcomeFromText(text, "Image form", "ocr");

    if (outcome) {
      extractionCache.set(contentHash, {
        title: outcome.title,
        fields: outcome.fields,
        mode: "ocr",
      });
      return outcome;
    }

    logWarn("extraction.no_questions", { source: "image", mode: "ocr" });
    return demoOutcome(
      contentHash,
      "We read the image, but couldn’t find clear form questions. Try a clearer, tightly-cropped screenshot, or upload the original PDF.",
    );
  } catch (error) {
    logWarn("extraction.ocr_failed", {
      source: "image",
      error: error instanceof Error ? error.name : "unknown",
    });
    return demoOutcome(
      contentHash,
      "OCR couldn’t read that image, so here’s a bundled sample form. Check that OCR is available, or try a PDF or a clearer photo.",
    );
  }
}

export async function extractPdf(options: {
  buffer: Buffer;
  filePath: string;
  contentHash: string;
  maxPages: number;
}): Promise<ExtractionOutcome> {
  const { buffer, filePath, contentHash, maxPages } = options;

  const cached = extractionCache.get(contentHash);
  if (cached) return { ...cached, demoFallback: false };

  const pdf = await readPdfText(buffer);

  if (pdf.pageCount > maxPages) {
    throw new ApiHttpError(
      422,
      "too_many_pages",
      `This PDF has ${pdf.pageCount} pages. The limit is ${maxPages}. Please upload a shorter PDF.`,
    );
  }

  if (pdf.text.trim().length >= 20) {
    const outcome = outcomeFromText(pdf.text, "PDF form", "text");
    if (outcome) {
      extractionCache.set(contentHash, {
        title: outcome.title,
        fields: outcome.fields,
        mode: "text",
      });
      return outcome;
    }
  }

  if (!services.ocr) {
    return demoOutcome(
      contentHash,
      "This PDF has no readable text layer, and local OCR isn’t enabled, so we’ve loaded a bundled sample form.",
    );
  }

  try {
    const { text } = await ocrPdfPages(filePath, pdf.pageCount);
    const outcome = outcomeFromText(text, "Scanned PDF form", "ocr");

    if (outcome) {
      extractionCache.set(contentHash, {
        title: outcome.title,
        fields: outcome.fields,
        mode: "ocr",
      });
      return outcome;
    }

    logWarn("extraction.no_questions", { source: "pdf", mode: "ocr" });
    return demoOutcome(
      contentHash,
      "We read the scanned PDF, but couldn’t find clear form questions. Try a clearer scan or a PDF with a text layer.",
    );
  } catch (error) {
    logWarn("extraction.ocr_failed", {
      source: "pdf",
      error: error instanceof Error ? error.name : "unknown",
    });
    return demoOutcome(
      contentHash,
      "OCR couldn’t read this scanned PDF, so here’s a bundled sample form. Try a clearer scan or a PDF with selectable text.",
    );
  }
}
