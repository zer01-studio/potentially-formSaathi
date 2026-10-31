import type { Metadata } from "next";
import {
  ArrowRight,
  Briefcase,
  FileText,
  GraduationCap,
  Home,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { TEMPLATE_SEED } from "@/lib/templates/seed";

export const metadata: Metadata = {
  title: "Templates",
  robots: { index: false, follow: false },
};

const ICONS = [GraduationCap, FileText, Home, Briefcase, ShieldCheck, Landmark];

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            Templates
          </p>
          <h1 className="mt-5 font-display text-[2.2rem] font-medium leading-[1.03] tracking-[-0.03em] text-foreground sm:text-[2.8rem]">
            Start from a{" "}
            <span className="italic text-accent-strong">familiar form.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            A small gallery of common forms we’ll turn into reusable templates.
            Creation and sharing are coming next.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-2 text-[12px] text-muted-foreground opacity-60"
          >
            <FileText className="size-3.5" aria-hidden="true" />
            Create template
            <span className="rounded-full bg-card px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]">
              Coming soon
            </span>
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-2 text-[12px] text-muted-foreground opacity-60"
          >
            Share template
            <span className="rounded-full bg-card px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]">
              Coming soon
            </span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_SEED.map((template, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <article
              key={template.slug}
              className="group flex flex-col rounded-[24px] border border-border bg-card p-5 shadow-soft transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background/60 text-primary">
                  <Icon className="size-4.5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="rounded-full border border-border/70 bg-background/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                  {template.category}
                </span>
              </div>
              <h2 className="mt-4 font-display text-[1.25rem] font-medium leading-tight text-foreground">
                {template.title}
              </h2>
              <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                {template.description}
              </p>
              <p className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                <span>{template.fieldCount} questions</span>
                <span className="inline-flex items-center gap-1 text-accent-strong">
                  Preview later <ArrowRight className="size-3" aria-hidden="true" />
                </span>
              </p>
            </article>
          );
        })}
      </div>

      <p className="mt-8 rounded-2xl border border-border/70 bg-card/50 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        The data model already stores template owner and visibility, so
        user-created and shared templates can arrive without a migration.
      </p>
    </div>
  );
}
