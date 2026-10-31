import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAside } from "@/components/auth/auth-aside";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/workspace");

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="paper-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-1/3 size-[420px] rounded-full bg-[radial-gradient(circle_at_center,var(--glow-primary),transparent_70%)] blur-2xl"
      />

      <header className="relative z-10 mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main
        id="main"
        className="relative z-10 mx-auto grid max-w-6xl items-stretch gap-10 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1fr_1fr] lg:pb-20"
      >
        <div className="mx-auto w-full max-w-md self-center rounded-[28px] border border-border bg-card p-6 shadow-lift sm:p-8">
          {children}
        </div>
        <AuthAside />
      </main>
    </div>
  );
}
