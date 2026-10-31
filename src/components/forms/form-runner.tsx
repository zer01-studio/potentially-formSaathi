"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Circle,
  CircleAlert,
  Download,
  FileJson,
  ListChecks,
  LoaderCircle,
  Mic,
  Pencil,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { FormDetailDto, FormFieldDto } from "@/lib/forms/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";
type Mode = "questions" | "review";
type Notice = { tone: "success" | "error"; message: string };

function firstOpenIndex(form: FormDetailDto): number {
  const requiredMissing = form.fields.findIndex(
    (field) => field.required && !form.answers[field.key],
  );
  if (requiredMissing >= 0) return requiredMissing;
  return form.fields.findIndex((field) => !form.answers[field.key]);
}

function applyAnswer(form: FormDetailDto, key: string, value: string): FormDetailDto {
  const answers = { ...form.answers };
  if (value) answers[key] = value;
  else delete answers[key];

  return { ...form, answers, answeredCount: Object.keys(answers).length };
}

const SOURCE_LABELS: Record<FormDetailDto["sourceType"], string> = {
  url: "Web link",
  pdf: "PDF",
  image: "Photo",
};

function AnswerInput({
  field,
  value,
  onChange,
  disabled,
  invalid,
  errorId,
}: {
  field: FormFieldDto;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  invalid: boolean;
  errorId?: string;
}) {
  const maxLength = Math.min(field.maxLength ?? 2000, 2000);

  if (field.type === "choice") {
    return (
      <select
        aria-label={field.plainQuestion}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={errorId}
        className={cn(
          "h-12 w-full rounded-xl border border-border bg-background/70 px-3.5 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-2 focus:ring-ring/20",
          invalid && "border-danger/60",
        )}
      >
        <option value="">Choose one</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "longtext") {
    return (
      <textarea
        aria-label={field.plainQuestion}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        rows={4}
        aria-invalid={invalid}
        aria-describedby={errorId}
        placeholder="Type your answer…"
        className={cn(
          "min-h-32 w-full resize-y rounded-2xl border border-border bg-background/70 px-3.5 py-3 text-[15px] leading-relaxed text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20",
          invalid && "border-danger/60",
        )}
      />
    );
  }

  const inputType =
    field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";
  const placeholder =
    field.type === "date"
      ? "DD/MM/YYYY"
      : field.type === "phone"
        ? "e.g. +91 98765 43210"
        : field.type === "number"
          ? "e.g. 45000"
          : "Type your answer…";

  return (
    <Input
      type={inputType}
      inputMode={
        field.type === "email"
          ? "email"
          : field.type === "phone"
            ? "tel"
            : field.type === "number"
              ? "decimal"
              : undefined
      }
      autoComplete={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "off"}
      aria-label={field.plainQuestion}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-invalid={invalid}
      aria-describedby={errorId}
      className={cn("h-12 text-[15px]", invalid && "border-danger/60")}
    />
  );
}

function initialView(form: FormDetailDto): {
  index: number;
  draft: string;
  mode: Mode;
} {
  const open = firstOpenIndex(form);
  if (open < 0) return { index: 0, draft: "", mode: "review" };
  return {
    index: open,
    draft: form.answers[form.fields[open].key] ?? "",
    mode: "questions",
  };
}

export function FormRunner({ formId }: { formId: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<FormDetailDto | null>(null);

  const [mode, setMode] = useState<Mode>("questions");
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [returnToReview, setReturnToReview] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    field: FormFieldDto;
    value: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fetchForm = useCallback(async (signal?: AbortSignal) => {
    const data = await apiRequest<{ form: FormDetailDto }>(
      `/api/v1/forms/${formId}`,
      { signal },
    );
    return data.form;
  }, [formId]);

  useEffect(() => {
    const controller = new AbortController();

    fetchForm(controller.signal)
      .then((nextForm) => {
        setForm(nextForm);
        const view = initialView(nextForm);
        setIndex(view.index);
        setDraft(view.draft);
        setMode(view.mode);
        setLoadState("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t open this form. Please try again.",
        );
        setLoadState("error");
      });

    return () => controller.abort();
  }, [fetchForm]);

  function retryLoad() {
    setLoadState("loading");
    setLoadError("");
    fetchForm()
      .then((nextForm) => {
        setForm(nextForm);
        const view = initialView(nextForm);
        setIndex(view.index);
        setDraft(view.draft);
        setMode(view.mode);
        setLoadState("ready");
      })
      .catch((error) => {
        setLoadError(
          error instanceof ApiClientError
            ? error.message
            : "We couldn’t open this form. Please try again.",
        );
        setLoadState("error");
      });
  }

  function goToField(nextIndex: number) {
    if (!form) return;
    setIndex(nextIndex);
    setDraft(form.answers[form.fields[nextIndex].key] ?? "");
    setFieldError(null);
    setConfirmation(null);
    setMode("questions");
  }

  function advanceFrom(currentIndex: number, currentForm: FormDetailDto) {
    const next = currentForm.fields.findIndex(
      (field, fieldIndex) =>
        fieldIndex > currentIndex && !currentForm.answers[field.key],
    );
    if (next >= 0) {
      setIndex(next);
      setDraft(currentForm.answers[currentForm.fields[next].key] ?? "");
      setFieldError(null);
      setConfirmation(null);
      setMode("questions");
      return;
    }
    setConfirmation(null);
    setMode("review");
  }

  async function handleSave() {
    if (!form || !field || saving) return;

    if (!draft.trim() && !field.required) {
      handleSkip();
      return;
    }

    setSaving(true);
    setFieldError(null);
    setNotice(null);

    try {
      const data = await apiRequest<{
        answer: { fieldKey: string; value: string; updatedAt: string | null };
      }>(`/api/v1/forms/${formId}/answers/${field.key}`, {
        method: "PATCH",
        body: { value: draft },
      });

      const updated = applyAnswer(form, data.answer.fieldKey, data.answer.value);
      setForm(updated);
      setConfirmation({ field, value: data.answer.value });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFieldError(error.fieldErrors?.[field.key] ?? error.message);
      } else {
        setFieldError("We couldn’t save that answer. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleConfirm() {
    if (!form) return;
    if (returnToReview) {
      setConfirmation(null);
      setReturnToReview(false);
      setMode("review");
      return;
    }
    advanceFrom(index, form);
  }

  function handleSkip() {
    if (!form || !field || field.required) return;
    setFieldError(null);
    setConfirmation(null);
    if (returnToReview) {
      setReturnToReview(false);
      setMode("review");
      return;
    }
    advanceFrom(index, form);
  }

  function handleEditFromReview(target: FormFieldDto) {
    if (!form) return;
    const targetIndex = form.fields.findIndex((field) => field.key === target.key);
    if (targetIndex < 0) return;
    setIndex(targetIndex);
    setDraft(form.answers[target.key] ?? "");
    setFieldError(null);
    setConfirmation(null);
    setNotice(null);
    setReturnToReview(true);
    setMode("questions");
  }

  function backToQuestions() {
    if (!form) return;
    const open = firstOpenIndex(form);
    const target = open >= 0 ? open : 0;
    setReturnToReview(false);
    goToField(target);
  }

  function previousQuestion() {
    if (index <= 0) return;
    goToField(index - 1);
  }

  async function handleExport() {
    if (!form || exporting) return;
    setExporting(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/v1/forms/${formId}/export`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setNotice({
          tone: "error",
          message:
            payload?.error?.message ??
            "A few answers still need attention before we can generate the form.",
        });
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName =
        /filename="([^"]+)"/.exec(disposition)?.[1] ?? "formsaathi-form-answers.json";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setNotice({
        tone: "success",
        message: "Your completed form was downloaded as a JSON file.",
      });
    } catch {
      setNotice({
        tone: "error",
        message: "We couldn’t generate the file. Please try again in a moment.",
      });
    } finally {
      setExporting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
        <div className="mt-6 h-9 w-2/3 animate-pulse rounded-full bg-muted" />
        <div className="mt-3 h-3 w-1/3 animate-pulse rounded-full bg-muted" />
        <div className="mt-8 rounded-[28px] border border-border bg-card p-7 shadow-soft">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
          <div className="mt-6 h-8 w-4/5 animate-pulse rounded-full bg-muted" />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded-full bg-muted/80" />
          <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-muted/70" />
          <div className="mt-6 h-11 w-40 animate-pulse rounded-full bg-muted/80" />
        </div>
      </div>
    );
  }

  if (loadState === "error" || !form) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="rounded-[28px] border border-border bg-card p-8 text-center shadow-soft">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <CircleAlert className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-medium text-foreground">
            We couldn’t open this form
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {loadError}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" onClick={retryLoad}>
              Try again
            </Button>
            <Link href="/workspace" className={buttonStyles({ variant: "ghost" })}>
              Back to workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const field = form.fields[index] ?? null;
  const requiredMissing = form.fields.filter(
    (item) => item.required && !form.answers[item.key],
  ).length;
  const progress =
    form.fieldCount > 0
      ? Math.round((form.answeredCount / form.fieldCount) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Link
        href="/workspace"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Workspace
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
          {SOURCE_LABELS[form.sourceType]}
        </span>
        {form.demoFallback ? (
          <span className="rounded-full border border-accent/40 bg-accent-soft/50 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-accent-strong">
            Sample form
          </span>
        ) : null}
        <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
          {form.answeredCount} of {form.fieldCount} answered
        </span>
      </div>

      <h1 className="mt-4 font-display text-[1.9rem] font-medium leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[2.35rem]">
        {form.title}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        From {form.sourceLabel}. Your answers save as you go.
      </p>

      {form.demoFallback ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-[12px] leading-relaxed text-foreground/85">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            {form.extractionNote ??
              "This is a bundled sample form because the uploaded document couldn’t be read."}
          </span>
        </div>
      ) : null}

      {mode === "questions" && field ? (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-card shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-6 py-4 sm:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Question {index + 1} of {form.fields.length}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em]",
                  field.required
                    ? "bg-accent-soft/60 text-accent-strong"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {field.required ? "Required" : "Optional"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setConfirmation(null);
                  setReturnToReview(false);
                  setMode("review");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ListChecks className="size-3" aria-hidden="true" />
                Review
              </button>
            </div>
          </div>

          <div className="h-1 bg-muted">
            <div
              className="h-full bg-accent-strong/80 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="min-h-[330px] px-6 py-6 sm:px-8 sm:py-7">
            {confirmation ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 26 }}
                  role="status"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="size-5" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-display text-[1.8rem] font-medium leading-tight text-foreground">
                    Saved. Does this look right?
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {confirmation.field.plainQuestion}
                  </p>
                  <div className="mt-4 rounded-2xl border border-border bg-background/60 px-4 py-3 text-[15px] leading-relaxed text-foreground">
                    {confirmation.value}
                  </div>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <Button onClick={handleConfirm}>
                      {returnToReview ? "Looks right — back to review" : "Looks right — next"}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmation(null)}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit this answer
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`field-${field.key}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <h2 className="font-display text-[1.75rem] font-medium leading-[1.15] tracking-[-0.01em] text-foreground sm:text-[2rem]">
                    {field.plainQuestion}
                  </h2>
                  {field.helpText ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {field.helpText}
                    </p>
                  ) : null}

                  <details className="group mt-4 rounded-xl border border-border/70 bg-background/40 px-3.5 py-2.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                      Original wording
                      <ChevronDown
                        className="size-3.5 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="mt-2 font-mono text-[12px] leading-relaxed text-foreground/75">
                      {field.question}
                    </p>
                  </details>

                  <div className="mt-5 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <AnswerInput
                        field={field}
                        value={draft}
                        onChange={(value) => {
                          setDraft(value);
                          if (fieldError) setFieldError(null);
                        }}
                        disabled={saving}
                        invalid={Boolean(fieldError)}
                        errorId={fieldError ? "answer-error" : undefined}
                      />
                    </div>
                    {field.type !== "choice" ? (
                      <button
                        type="button"
                        disabled
                        title="Voice answers arrive in Phase 4"
                        aria-label="Answer by voice (coming soon)"
                        className="inline-flex size-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground opacity-70"
                      >
                        <Mic className="size-4.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  {field.type !== "choice" ? (
                    <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                      Voice answers are coming in a later phase.
                    </p>
                  ) : null}

                  {fieldError ? (
                    <p
                      id="answer-error"
                      role="alert"
                      className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[12px] leading-relaxed text-danger"
                    >
                      {fieldError}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    {index > 0 && !returnToReview ? (
                      <Button variant="ghost" onClick={previousQuestion} disabled={saving}>
                        <ChevronLeft className="size-3.5" aria-hidden="true" />
                        Previous
                      </Button>
                    ) : null}
                    {returnToReview ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setReturnToReview(false);
                          setMode("review");
                          setFieldError(null);
                        }}
                        disabled={saving}
                      >
                        Back to review
                      </Button>
                    ) : null}
                    <span className="hidden flex-1 sm:block" />
                    {!field.required ? (
                      <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                        Skip for now
                      </Button>
                    ) : null}
                    <Button onClick={() => void handleSave()} disabled={saving}>
                      {saving ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Save answer
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </motion.div>
              )}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[1.4rem] font-medium text-foreground">
                  Review your answers
                </h2>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {requiredMissing === 0
                    ? "Every required question is answered. Give them one last look."
                    : `${requiredMissing} required ${
                        requiredMissing === 1 ? "question still needs" : "questions still need"
                      } an answer.`}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={backToQuestions}>
                Back to questions
              </Button>
            </div>

            <ul className="mt-5 divide-y divide-border/70">
              {form.fields.map((item) => {
                const value = form.answers[item.key];
                const missingRequired = item.required && !value;

                return (
                  <li key={item.key} className="flex items-start gap-3 py-3.5">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                        value
                          ? "border-success/30 bg-success/10 text-success"
                          : missingRequired
                            ? "border-danger/30 bg-danger/10 text-danger"
                            : "border-border text-muted-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {value ? (
                        <Check className="size-3" strokeWidth={2.5} />
                      ) : (
                        <Circle className="size-2.5" strokeWidth={2.5} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground">
                        {item.plainQuestion}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 break-words text-[12.5px] leading-relaxed",
                          value ? "text-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {value
                          ? value
                          : missingRequired
                            ? "Not answered yet"
                            : "Skipped (optional)"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditFromReview(item)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-2.5" aria-hidden="true" />
                      Edit
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 font-display text-[1.3rem] font-medium text-foreground">
                  <FileJson className="size-4 text-accent-strong" aria-hidden="true" />
                  Generate completed form
                </h2>
                <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                  Every answer is checked once more, then you’ll get a structured
                  JSON file you can keep or hand over.
                </p>
              </div>
              <Button onClick={() => void handleExport()} disabled={exporting}>
                {exporting ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                Download JSON
              </Button>
            </div>

            {notice ? (
              <p
                role={notice.tone === "error" ? "alert" : "status"}
                className={cn(
                  "mt-4 rounded-xl border px-3.5 py-2.5 text-[12px] leading-relaxed",
                  notice.tone === "error"
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-success/30 bg-success/10 text-success",
                )}
              >
                {notice.message}
              </p>
            ) : null}

            <p className="mt-3 text-[10.5px] text-muted-foreground">
              PDF output is intentionally not included yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
