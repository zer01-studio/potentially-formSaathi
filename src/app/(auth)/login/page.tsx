import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { services } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; email?: string; password?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  // Never keep credentials submitted by a non-JavaScript form in the URL.
  if (params.email || params.password) {
    redirect("/login");
  }

  return (
    <AuthForm mode="login" next={next} databaseReady={services.database} />
  );
}
