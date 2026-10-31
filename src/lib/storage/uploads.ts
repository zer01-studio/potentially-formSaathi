import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { logWarn } from "@/lib/security/log";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export type DetectedFileKind = "pdf" | "image/jpeg" | "image/png" | "image/webp";

function startsWithBytes(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function detectFileKind(bytes: Uint8Array): DetectedFileKind | null {
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWithBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

export function extensionForKind(kind: DetectedFileKind): string {
  switch (kind) {
    case "pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

export function sanitizeSourceLabel(name: string): string {
  const base = path.basename(name || "Uploaded file");
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  return cleaned || "Uploaded file";
}

export async function storeUpload(
  buffer: Buffer,
  kind: DetectedFileKind,
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${randomUUID()}.${extensionForKind(kind)}`;
  const fullPath = path.join(UPLOAD_DIR, fileName);
  await writeFile(fullPath, buffer, { mode: 0o600 });
  return fullPath;
}

export async function removeUpload(fullPath: string): Promise<void> {
  try {
    await unlink(fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logWarn("upload.delete_failed", {
        error: error instanceof Error ? error.name : "unknown",
      });
    }
  }
}

function uploadRetentionMs(): number {
  const raw = process.env.UPLOAD_RETENTION_MINUTES;
  if (!raw) return 0;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.floor(minutes * 60_000);
}

/**
 * Uploads are deleted right after processing by default. Set the optional
 * UPLOAD_RETENTION_MINUTES env var to keep them longer (documented in README).
 */
export function scheduleUploadRemoval(fullPath: string): void {
  const retentionMs = uploadRetentionMs();
  if (retentionMs <= 0) {
    void removeUpload(fullPath);
    return;
  }

  const timer = setTimeout(() => {
    void removeUpload(fullPath);
  }, retentionMs);
  timer.unref?.();
}
