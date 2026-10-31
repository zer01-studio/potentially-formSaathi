"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
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
  Square,
  Volume2,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { useFormVoice } from "@/components/voice/use-form-voice";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { FormDetailDto, FormFieldDto } from "@/lib/forms/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";
type Mode = "questions" | "review";
type Notice = { tone: "success" | "error"; message: string };

type FormStep = {
  key: string;
  title: string;
  fields: FormFieldDto[];
};

function buildSteps(fields: FormFieldDto[]): FormStep[] {
  const steps: FormStep[] = [];
  const byKey = new Map<string, FormStep>();

  for (const field of fields) {
    const stepKey =
      typeof field.step === "number" ? `step-${field.step}` : `field-${field.key}`;
    const existing = byKey.get(stepKey);
    if (existing) {
      existing.fields.push(field);
      continue;
    }

    const step: FormStep = {
      key: stepKey,
      title: field.stepTitle?.trim() || field.plainQuestion,
      fields: [field],
    };
    byKey.set(stepKey, step);
    steps.push(step);
  }

  return steps;
}

function draftFor(form: FormDetailDto, field: FormFieldDto): string {
  return form.answers[field.key] ?? form.suggestedAnswers?.[field.key] ?? "";
}

function draftsFor(
  form: FormDetailDto,
  fields: FormFieldDto[],
): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.key, draftFor(form, field)]));
}

function firstOpenStepIndex(form: FormDetailDto, steps: FormStep[]): number {
  const requiredMissing = steps.findIndex((step) =>
    step.fields.some((field) => field.required && !form.answers[field.key]),
  );
  if (requiredMissing >= 0) return requiredMissing;
  return steps.findIndex((step) =>
    step.fields.some((field) => !form.answers[field.key]),
  );
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
  stepIndex: number;
  drafts: Record<string, string>;
  mode: Mode;
} {
  const steps = buildSteps(form.fields);
  const open = firstOpenStepIndex(form, steps);
  if (open < 0) return { stepIndex: 0, drafts: {}, mode: "review" };
  return {
    stepIndex: open,
    drafts: draftsFor(form, steps[open].fields),
    mode: "questions",
  };
}

export function FormRunner({ formId }: { formId: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<FormDetailDto | null>(null);

  const [mode, setMode] = useState<Mode>("questions");
  const [stepIndex, setStepIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [returnToReview, setReturnToReview] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    values: Array<{ field: FormFieldDto; value: string }>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const steps = form ? buildSteps(form.fields) : [];
  const step = steps[stepIndex] ?? null;
  const singleField = step && step.fields.length === 1 ? step.fields[0] : null;
  const spokenText = confirmation
    ? "Saved. Does this look right?"
    : (step?.title ?? "");

  const voice = useFormVoice({
    onTranscript: (text) => {
      if (!step) return;
      const target =
        step.fields.find((item) => item.type !== "choice") ?? step.fields[0];
      setDrafts((current) => ({ ...current, [target.key]: text }));
      setFieldErrors({});
    },
  });
  const { canSpeak: voiceCanSpeak, speak: speakAloud } = voice;
  const lastSpokenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!voiceCanSpeak || mode !== "questions" || !step) return;

    const key = confirmation
      ? `confirmation:${confirmation.title}:${confirmation.values
          .map((entry) => entry.value)
          .join("|")}`
      : `step:${step.key}`;
    if (lastSpokenKeyRef.current === key) return;
    lastSpokenKeyRef.current = key;
    void speakAloud(spokenText);
  }, [confirmation, mode, spokenText, step, voiceCanSpeak, speakAloud]);

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
        setStepIndex(view.stepIndex);
        setDrafts(view.drafts);
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
        setStepIndex(view.stepIndex);
        setDrafts(view.drafts);
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

  function goToStep(nextIndex: number, currentForm: FormDetailDto) {
    const nextSteps = buildSteps(currentForm.fields);
    const target = nextSteps[nextIndex];
    if (!target) return;
    setStepIndex(nextIndex);
    setDrafts(draftsFor(currentForm, target.fields));
    setFieldErrors({});
    setConfirmation(null);
    setMode("questions");
  }

  function advanceFrom(currentStepIndex: number, currentForm: FormDetailDto) {
    const currentSteps = buildSteps(currentForm.fields);
    const next = currentSteps.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > currentStepIndex &&
        candidate.fields.some((item) => !currentForm.answers[item.key]),
    );
    if (next >= 0) {
      goToStep(next, currentForm);
      return;
    }
    setConfirmation(null);
    setMode("review");
  }

  async function handleSave() {
    if (!form || !step || saving) return;

    const missingRequired = step.fields.filter(
      (item) => item.required && !(drafts[item.key] ?? "").trim(),
    );
    if (missingRequired.length > 0) {
      setFieldErrors(
        Object.fromEntries(
          missingRequired.map((item) => [
            item.key,
            "Please answer this required question.",
          ]),
        ),
      );
      return;
    }

    const targets = step.fields.filter(
      (item) => (drafts[item.key] ?? "").trim() || form.answers[item.key],
    );
    if (targets.length === 0) {
      handleSkip();
      return;
    }

    setSaving(true);
    setFieldErrors({});
    setNotice(null);

    let currentForm = form;
    let activeKey = targets[0]?.key ?? "";
    const saved: Array<{ field: FormFieldDto; value: string }> = [];

    try {
      for (const target of targets) {
        activeKey = target.key;
        const data = await apiRequest<{
          answer: { fieldKey: string; value: string; updatedAt: string | null };
        }>(`/api/v1/forms/${formId}/answers/${target.key}`, {
          method: "PATCH",
          body: { value: drafts[target.key] ?? "" },
        });

        currentForm = applyAnswer(
          currentForm,
          data.answer.fieldKey,
          data.answer.value,
        );
        if (data.answer.value) {
          saved.push({ field: target, value: data.answer.value });
        }
      }

      setForm(currentForm);
      if (saved.length > 0) {
        setConfirmation({ title: step.title, values: saved });
      } else {
        advanceFrom(stepIndex, currentForm);
      }
    } catch (error) {
      setForm(currentForm);
      if (error instanceof ApiClientError) {
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        } else {
          setFieldErrors({ [activeKey]: error.message });
        }
      } else {
        setFieldErrors({
          [activeKey]: "We couldn’t save those answers. Please try again.",
        });
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
    advanceFrom(stepIndex, form);
  }

  function handleSkip() {
    if (!form || !step) return;
    if (step.fields.some((item) => item.required)) return;
    setFieldErrors({});
    setConfirmation(null);
    if (returnToReview) {
      setReturnToReview(false);
      setMode("review");
      return;
    }
    advanceFrom(stepIndex, form);
  }

  function handleEditFromReview(target: FormFieldDto) {
    if (!form) return;
    const targetStepIndex = steps.findIndex((item) =>
      item.fields.some((field) => field.key === target.key),
    );
    if (targetStepIndex < 0) return;
    setStepIndex(targetStepIndex);
    setDrafts(draftsFor(form, steps[targetStepIndex].fields));
    setFieldErrors({});
    setConfirmation(null);
    setNotice(null);
    setReturnToReview(true);
    setMode("questions");
  }

  function backToQuestions() {
    if (!form) return;
    const open = firstOpenStepIndex(form, steps);
    const target = open >= 0 ? open : 0;
    setReturnToReview(false);
    goToStep(target, form);
  }

  function previousQuestion() {
    if (!form || stepIndex <= 0) return;
    goToStep(stepIndex - 1, form);
  }

  function updateDraft(key: string, value: string) {
    setDrafts((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (voice.voiceError) voice.clearVoiceError();
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
        {form.aiEnhanced ? (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary">
            AI simplified
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

      {form.aiInstructions ? (
        <details className="group mt-4 rounded-2xl border border-border/70 bg-card/50 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Notes for the assistant
            <ChevronDown
              className="size-3.5 transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-2 text-[12px] leading-relaxed text-foreground/80">
            {form.aiInstructions}
          </p>
        </details>
      ) : null}

      {mode === "questions" && step ? (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-border bg-card shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-6 py-4 sm:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <div className="flex items-center gap-2">
              {voice.canSpeak ? (
                <button
                  type="button"
                  onClick={() => void voice.speak(spokenText)}
                  aria-label={voice.speaking ? "Replay aloud" : "Play aloud"}
                  title={voice.speaking ? "Reading aloud" : "Play this aloud"}
                  className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {voice.speaking ? (
                    <AudioLines className="size-3" aria-hidden="true" />
                  ) : (
                    <Volume2 className="size-3" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">
                    {voice.speaking ? "Reading" : "Play"}
                  </span>
                </button>
              ) : null}
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em]",
                  step.fields.some((item) => item.required)
                    ? "bg-accent-soft/60 text-accent-strong"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {step.fields.some((item) => item.required)
                  ? "Required"
                  : "Optional"}
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
                    {confirmation.title}
                  </p>
                  <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
                        Your {confirmation.values.length === 1 ? "answer" : "answers"} · paste into the original form
                      </span>
                      {confirmation.values.length === 1 ? (
                        <CopyButton value={confirmation.values[0].value} />
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-3">
                      {confirmation.values.map((entry) => (
                        <div key={entry.field.key}>
                          {confirmation.values.length > 1 ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-foreground/80">
                                {entry.field.label ?? entry.field.plainQuestion}
                              </span>
                              <CopyButton value={entry.value} />
                            </div>
                          ) : null}
                          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground">
                            {entry.value}
                          </pre>
                        </div>
                      ))}
                    </div>
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
                      {confirmation.values.length === 1
                        ? "Edit this answer"
                        : "Keep editing"}
                    </Button>
                  </div>
                </motion.div>
              ) : singleField ? (
                <motion.div
                  key={`step-${step.key}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <h2 className="font-display text-[1.75rem] font-medium leading-[1.15] tracking-[-0.01em] text-foreground sm:text-[2rem]">
                    {singleField.plainQuestion}
                  </h2>
                  {singleField.helpText ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {singleField.helpText}
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
                      {singleField.question}
                    </p>
                  </details>

                  <div className="mt-5 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <AnswerInput
                        field={singleField}
                        value={drafts[singleField.key] ?? ""}
                        onChange={(value) => updateDraft(singleField.key, value)}
                        disabled={saving}
                        invalid={Boolean(fieldErrors[singleField.key])}
                        errorId={
                          fieldErrors[singleField.key]
                            ? "answer-error"
                            : undefined
                        }
                      />
                    </div>
                    {singleField.type !== "choice" ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (voice.recording) {
                            voice.stopRecording();
                          } else {
                            void voice.startRecording();
                          }
                        }}
                        disabled={!voice.canRecord || saving}
                        title={
                          !voice.voiceRepliesEnabled
                            ? "Turn on Voice replies to speak answers"
                            : !voice.sttAvailable
                              ? "Speech-to-text isn’t configured"
                              : voice.transcribing
                                ? "Transcribing…"
                                : voice.recording
                                  ? "Stop recording"
                                  : "Answer by voice"
                        }
                        aria-label={
                          voice.recording ? "Stop recording" : "Answer by voice"
                        }
                        className={cn(
                          "inline-flex size-12 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,color,box-shadow] duration-200",
                          voice.canRecord
                            ? "border-primary/30 bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5"
                            : "cursor-not-allowed border-border bg-muted/60 text-muted-foreground opacity-70",
                          voice.recording && "bg-danger text-white",
                        )}
                      >
                        {voice.transcribing ? (
                          <LoaderCircle
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : voice.recording ? (
                          <Square className="size-4" aria-hidden="true" />
                        ) : (
                          <Mic className="size-4.5" aria-hidden="true" />
                        )}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {!form.answers[singleField.key] &&
                    form.suggestedAnswers?.[singleField.key] ===
                      (drafts[singleField.key] ?? "") &&
                    drafts[singleField.key] ? (
                      <p className="text-[10.5px] leading-relaxed text-primary">
                        Prefilled from your saved context. Check it before saving.
                      </p>
                    ) : null}
                    {singleField.type !== "choice" ? (
                      <p className="text-[10.5px] text-muted-foreground">
                        {voice.recording
                          ? "Listening… tap the square to stop."
                          : voice.transcribing
                            ? "Transcribing your answer…"
                            : !voice.ttsAvailable && !voice.sttAvailable
                              ? "Voice isn’t configured yet. Type your answer."
                              : !voice.voiceRepliesEnabled
                                ? "Voice answers are off. Turn on Voice replies in the top bar, or type."
                                : !voice.sttAvailable
                                  ? "Spoken answers aren’t configured. Type instead."
                                  : "Tap the mic to answer by speaking, or type."}
                      </p>
                    ) : null}
                    {voice.voiceNotice ? (
                      <p
                        role="status"
                        className={cn(
                          "text-[10.5px] leading-relaxed",
                          voice.voiceNotice.tone === "error"
                            ? "text-danger"
                            : "text-muted-foreground",
                        )}
                      >
                        {voice.voiceNotice.message}
                      </p>
                    ) : null}
                    {voice.voiceError ? (
                      <p
                        role="alert"
                        className="text-[10.5px] leading-relaxed text-danger"
                      >
                        {voice.voiceError}
                      </p>
                    ) : null}
                  </div>

                  {fieldErrors[singleField.key] ? (
                    <p
                      id="answer-error"
                      role="alert"
                      className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[12px] leading-relaxed text-danger"
                    >
                      {fieldErrors[singleField.key]}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    {stepIndex > 0 && !returnToReview ? (
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
                          setFieldErrors({});
                        }}
                        disabled={saving}
                      >
                        Back to review
                      </Button>
                    ) : null}
                    <span className="hidden flex-1 sm:block" />
                    {!singleField.required ? (
                      <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                        Skip for now
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => void handleSave()}
                      disabled={saving || voice.recording || voice.transcribing}
                    >
                      {saving ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Save answer
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`step-${step.key}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <h2 className="font-display text-[1.75rem] font-medium leading-[1.15] tracking-[-0.01em] text-foreground sm:text-[2rem]">
                    {step.title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    These details go together. Fill in what applies — required
                    ones are marked.
                  </p>

                  <div className="mt-5 space-y-4">
                    {step.fields.map((item) => {
                      const value = drafts[item.key] ?? "";
                      const error = fieldErrors[item.key];

                      return (
                        <div
                          key={item.key}
                          className="rounded-2xl border border-border/70 bg-background/40 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[13.5px] font-medium text-foreground">
                              {item.label ?? item.plainQuestion}
                              {item.required ? (
                                <span className="ml-1 text-danger" aria-hidden="true">
                                  *
                                </span>
                              ) : null}
                            </label>
                            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
                              {item.required ? "Required" : "Optional"}
                            </span>
                          </div>
                          {item.helpText ? (
                            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                              {item.helpText}
                            </p>
                          ) : null}
                          <div className="mt-2.5">
                            <AnswerInput
                              field={item}
                              value={value}
                              onChange={(nextValue) =>
                                updateDraft(item.key, nextValue)
                              }
                              disabled={saving}
                              invalid={Boolean(error)}
                              errorId={error ? `error-${item.key}` : undefined}
                            />
                          </div>
                          {!form.answers[item.key] &&
                          form.suggestedAnswers?.[item.key] === value &&
                          value ? (
                            <p className="mt-1.5 text-[10.5px] leading-relaxed text-primary">
                              Prefilled from your saved context. Check it
                              before saving.
                            </p>
                          ) : null}
                          {error ? (
                            <p
                              id={`error-${item.key}`}
                              role="alert"
                              className="mt-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[12px] leading-relaxed text-danger"
                            >
                              {error}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <details className="group mt-4 rounded-xl border border-border/70 bg-background/40 px-3.5 py-2.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                      Original form wording
                      <ChevronDown
                        className="size-3.5 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {step.fields.map((item) => (
                        <li
                          key={item.key}
                          className="font-mono text-[12px] leading-relaxed text-foreground/75"
                        >
                          <span className="text-muted-foreground">
                            {item.label ?? item.plainQuestion}:{" "}
                          </span>
                          {item.question}
                        </li>
                      ))}
                    </ul>
                  </details>

                  {voice.voiceNotice ? (
                    <p
                      role="status"
                      className={cn(
                        "mt-3 text-[10.5px] leading-relaxed",
                        voice.voiceNotice.tone === "error"
                          ? "text-danger"
                          : "text-muted-foreground",
                      )}
                    >
                      {voice.voiceNotice.message}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    {stepIndex > 0 && !returnToReview ? (
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
                          setFieldErrors({});
                        }}
                        disabled={saving}
                      >
                        Back to review
                      </Button>
                    ) : null}
                    <span className="hidden flex-1 sm:block" />
                    {!step.fields.some((item) => item.required) ? (
                      <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                        Skip for now
                      </Button>
                    ) : null}
                    <Button onClick={() => void handleSave()} disabled={saving}>
                      {saving ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Save answers
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
                      {value ? (
                        <div className="mt-1.5 flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5">
                          <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground/85">
                            {value}
                          </pre>
                          <CopyButton value={value} className="mt-0.5" />
                        </div>
                      ) : (
                        <p className="mt-0.5 break-words text-[12.5px] leading-relaxed text-muted-foreground">
                          {missingRequired ? "Not answered yet" : "Skipped (optional)"}
                        </p>
                      )}
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
