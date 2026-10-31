import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5">
      <div
        aria-hidden="true"
        className="paper-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]"
      />
      <div className="relative flex flex-col items-center text-center">
        <Logo href="/" />
        <p className="mt-10 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
          404 · Page not found
        </p>
        <h1 className="mt-4 max-w-md font-display text-[2.3rem] font-medium leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[2.8rem]">
          This page isn’t in the{" "}
          <span className="italic text-accent-strong">form.</span>
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          The link may be old, or the page may have moved. Let’s get you back to
          solid ground.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className={buttonStyles({ size: "md" })}>
            Back home
          </Link>
          <Link
            href="/workspace"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Open workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
