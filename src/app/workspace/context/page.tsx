import type { Metadata } from "next";
import { ContextExplorer } from "@/components/context/context-explorer";

export const metadata: Metadata = {
  title: "Context Explorer",
  robots: { index: false, follow: false },
};

export default function ContextPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="max-w-2xl">
        <p className="inline-flex rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Context explorer
        </p>
        <h1 className="mt-5 font-display text-[2.2rem] font-medium leading-[1.03] tracking-[-0.03em] text-foreground sm:text-[2.8rem]">
          It remembers only what{" "}
          <span className="italic text-accent-strong">you allow.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Saved details make the next form faster. Every item shows where it came
          from, and nothing is shared with the browser extension unless you mark
          it for autofill.
        </p>
      </div>

      <div className="mt-9">
        <ContextExplorer />
      </div>
    </div>
  );
}
