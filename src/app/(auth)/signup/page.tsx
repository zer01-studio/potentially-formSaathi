import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { services } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; password?: string }>;
}) {
  const params = await searchParams;

  if (params.email || params.password) {
    redirect("/signup");
  }

  return <AuthForm mode="signup" databaseReady={services.database} />;
}
