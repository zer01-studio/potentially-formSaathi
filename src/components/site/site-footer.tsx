import Link from "next/link";
import { Logo } from "@/components/site/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A calmer way through complex forms — built for people, not
              paperwork.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:gap-16">
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Product
              </p>
              <Link href="#how-it-works" className="block text-foreground/80 transition-colors hover:text-foreground">
                How it works
              </Link>
              <Link href="#features" className="block text-foreground/80 transition-colors hover:text-foreground">
                Features
              </Link>
              <Link href="/signup" className="block text-foreground/80 transition-colors hover:text-foreground">
                Create account
              </Link>
            </div>
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Trust
              </p>
              <Link href="#privacy" className="block text-foreground/80 transition-colors hover:text-foreground">
                Privacy by default
              </Link>
              <Link href="#demo-mode" className="block text-foreground/80 transition-colors hover:text-foreground">
                Demo mode
              </Link>
              <Link href="/login" className="block text-foreground/80 transition-colors hover:text-foreground">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FormSaathi.</p>
          <p>Preview build · Mock sign-in · No real documents needed.</p>
        </div>
      </div>
    </footer>
  );
}
