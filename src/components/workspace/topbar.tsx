"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { VoiceToggle } from "@/components/voice/voice-toggle";
import { apiRequest } from "@/lib/client/api";

export function WorkspaceTopbar({ email }: { email: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // The redirect below still clears the local view; the session expires server-side.
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo href="/workspace" />
          <span className="hidden rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
            Workspace
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden max-w-[220px] truncate text-sm text-muted-foreground sm:block">
            {email}
          </span>
          <VoiceToggle />
          <ThemeToggle />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
          >
            {signingOut ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="size-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
