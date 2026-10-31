import "server-only";
import { recognizeImage } from "./ocr";

export type ScannedPdfText = {
  text: string;
  averageConfidence: number;
};

export async function ocrPdfPages(
  filePath: string,
  pageCount: number,
): Promise<ScannedPdfText> {
  const { pdf } = await import("pdf-to-img");
  const document = await pdf(filePath, { scale: 2 });
  let text = "";
  let confidenceTotal = 0;
  let processed = 0;

  try {
    const pages = Math.min(pageCount, document.length);

    for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
      const image = await document.getPage(pageNumber);
      const result = await recognizeImage(image);
      text += `${result.text}\n`;
      confidenceTotal += result.confidence;
      processed += 1;
    }
  } finally {
    await document.destroy();
  }

  return {
    text,
    averageConfidence: processed > 0 ? confidenceTotal / processed : 0,
  };
}
