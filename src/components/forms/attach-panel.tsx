"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { FormSummaryDto } from "@/lib/forms/types";
import { cn } from "@/lib/utils";

type AttachTab = "link" | "image" | "pdf";

const TABS: Array<{ id: AttachTab; label: string; icon: typeof Link2 }> = [
  { id: "link", label: "Link", icon: Link2 },
  { id: "image", label: "Photo", icon: ImageIcon },
  { id: "pdf", label: "PDF", icon: FileText },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachPanel({
  maxUploadMb,
  maxPdfPages,
}: {
  maxUploadMb: number;
  maxPdfPages: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<AttachTab>("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetFeedback() {
    setError(null);
  }

  function selectTab(nextTab: AttachTab) {
    if (pending) return;
    setTab(nextTab);
    setFile(null);
    resetFeedback();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    resetFeedback();
  }

  async function goToForm(form: FormSummaryDto) {
    router.push(`/workspace/forms/${form.id}`);
    router.refresh();
  }

  async function handleLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!url.trim()) {
      setError("Paste the form link first.");
      return;
    }

    setPending(true);
    resetFeedback();

    try {
      const data = await apiRequest<{ form: FormSummaryDto }>("/api/v1/forms/from-url", {
        method: "POST",
        body: { url: url.trim() },
      });
      await goToForm(data.form);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? (err.fieldErrors?.url ?? err.message)
          : "We couldn’t read that link. Please try again.",
      );
      setPending(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setPending(true);
    resetFeedback();

    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiRequest<{ form: FormSummaryDto }>("/api/v1/forms/from-file", {
        method: "POST",
        formData,
      });
      await goToForm(data.form);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "We couldn’t read that file. Please try again.",
      );
      setPending(false);
    }
  }

  const acceptForTab =
    tab === "pdf"
      ? "application/pdf,.pdf"
      : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

  return (
    <section className="rounded-[26px] border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[1.4rem] font-medium text-foreground">
            Attach a form
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a link, or upload a photo or PDF. We’ll do the reading.
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Choose how to attach your form"
        className="mt-6 inline-flex w-full gap-1 rounded-full border border-border bg-background/60 p-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`attach-panel-${id}`}
            onClick={() => selectTab(id)}
            disabled={pending}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium transition-all duration-200",
              tab === id
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "link" ? (
        <form
          id="attach-panel-link"
          role="tabpanel"
          onSubmit={handleLinkSubmit}
          className="mt-5 space-y-3"
          noValidate
        >
          <Field label="Form link" htmlFor="form-url" hint="http:// or https://">
            <Input
              id="form-url"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com/application-form"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                resetFeedback();
              }}
              maxLength={2048}
              disabled={pending}
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Public pages only. Private and internal addresses are blocked.
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Reading the form…
                </>
              ) : (
                <>
                  Read this form
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <form
          id={`attach-panel-${tab}`}
          role="tabpanel"
          onSubmit={handleUpload}
          className="mt-5 space-y-3"
          noValidate
        >
          <input
            ref={fileInputRef}
            id="form-file"
            name="file"
            type="file"
            accept={acceptForTab}
            className="sr-only"
            disabled={pending}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />

          <label
            htmlFor="form-file"
            onDragOver={(event) => {
              event.preventDefault();
              if (!pending) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              if (pending) return;
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) chooseFile(dropped);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition-colors duration-200",
              dragActive
                ? "border-accent-strong bg-accent-soft/30"
                : "border-border-strong/60 bg-background/40 hover:bg-muted/40",
              pending && "pointer-events-none opacity-60",
            )}
          >
            <span className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-primary shadow-soft">
              <UploadCloud className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="mt-3 text-sm font-medium text-foreground">
              Choose a {tab === "pdf" ? "PDF" : "photo"}
            </span>
            <span className="mt-1 text-[11.5px] text-muted-foreground">
              {tab === "pdf"
                ? "or drag it here · up to " + maxPdfPages + " pages"
                : "JPG, PNG, or WEBP · or drag it here"}
            </span>
          </label>

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5">
              <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-[10.5px] text-muted-foreground">
                  {formatFileSize(file.size)} · checked by file content
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove selected file"
                onClick={() => {
                  chooseFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={pending}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Limits: {maxUploadMb} MB, {maxPdfPages} PDF pages. Uploads are
              stored privately and deleted after reading.
            </p>
            <Button type="submit" disabled={pending || !file}>
              {pending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Reading the form…
                </>
              ) : (
                <>
                  Read this form
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-danger"
        >
          {error}
        </div>
      ) : null}

      {pending ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Photos can take a few seconds to read. Please keep this tab open.
        </p>
      ) : null}
    </section>
  );
}
