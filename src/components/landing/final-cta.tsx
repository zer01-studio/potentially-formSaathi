import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { buttonStyles } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border/70">
      <div
        aria-hidden="true"
        className="paper-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 size-[480px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--glow-accent),transparent_68%)] blur-2xl"
      />

      <Reveal className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
          Ready when you are
        </p>
        <h2 className="mt-5 font-display text-[2.4rem] font-medium leading-[1.02] tracking-[-0.03em] text-foreground sm:text-[3.4rem]">
          Your next form can be a{" "}
          <span className="italic text-accent-strong">conversation.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Start with a form you already have — a photo, a PDF, or a link. Try it
          with the mock sign-in; no real documents needed.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className={buttonStyles({ size: "lg" })}>
            Create an account
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className={buttonStyles({ variant: "secondary", size: "lg" })}
          >
            Sign in
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
