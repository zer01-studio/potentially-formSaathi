import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createWorker } from "tesseract.js";

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<OcrWorker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

const RECOGNIZE_TIMEOUT_MS = 45_000;

async function createOcrWorker(): Promise<OcrWorker> {
  const cachePath = path.join(process.cwd(), ".data", "tesseract");
  const options: { cachePath?: string } = {};

  try {
    await mkdir(cachePath, { recursive: true });
    options.cachePath = cachePath;
  } catch {
    // Fall back to Tesseract's default cache location.
  }

  return createWorker("eng", 1, options);
}

function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = createOcrWorker().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export type OcrResult = {
  text: string;
  confidence: number;
};

/** Runs one OCR job at a time and reuses the worker between requests. */
export async function recognizeImage(image: Buffer): Promise<OcrResult> {
  const job = queue.then(async () => {
    const worker = await getWorker();
    let timer: NodeJS.Timeout | undefined;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("ocr_timeout")),
          RECOGNIZE_TIMEOUT_MS,
        );
      });

      const result = await Promise.race([worker.recognize(image), timeout]);
      return {
        text: result.data.text ?? "",
        confidence: result.data.confidence ?? 0,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "ocr_timeout") {
        workerPromise = null;
        await worker.terminate().catch(() => undefined);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  });

  queue = job.then(
    () => undefined,
    () => undefined,
  );

  return job;
}
