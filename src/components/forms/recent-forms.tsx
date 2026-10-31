"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Link2,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { FormSummaryDto } from "@/lib/forms/types";

function SourceIcon({ source }: { source: FormSummaryDto["sourceType"] }) {
  const Icon = source === "url" ? Link2 : source === "pdf" ? FileText : ImageIcon;
  return <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function RecentForms() {
  const [forms, setForms] = useState<FormSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchForms = useCallback(async (signal?: AbortSignal) => {
    const data = await apiRequest<{ forms: FormSummaryDto[] }>("/api/v1/forms", {
      signal,
    });
    return data.forms;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchForms(controller.signal)
      .then((nextForms) => {
        setForms(nextForms);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiClientError
            ? err.message
            : "We couldn’t load your forms. Please try again.",
        );
        setForms([]);
      });

    return () => controller.abort();
  }, [fetchForms]);

  function retry() {
    setError(null);
    setForms(null);
    fetchForms()
      .then((nextForms) => {
        setForms(nextForms);
      })
      .catch((err) => {
        setError(
          err instanceof ApiClientError
            ? err.message
            : "We couldn’t load your forms. Please try again.",
        );
        setForms([]);
      });
  }

  return (
    <section className="rounded-[26px] border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.3rem] font-medium text-foreground">
            Your forms
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Saved as you go. Pick up any answer where you left it.
          </p>
        </div>
        {forms && forms.length > 0 ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {forms.length} saved
          </span>
        ) : null}
      </div>

      {forms === null ? (
        <div className="mt-5 space-y-2">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex animate-pulse items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3.5"
            >
              <div className="size-9 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded-full bg-muted" />
                <div className="h-2.5 w-1/2 rounded-full bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 flex flex-col items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[12.5px] text-danger">
          <span>{error}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={retry}
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : forms.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border-strong/60 bg-background/40 px-5 py-8 text-center">
          <span className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-primary">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-medium text-foreground">No forms yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Attach one above and your answers will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {forms.map((form) => {
            const progress =
              form.fieldCount > 0
                ? Math.min(100, Math.round((form.answeredCount / form.fieldCount) * 100))
                : 0;

            return (
              <li key={form.id}>
                <Link
                  href={`/workspace/forms/${form.id}`}
                  className="group flex items-center gap-3.5 rounded-2xl border border-border/80 bg-background/40 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-card hover:shadow-soft"
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                    <SourceIcon source={form.sourceType} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-medium text-foreground">
                        {form.title}
                      </p>
                      {form.demoFallback ? (
                        <span className="shrink-0 rounded-full border border-accent/40 bg-accent-soft/50 px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-accent-strong">
                          Sample
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {form.sourceLabel} · {formatDate(form.createdAt)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success/80"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {form.answeredCount} of {form.fieldCount} answered
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
