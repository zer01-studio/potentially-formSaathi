import Link from "next/link";
import { ArrowRight, FileText, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { HeroDemo } from "./hero-demo";
import { Spotlight } from "./spotlight";

const trustItems = [
  { icon: FileText, label: "PDF, photo, or link" },
  { icon: Mic, label: "Voice or text" },
  { icon: ShieldCheck, label: "Demo mode built in" },
];

export function Hero() {
  return (
    <section className="grain relative overflow-hidden">
      <div
        aria-hidden="true"
        className="paper-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_20%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-10 size-[420px] rounded-full bg-[radial-gradient(circle_at_center,var(--glow-primary),transparent_68%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 top-40 size-[380px] rounded-full bg-[radial-gradient(circle_at_center,var(--glow-accent),transparent_70%)] blur-2xl"
      />

      <Spotlight className="relative">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-12 lg:pb-28">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-sm">
              <Sparkles className="size-3 text-accent-strong" aria-hidden="true" />
              Your patient form companion
            </p>

            <h1 className="mt-6 font-display text-[2.9rem] font-semibold leading-[0.98] tracking-[-0.03em] text-foreground sm:text-[4rem] lg:text-[4.5rem]">
              Forms shouldn’t feel like{" "}
              <span className="italic text-accent-strong">a test.</span>
            </h1>

            <p className="mt-6 max-w-lg text-[15.5px] leading-relaxed text-muted-foreground sm:text-base">
              FormSaathi turns confusing PDFs, photos, and web links into a calm
              conversation. Answer one plain-language question at a time — by
              typing or talking — then review a complete, checked form.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className={buttonStyles({ size: "lg" })}>
                Start filling a form
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                See how it works
              </Link>
            </div>

            <ul className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-muted-foreground">
              {trustItems.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-2">
                  <Icon className="size-4 text-primary" strokeWidth={1.8} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-4">
            <HeroDemo />
          </div>
        </div>
      </Spotlight>
    </section>
  );
}
