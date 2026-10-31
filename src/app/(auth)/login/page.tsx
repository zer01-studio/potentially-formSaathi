import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { services } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <AuthForm mode="login" next={next} databaseReady={services.database} />
  );
}
