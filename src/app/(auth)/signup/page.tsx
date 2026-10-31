import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { services } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <AuthForm mode="signup" databaseReady={services.database} />;
}
