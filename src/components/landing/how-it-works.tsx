import {
  Check,
  FileJson,
  FileText,
  Image as ImageIcon,
  Link2,
  Mic,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

function StepCard({
  number,
  title,
  body,
  children,
  delay = 0,
}: {
  number: string;
  title: string;
  body: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="rounded-[26px] border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-[11px] tracking-[0.14em] text-accent-strong">
            {number}
          </span>
          <h3 className="font-display text-[1.45rem] font-medium leading-tight text-foreground">
            {title}
          </h3>
        </div>
        <p className="mt-2 max-w-md pl-0 text-sm leading-relaxed text-muted-foreground sm:pl-9">
          {body}
        </p>
        <div className="mt-5 sm:pl-9">{children}</div>
      </div>
    </Reveal>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
      <div className="grid gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-4 font-display text-[2.1rem] font-medium leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.7rem]">
            From paperwork to a{" "}
            <span className="italic text-accent-strong">plain conversation.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Three simple steps, designed for the moments when forms feel
            heaviest. No manuals, no jargon, no guessing.
          </p>
        </div>

        <div className="space-y-5">
          <StepCard
            number="01"
            title="Bring the form you already have."
            body="Paste a link, or upload a photo or PDF. FormSaathi reads the text — even from a scanned page — and finds the questions."
          >
            <div className="rounded-2xl border border-dashed border-border-strong/70 bg-background/40 p-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { icon: Link2, label: "Paste a link" },
                  { icon: ImageIcon, label: "Upload a photo" },
                  { icon: FileText, label: "Upload a PDF" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2.5 text-[12.5px] text-foreground/85"
                  >
                    <Icon className="size-3.5 text-primary" aria-hidden="true" />
                    {label}
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Text layer first · OCR only for scans
              </p>
            </div>
          </StepCard>

          <StepCard
            number="02"
            title="Answer one question at a time."
            body="Each question is rewritten in everyday language. Open the original wording whenever you want. Type your answer, or say it out loud."
            delay={0.05}
          >
            <div className="space-y-2.5">
              <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-border bg-background/60 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  Translated from “Please furnish your date of birth…”
                </p>
                <p className="mt-1.5 font-display text-[1.05rem] text-foreground">
                  When were you born?
                </p>
              </div>
              <div className="ml-auto flex max-w-[86%] items-center justify-end gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  <Mic className="size-3" aria-hidden="true" />
                  Or speak
                </span>
                <div className="rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-[13px] text-primary-foreground">
                  12 March 1996
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-success">
                <Check className="size-3.5" aria-hidden="true" />
                We’ll write it as 12/03/1996 — the format this form expects.
              </div>
            </div>
          </StepCard>

          <StepCard
            number="03"
            title="Review, then generate."
            body="Every answer is checked — required fields, dates, emails, phone numbers, lengths — with mistakes explained the way a patient person would."
            delay={0.1}
          >
            <div className="rounded-2xl border border-border bg-background/50 p-4">
              <div className="space-y-2">
                {[
                  ["Full name", "Asha Patil"],
                  ["Date of birth", "12/03/1996"],
                  ["Email", "asha@example.com"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-[12.5px]"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      {value}
                      <Check className="size-3.5 text-success" aria-hidden="true" />
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-accent-soft/40 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-[12px] font-medium text-foreground">
                  <FileJson className="size-4 text-accent-strong" aria-hidden="true" />
                  completed-form.json
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                  Structured · editable
                </span>
              </div>
            </div>
          </StepCard>
        </div>
      </div>
    </section>
  );
}
