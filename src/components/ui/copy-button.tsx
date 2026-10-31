"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  className,
  label = "Copy",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  if (!value) return null;

  async function handleCopy() {
    const copied = await copyText(value);
    setState(copied ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${label} answer`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        state === "copied" && "border-success/30 bg-success/10 text-success",
        state === "failed" && "border-danger/30 text-danger",
        className,
      )}
    >
      {state === "copied" ? (
        <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <Copy className="size-3" strokeWidth={2} aria-hidden="true" />
      )}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}
