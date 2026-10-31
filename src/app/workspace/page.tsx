import type { Metadata } from "next";
import {
  ArrowRight,
  FileJson,
  FileText,
  Image as ImageIcon,
  Link2,
  ListChecks,
  Lock,
  Mic,
  Sparkles,
} from "lucide-react";
import { ServiceStatusCard } from "@/components/workspace/service-status-card";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

const ATTACH_OPTIONS = [
  {
    icon: Link2,
    title: "Paste a form link",
    detail: "http:// or https:// only. Private and internal addresses are blocked.",
  },
  {
    icon: ImageIcon,
    title: "Upload an image",
    detail: "JPG, PNG, or WEBP — checked by file signature, not just the extension.",
  },
  {
    icon: FileText,
    title: "Upload a PDF",
    detail: "Text layer first, OCR for scans. Page limits enforced before processing.",
  },
];

const NEXT_STEPS = [
  { label: "Attach, validate, and extract", status: "Up next" },
  { label: "One-question-at-a-time stepper", status: "Planned" },
  { label: "Answer checks in plain language", status: "Planned" },
  { label: "Review screen and JSON export", status: "Planned" },
  { label: "Voice replies and saved context", status: "Planned" },
];

export default function WorkspacePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft/50 px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-accent-strong">
          <Sparkles className="size-3" aria-hidden="true" />
          Phase 1 complete · Phase 2 is next
        </p>
        <h1 className="mt-5 font-display text-[2.2rem] font-medium leading-[1.03] tracking-[-0.03em] text-foreground sm:text-[2.8rem]">
          Welcome back. Let’s make this form{" "}
          <span className="italic text-accent-strong">feel simple.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Your account, session, and API layer are live. The form workspace —
          attachment, reading, guided questions, and review — arrives in the
          next phase.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-[26px] border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-[1.35rem] font-medium text-foreground">
                Attach a form
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Three ways in — all validated before anything is processed.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              Coming in Phase 2
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {ATTACH_OPTIONS.map(({ icon: Icon, title, detail }) => (
              <div
                key={title}
                aria-disabled="true"
                className="relative flex flex-col rounded-2xl border border-dashed border-border-strong/60 bg-background/40 p-4 opacity-80"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-primary">
                  <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <p className="mt-3 text-[13px] font-medium text-foreground">{title}</p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  {detail}
                </p>
                <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  Coming soon
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-border/70 bg-background/50 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            Uploads are stored outside the public folder, never named after your
            file, and deleted after processing. Links are fetched with private
            address blocking, redirect limits, and timeouts.
          </div>
        </section>

        <div className="space-y-5">
          <ServiceStatusCard />

          <section className="rounded-[26px] border border-border bg-card p-5 shadow-soft">
            <h2 className="inline-flex items-center gap-2 font-display text-[1.1rem] font-medium text-foreground">
              <ListChecks className="size-4 text-primary" aria-hidden="true" />
              What’s next
            </h2>
            <ul className="mt-4 space-y-2.5">
              {NEXT_STEPS.map((step) => (
                <li
                  key={step.label}
                  className="flex items-start justify-between gap-3 border-b border-border/60 pb-2.5 text-[12px] last:border-b-0 last:pb-0"
                >
                  <span className="text-foreground/80">{step.label}</span>
                  <span
                    className={
                      step.status === "Up next"
                        ? "shrink-0 rounded-full border border-accent/40 bg-accent-soft/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-accent-strong"
                        : "shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground"
                    }
                  >
                    {step.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Mic,
            title: "Voice replies",
            body: "A liquid toggle, saved per account, with a text fallback.",
          },
          {
            icon: FileJson,
            title: "Structured output",
            body: "A clean JSON file of every answer, ready to download.",
          },
          {
            icon: ArrowRight,
            title: "Built for more",
            body: "Versioned APIs and scopes are already in place for a future extension.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-card/60 px-4 py-4"
          >
            <div className="flex items-center gap-2 text-foreground">
              <Icon className="size-4 text-primary" aria-hidden="true" />
              <p className="text-[12.5px] font-medium">{title}</p>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
