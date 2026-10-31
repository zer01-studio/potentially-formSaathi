import { AudioLines, ScanText, Sparkles } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

const SERVICES = [
  {
    icon: Sparkles,
    name: "Gemma AI",
    role: "Plain-language questions, answer mapping, friendly replies",
    fallback: "Rule-based simplification",
  },
  {
    icon: AudioLines,
    name: "ElevenLabs voice",
    role: "Questions read aloud, spoken answers",
    fallback: "Text-only replies",
  },
  {
    icon: ScanText,
    name: "OCR",
    role: "Text from scanned pages and photos",
    fallback: "Bundled sample forms",
  },
];

export function DemoBand() {
  return (
    <section id="demo-mode" className="scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32">
      <Reveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="paper-grid absolute inset-0 opacity-[0.12]"
            style={{ backgroundSize: "40px 40px" }}
          />
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 size-72 rounded-full bg-[radial-gradient(circle_at_center,var(--accent),transparent_70%)] opacity-40 blur-2xl"
          />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                Demo mode
              </p>
              <h2 className="mt-4 font-display text-[2rem] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[2.6rem]">
                Designed to keep going when services don’t.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed opacity-80">
                Missing keys, quota limits, or a bad connection shouldn’t leave
                you stuck halfway through a form. Each external step has a local
                fallback, and a banner tells you exactly which service is
                unavailable.
              </p>
            </div>

            <div className="space-y-2.5">
              {SERVICES.map(({ icon: Icon, name, role, fallback }) => (
                <div
                  key={name}
                  className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3.5 backdrop-blur-sm"
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">{name}</p>
                    <p className="truncate text-[11.5px] opacity-70">{role}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/20 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] opacity-80">
                    {fallback}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
