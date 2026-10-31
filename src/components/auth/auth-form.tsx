"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { LogoMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { apiRequest, ApiClientError } from "@/lib/client/api";

type AuthMode = "login" | "signup";

export function AuthForm({
  mode,
  next,
  databaseReady = true,
}: {
  mode: AuthMode;
  next?: string;
  databaseReady?: boolean;
}) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const localErrors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      localErrors.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      localErrors.email = "That email address doesn’t look right. Check for typos.";
    }

    if (!password) {
      localErrors.password = "Enter your password.";
    } else if (isSignup && password.length < 8) {
      localErrors.password = "Use at least 8 characters for your password.";
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setPending(true);

    try {
      await apiRequest(isSignup ? "/api/v1/auth/signup" : "/api/v1/auth/login", {
        method: "POST",
        body: { email: trimmedEmail.toLowerCase(), password },
      });

      const destination =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/workspace";
      router.replace(destination);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
          setFieldErrors(error.fieldErrors);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setPending(false);
    }
  }

  return (
    <div>
      <LogoMark className="size-11" />

      <h1 className="mt-5 font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[2.1rem]">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {isSignup
          ? "Mock sign-in for now — an email and password is all you need. Google sign-in comes later."
          : "Sign in to pick up a form, or start a new one."}
      </p>

      {!databaseReady ? (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground/85"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            The database isn’t configured yet. Add <code className="font-mono text-[11.5px]">MONGODB_URI</code>{" "}
            to <code className="font-mono text-[11.5px]">.env.local</code> and restart
            the app.
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            maxLength={254}
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint={isSignup ? "8+ characters" : undefined}
          error={fieldErrors.password}
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              maxLength={128}
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        {formError ? (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-danger"
          >
            {formError}
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {isSignup ? "Creating account…" : "Signing in…"}
            </>
          ) : (
            <>
              {isSignup ? "Create account" : "Sign in"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent-strong"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to FormSaathi?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent-strong"
            >
              Create an account
            </Link>
          </>
        )}
      </p>

      <p className="mt-8 border-t border-border/70 pt-4 text-[11px] leading-relaxed text-muted-foreground">
        Preview build. Please don’t enter real sensitive documents yet — saved
        uploads are kept outside the public folder and removed after processing,
        but this is still an early product.
      </p>
    </div>
  );
}
