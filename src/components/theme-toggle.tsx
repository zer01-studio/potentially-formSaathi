"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a hydration mismatch: false during SSR, true after hydration.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/70 text-foreground",
        "transition-colors duration-200 hover:bg-muted",
        className,
      )}
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -45, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        className="inline-flex"
      >
        {isDark ? (
          <Moon className="size-[18px]" strokeWidth={1.75} />
        ) : (
          <Sun className="size-[18px]" strokeWidth={1.75} />
        )}
      </motion.span>
    </button>
  );
}
