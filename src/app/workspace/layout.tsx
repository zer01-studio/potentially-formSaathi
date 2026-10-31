import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/workspace/demo-banner";
import { WorkspaceNav } from "@/components/workspace/workspace-nav";
import { WorkspaceTopbar } from "@/components/workspace/topbar";
import { VoiceFallbackNotice } from "@/components/voice/voice-fallback-notice";
import { VoicePreferencesProvider } from "@/components/voice/voice-preferences-provider";
import { getCurrentUser } from "@/lib/auth/session";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/workspace");

  return (
    <div className="min-h-dvh bg-background">
      <VoicePreferencesProvider>
        <WorkspaceTopbar email={user.email} />
        <VoiceFallbackNotice />
        <DemoBanner />
        <WorkspaceNav />
        <main id="main">{children}</main>
      </VoicePreferencesProvider>
    </div>
  );
}
