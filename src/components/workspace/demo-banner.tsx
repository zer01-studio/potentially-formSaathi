import { TriangleAlert } from "lucide-react";
import { unavailableServiceLabels } from "@/lib/env";

export function DemoBanner() {
  const labels = unavailableServiceLabels();
  if (labels.length === 0) return null;

  return (
    <div className="border-b border-warning/25 bg-warning/10">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-5 py-3 text-[12.5px] leading-relaxed sm:items-center sm:px-8">
        <TriangleAlert
          className="mt-0.5 size-4 shrink-0 text-warning sm:mt-0"
          aria-hidden="true"
        />
        <p className="flex-1 text-foreground/85">
          <span className="font-medium text-foreground">Demo mode:</span>{" "}
          {labels.join(", ")} {labels.length === 1 ? "is" : "are"} unavailable.
          Questions, checks, and answers still work using bundled samples and
          plain rules.
        </p>
        <span className="hidden shrink-0 rounded-full border border-warning/30 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-warning sm:inline">
          Fallbacks active
        </span>
      </div>
    </div>
  );
}
