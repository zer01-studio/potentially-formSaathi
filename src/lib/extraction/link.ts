import "server-only";
import { createHash } from "node:crypto";
import { ApiHttpError } from "@/lib/api/errors";
import { assertSafeRemoteUrl } from "@/lib/security/url-guard";

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

export type FetchedFormPage = {
  html: string;
  finalUrl: string;
  contentHash: string;
};

export async function fetchFormPage(rawUrl: string): Promise<FetchedFormPage> {
  let current = await assertSafeRemoteUrl(rawUrl);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    let response: Response;

    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "user-agent": "FormSaathiBot/0.1 (form reader; +https://formsaathi.example)",
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "accept-language": "en",
        },
      });
    } catch {
      throw new ApiHttpError(
        422,
        "url_unreachable",
        "We couldn’t open that link. Check it and try again, or upload a PDF or photo.",
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new ApiHttpError(
          422,
          "url_unreachable",
          "That link doesn’t lead anywhere we can read.",
        );
      }
      if (redirects === MAX_REDIRECTS) {
        throw new ApiHttpError(
          422,
          "too_many_redirects",
          "That link redirects too many times. Try the final page link.",
        );
      }

      current = await assertSafeRemoteUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new ApiHttpError(
        422,
        "url_unreachable",
        "We couldn’t open that link. It may need a sign-in, or it returned an error.",
      );
    }

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (
      contentType &&
      contentType !== "text/html" &&
      contentType !== "application/xhtml+xml"
    ) {
      throw new ApiHttpError(
        415,
        "unsupported_page",
        "That link isn’t a web page. Try a link that opens the form directly, or upload a PDF or photo.",
      );
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
      throw new ApiHttpError(
        413,
        "page_too_large",
        "That page is too large to read. Try a PDF or photo of the form.",
      );
    }

    const html = await readLimitedText(response, MAX_HTML_BYTES);

    return {
      html,
      finalUrl: current.toString(),
      contentHash: createHash("sha256").update(html).digest("hex"),
    };
  }

  throw new ApiHttpError(
    422,
    "url_unreachable",
    "We couldn’t open that link.",
  );
}

async function readLimitedText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ApiHttpError(
          413,
          "page_too_large",
          "That page is too large to read. Try a PDF or photo of the form.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
  );
}
