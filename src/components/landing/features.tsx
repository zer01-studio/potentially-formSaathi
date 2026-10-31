import {
  Check,
  FileText,
  Fingerprint,
  Mic,
  ScanText,
  SpellCheck2,
  WifiOff,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

function Tile({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "group relative flex flex-col overflow-hidden rounded-[26px] border border-border bg-card p-6 shadow-soft transition-transform duration-300 ease-out hover:-translate-y-1 sm:p-7 " +
        (className ?? "")
      }
    >
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="relative scroll-mt-24 border-y border-border/70 bg-card/30"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                Built in
              </p>
              <h2 className="mt-4 max-w-xl font-display text-[2.1rem] font-medium leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.7rem]">
                Small kindnesses,{" "}
                <span className="italic text-accent-strong">built in.</span>
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground md:text-right">
              Every part of FormSaathi exists to lower the cost of one more
              confusing field.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Reveal className="md:col-span-4" delay={0.02}>
            <Tile className="h-full">
              <div className="flex items-start justify-between gap-6">
                <div className="max-w-sm">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mic className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-[1.4rem] font-medium leading-tight text-foreground">
                    It can read to you — and listen.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    With voice replies on, each question is spoken aloud and
                    your answers can be spoken too. Text always works as a
                    fallback.
                  </p>
                </div>
                <div className="hidden shrink-0 flex-col items-center gap-3 rounded-2xl border border-border bg-background/60 px-5 py-6 sm:flex">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft">
                    <Mic className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex h-8 items-end gap-[3px] text-accent-strong" aria-hidden="true">
                    {[0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.65].map((height, index) => (
                      <span
                        key={index}
                        className="w-[3px] rounded-full bg-current"
                        style={{
                          height: `${Math.round(height * 32)}px`,
                          animation: `waveform 1.2s ease-in-out ${Math.round(index * 90)}ms infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Listening
                  </span>
                </div>
              </div>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-2" delay={0.04}>
            <Tile className="h-full">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <SpellCheck2 className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-[1.3rem] font-medium leading-tight text-foreground">
                Plain words, always
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Questions get a simple rewrite. The original wording stays one
                tap away.
              </p>
              <div className="mt-4 rounded-xl border border-border/80 bg-background/60 p-3">
                <p className="font-mono text-[10.5px] leading-relaxed text-muted-foreground line-through decoration-border-strong/60">
                  Furnish DOB in DD/MM/YYYY
                </p>
                <p className="mt-1.5 font-display text-[1.05rem] text-foreground">
                  When were you born?
                </p>
              </div>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-2" delay={0.02}>
            <Tile className="h-full">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ScanText className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-[1.3rem] font-medium leading-tight text-foreground">
                Reads PDFs and photos
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The text layer comes first. OCR only steps in for scanned pages
                and photos.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["PDF", "JPG", "PNG", "WEBP"].map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-border bg-background/70 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-2" delay={0.04}>
            <Tile className="h-full">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <FileText className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-[1.3rem] font-medium leading-tight text-foreground">
                Checks that explain
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Required fields, dates, email, phone, numbers, and lengths —
                checked with kind, specific messages.
              </p>
              <ul className="mt-4 space-y-1.5 text-[12px] text-foreground/80">
                {["Required fields", "Dates & email", "Phone numbers", "Length limits"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-3.5 text-success" aria-hidden="true" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-2" delay={0.06}>
            <Tile className="h-full">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Fingerprint className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-[1.3rem] font-medium leading-tight text-foreground">
                Your context, your rules
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Details you save show their source and timestamp. Delete one,
                clear all, or switch saving off.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  ["Full name", "From a past form"],
                  ["Phone", "Added manually"],
                ].map(([label, source]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-[12px]"
                  >
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground">{source}</span>
                  </div>
                ))}
              </div>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-6" delay={0.02}>
            <div className="flex flex-col gap-4 rounded-[26px] border border-border bg-background/60 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft">
                <WifiOff className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h3 className="font-display text-[1.25rem] font-medium text-foreground">
                  Never blocked by an outage
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  If the AI or voice service is unavailable — no key, no quota,
                  no connection — FormSaathi falls back to bundled sample forms
                  and rule-based checks, and tells you which service is down.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-success/30 bg-success/10 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-success sm:self-auto">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Core flow always on
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
