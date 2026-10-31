import "server-only";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ApiHttpError } from "@/lib/api/errors";

export type PdfTextResult = {
  pageCount: number;
  text: string;
  lines: string[];
};

function unreadablePdfError(): ApiHttpError {
  return new ApiHttpError(
    422,
    "pdf_unreadable",
    "We couldn’t read that PDF. It may be password-protected or damaged.",
  );
}

export async function readPdfText(buffer: Buffer): Promise<PdfTextResult> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: pathToFileURL(
      `${path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")}${path.sep}`,
    ).href,
  });

  let document;
  try {
    document = await loadingTask.promise;
  } catch {
    await loadingTask.destroy().catch(() => undefined);
    throw unreadablePdfError();
  }

  try {
    const lines: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const byLine = new Map<number, Array<{ x: number; text: string }>>();

      for (const item of content.items) {
        if (!("str" in item)) continue;
        const text = item.str.trim();
        if (!text) continue;

        const y = Math.round(item.transform[5] / 2) * 2;
        const x = item.transform[4];
        const parts = byLine.get(y) ?? [];
        parts.push({ x, text });
        byLine.set(y, parts);
      }

      const orderedLines = [...byLine.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, parts]) =>
          parts
            .sort((a, b) => a.x - b.x)
            .map((part) => part.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean);

      lines.push(...orderedLines);
      page.cleanup();
    }

    return {
      pageCount: document.numPages,
      text: lines.join("\n"),
      lines,
    };
  } catch {
    throw unreadablePdfError();
  } finally {
    await document.cleanup().catch(() => undefined);
    await loadingTask.destroy().catch(() => undefined);
  }
}
