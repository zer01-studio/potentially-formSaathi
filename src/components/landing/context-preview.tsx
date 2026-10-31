import { Clock3, Fingerprint, Lock, Trash2, UserRoundPen } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

const POINTS = [
  {
    icon: Clock3,
    title: "Source and time, always visible",
    body: "Every saved detail shows where it came from and when it was saved.",
  },
  {
    icon: UserRoundPen,
    title: "Edit or delete any item",
    body: "Change a value, remove one detail, or clear everything in a click.",
  },
  {
    icon: Lock,
    title: "A switch that means it",
    body: "Turn saving off and nothing new is written. No dark patterns.",
  },
];

const CONTEXT_ROWS = [
  {
    label: "Full name",
    value: "Asha Patil",
    source: "Passport application",
    when: "2 days ago",
  },
  {
    label: "Phone number",
    value: "+91 98765 43210",
    source: "Added manually",
    when: "Today",
    shareable: true,
  },
  {
    label: "Preferred language",
    value: "English, then Marathi",
    source: "Sign-up",
    when: "3 weeks ago",
  },
];

export function ContextPreview() {
  return (
    <section id="privacy" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Context, with consent
            </p>
            <h2 className="mt-4 font-display text-[2.1rem] font-medium leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.7rem]">
              It remembers only what{" "}
              <span className="italic text-accent-strong">you allow.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              FormSaathi can save details you use often — your name, phone,
              profession — so the next form is faster. You decide what stays,
              and you can see exactly where each detail came from.
            </p>

            <ul className="mt-8 space-y-5">
              {POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-soft">
                    <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2 text-[12px] text-muted-foreground">
              <Fingerprint className="size-3.5 text-accent-strong" aria-hidden="true" />
              Nothing is saved unless you say so.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[36px] bg-[radial-gradient(circle_at_30%_20%,var(--glow-accent),transparent_60%)]"
              />
              <div className="relative overflow-hidden rounded-[28px] border border-border bg-card shadow-lift">
                <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4">
                  <div>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                      Context explorer
                    </p>
                    <p className="mt-1 font-display text-[1.15rem] text-foreground">
                      What FormSaathi knows
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success"
                  >
                    <span className="relative flex h-3.5 w-6 items-center rounded-full bg-success/70">
                      <span className="ml-auto mr-0.5 size-2.5 rounded-full bg-white shadow" />
                    </span>
                    Saving on
                  </span>
                </div>

                <div className="space-y-2.5 p-4 sm:p-5">
                  {CONTEXT_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-2xl border border-border/80 bg-background/50 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                            {row.label}
                          </p>
                          <p className="mt-1 text-[13.5px] font-medium text-foreground">
                            {row.value}
                          </p>
                        </div>
                        {row.shareable ? (
                          <span className="shrink-0 rounded-full border border-accent/40 bg-accent-soft/60 px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-accent-strong">
                            Shareable for autofill
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {row.source} · {row.when}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-3.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete one, or clear all
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
                    You’re in control
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
