"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function Spotlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element || event.pointerType === "touch") return;

    const rect = element.getBoundingClientRect();
    element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      className={cn("relative", className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-80 transition-opacity duration-500 dark:opacity-60"
          style={{
            background:
              "radial-gradient(620px circle at var(--spot-x, 72%) var(--spot-y, 24%), var(--glow-accent), transparent 68%)",
          }}
        />
      </div>
      {children}
    </div>
  );
}
