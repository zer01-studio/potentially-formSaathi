import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/workspace/demo-banner";
import { WorkspaceTopbar } from "@/components/workspace/topbar";
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
      <WorkspaceTopbar email={user.email} />
      <DemoBanner />
      <main id="main">{children}</main>
    </div>
  );
}
