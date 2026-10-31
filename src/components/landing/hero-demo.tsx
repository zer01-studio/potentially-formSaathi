"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  {
    source: "Passport application · section 2",
    original:
      "Please furnish your date of birth in DD/MM/YYYY format.",
    simplified: "When were you born?",
    helper: "A date is enough — we’ll put it in the right order.",
    answer: "12 March 1996",
    check: "Looks good. We’ll format it as 12/03/1996.",
  },
  {
    source: "Rental agreement · applicant details",
    original:
      "State the full postal address of your current place of residence, inclusive of PIN code.",
    simplified: "Where do you live right now?",
    helper: "Include the flat number and PIN code.",
    answer: "Flat 4, 12 Rose Lane, Pune 411001",
    check: "Got it. This matches the format the form expects.",
  },
  {
    source: "Scholarship form · contact details",
    original:
      "Kindly enter your most frequently monitored telephonic contact number.",
    simplified: "What’s the best number to reach you?",
    helper: "Type it, or press the mic and say it out loud.",
    answer: "98765 43210",
    check: "Saved as a 10-digit mobile number.",
  },
];

function Waveform() {
  const bars = [0.45, 0.9, 0.55, 1, 0.65, 0.35];

  return (
    <span aria-hidden="true" className="flex h-3.5 items-end gap-[2.5px]">
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-[2.5px] rounded-full bg-current"
          style={{
            height: `${Math.round(height * 14)}px`,
            animation: `waveform 1.15s ease-in-out ${Math.round(index * 110)}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function HeroDemo() {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!autoplay || reduceMotion) return;
    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % EXAMPLES.length),
      5200,
    );
    return () => clearTimeout(timer);
  }, [index, autoplay, reduceMotion]);

  const example = EXAMPLES[index];

  return (
    <div
      className="relative"
      onMouseEnter={() => setAutoplay(false)}
      onMouseLeave={() => setAutoplay(true)}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-6 -bottom-3 top-6 rotate-2 rounded-[30px] border border-border/70 bg-card/50"
      />

      <div className="relative overflow-hidden rounded-[30px] border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft font-mono text-[9px] font-bold uppercase tracking-wide text-accent-strong">
              PDF
            </span>
            <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted-foreground">
              {example.source}
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/80 bg-background/60 px-2.5 py-1 text-[10.5px] text-muted-foreground">
            <Volume2 className="size-3" aria-hidden="true" />
            Voice on
            <span className="text-accent-strong">
              <Waveform />
            </span>
          </span>
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="rounded-2xl border border-border/70 bg-background/50 px-3.5 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              Original wording
            </p>
            <p className="mt-1.5 line-clamp-2 font-mono text-[12px] leading-relaxed text-muted-foreground">
              {example.original}
            </p>
          </div>

          <div className="relative mt-4 min-h-[196px] sm:min-h-[184px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
              >
                <p className="font-display text-[1.65rem] leading-snug tracking-[-0.01em] text-foreground sm:text-[1.8rem]">
                  {example.simplified}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {example.helper}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-border bg-background px-4 text-[14.5px] text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                    <span className="truncate">{example.answer}</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Answer by voice (preview)"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-px"
                  >
                    <Mic className="size-4.5" strokeWidth={1.9} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-3 flex items-start gap-1.5 text-[12px] text-success">
                  <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{example.check}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-3.5">
            <div className="flex items-center gap-1.5">
              {EXAMPLES.map((item, itemIndex) => (
                <button
                  key={item.source}
                  type="button"
                  aria-label={`Show example ${itemIndex + 1}`}
                  aria-current={itemIndex === index}
                  onClick={() => {
                    setIndex(itemIndex);
                    setAutoplay(false);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    itemIndex === index
                      ? "w-6 bg-accent-strong"
                      : "w-1.5 bg-border-strong/60 hover:bg-border-strong",
                  )}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              1 question at a time
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -right-2 -top-3 hidden rotate-2 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground shadow-soft sm:flex">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        Checked as you go
      </div>
    </div>
  );
}
