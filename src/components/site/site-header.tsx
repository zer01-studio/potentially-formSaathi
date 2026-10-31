"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
];

export function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }

    // Without this, rotating to a desktop width leaves the state stuck open.
    const desktop = window.matchMedia("(min-width: 768px)");
    function handleBreakpoint(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleBreakpoint);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleBreakpoint);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isSignedIn ? (
            <Link
              href="/workspace"
              className={buttonStyles({ size: "sm", className: "hidden sm:inline-flex" })}
            >
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonStyles({
                  variant: "ghost",
                  size: "sm",
                  className: "hidden md:inline-flex",
                })}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={buttonStyles({ size: "sm", className: "hidden sm:inline-flex" })}
              >
                Get started
              </Link>
            </>
          )}

          <button
            ref={toggleRef}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:bg-muted md:hidden"
          >
            <motion.span
              key={open ? "close" : "open"}
              initial={{ rotate: -45, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 340, damping: 24 }}
              className="inline-flex"
            >
              {open ? (
                <X className="size-[18px]" strokeWidth={1.75} />
              ) : (
                <Menu className="size-[18px]" strokeWidth={1.75} />
              )}
            </motion.span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        inert={!open}
        className={cn(
          "grid border-t transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden",
          open
            ? "grid-rows-[1fr] border-border/60 opacity-100"
            : "grid-rows-[0fr] border-transparent opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] text-foreground/85 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                    <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-4">
              {isSignedIn ? (
                <Link
                  href="/workspace"
                  onClick={() => setOpen(false)}
                  className={buttonStyles({ size: "md", className: "w-full" })}
                >
                  Open workspace
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className={buttonStyles({ size: "md", className: "w-full" })}
                  >
                    Get started
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={buttonStyles({ variant: "secondary", size: "md", className: "w-full" })}
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
