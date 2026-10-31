import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
];

export function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
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
            <Link href="/workspace" className={buttonStyles({ size: "sm" })}>
              Open workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
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
        </div>
      </div>
    </header>
  );
}
