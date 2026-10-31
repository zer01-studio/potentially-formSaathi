import "server-only";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { ApiHttpError } from "@/lib/api/errors";

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];
const ALLOWED_PORTS = new Set(["", "80", "443"]);

function blockedUrlError(): ApiHttpError {
  return new ApiHttpError(
    403,
    "url_blocked",
    "For safety, FormSaathi can’t open private, internal, or unusual addresses. Try a public form link, or upload a PDF or photo.",
  );
}

function unreachableError(): ApiHttpError {
  return new ApiHttpError(
    422,
    "url_unreachable",
    "We couldn’t find that website. Check the link and try again.",
  );
}

export function isPublicIpAddress(address: string): boolean {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }

  if (parsed.kind() === "ipv6") {
    const ipv6 = parsed as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) {
      parsed = ipv6.toIPv4Address();
    }
  }

  return parsed.range() === "unicast";
}

async function assertHostIsPublic(hostname: string): Promise<void> {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) throw blockedUrlError();

  if (
    host === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw blockedUrlError();
  }

  if (ipaddr.isValid(host)) {
    if (!isPublicIpAddress(host)) throw blockedUrlError();
    return;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw unreachableError();
  }

  if (records.length === 0) throw unreachableError();
  if (records.some((record) => !isPublicIpAddress(record.address))) {
    throw blockedUrlError();
  }
}

export function parseSafeHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ApiHttpError(
      400,
      "invalid_url",
      "That link doesn’t look like a valid web address.",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiHttpError(
      400,
      "invalid_url",
      "Use a link that starts with http:// or https://.",
    );
  }

  if (url.username || url.password) throw blockedUrlError();
  if (!ALLOWED_PORTS.has(url.port)) throw blockedUrlError();
  if (url.hostname.length > 253) throw blockedUrlError();

  return url;
}

export async function assertSafeRemoteUrl(rawUrl: string): Promise<URL> {
  const url = parseSafeHttpUrl(rawUrl);
  await assertHostIsPublic(url.hostname);
  return url;
}
