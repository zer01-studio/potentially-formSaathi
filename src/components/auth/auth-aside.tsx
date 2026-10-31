import { Check, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/site/logo";

const POINTS = [
  "Plain-language questions, with the original wording one tap away",
  "Answers checked as you go — dates, email, phone, lengths",
  "Type or speak; voice replies are always optional",
];

export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden rounded-[32px] bg-primary p-10 text-primary-foreground shadow-lift lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden="true"
        className="paper-grid absolute inset-0 opacity-[0.14]"
        style={{ backgroundSize: "42px 42px" }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-20 size-80 rounded-full bg-[radial-gradient(circle_at_center,var(--accent),transparent_70%)] opacity-40 blur-2xl"
      />

      <div className="relative">
        <LogoMark className="size-11" />
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
          A steadier way through forms
        </p>
        <h2 className="mt-3 max-w-sm font-display text-[2.2rem] font-medium leading-[1.06] tracking-[-0.02em]">
          One question. One answer.{" "}
          <span className="italic text-accent">Confirmed.</span>
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-80">
          No walls of fields. FormSaathi walks beside you, checks each answer in
          plain language, and only moves on when you’re ready.
        </p>

        <ul className="mt-8 space-y-3.5">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Check className="size-3" strokeWidth={2.4} aria-hidden="true" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-10 space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10">
            <Mic className="size-4" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-[12.5px] font-medium">Voice replies</p>
            <p className="text-[11px] opacity-70">Read aloud, or answer by voice</p>
          </div>
          <span className="relative h-5 w-9 rounded-full bg-accent" aria-hidden="true">
            <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-primary" />
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <p className="text-[12.5px] font-medium">Fail-safe by design</p>
            <p className="text-[11px] opacity-70">
              Demo mode keeps the flow working without AI keys
            </p>
          </div>
          <Sparkles className="size-4 opacity-60" aria-hidden="true" />
        </div>

        <p className="pt-1 font-mono text-[9px] uppercase tracking-[0.16em] opacity-50">
          Mock sign-in now · Google OAuth on the roadmap
        </p>
      </div>
    </aside>
  );
}
