"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Check, CheckCircle2, Circle, LineChart, Loader2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Alert, AlertDescription } from "@rmsm/ui";
import { useCompleteOnboarding, useResendVerification } from "@/hooks/use-auth";
import { useSessionStore } from "@/lib/session-store";
import { ApiError } from "@/lib/api-client";

const resendSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type ResendValues = z.infer<typeof resendSchema>;

/**
 * WM-020C — resend-verification mini-form, shown once the token has been
 * proven missing/invalid/expired. Separate component (rather than inline)
 * so its own `react-hook-form` instance doesn't get created until it's
 * actually needed.
 */
function ResendVerificationForm() {
  const resend = useResendVerification();
  const form = useForm<ResendValues>({ resolver: zodResolver(resendSchema) });

  async function onSubmit(values: ResendValues) {
    try {
      await resend.mutateAsync(values.email);
    } catch {
      // Surfaced via resend.isError below — nothing further to do here.
    }
  }

  if (resend.isSuccess) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>If that account exists and needs verification, a new link is on its way.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {resend.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            {resend.error instanceof ApiError ? resend.error.message : "Something went wrong. Please try again."}
          </AlertDescription>
        </Alert>
      )}
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate aria-label="Resend verification email">
        <div className="space-y-2">
          <Label htmlFor="resend-email">Email</Label>
          <Input
            id="resend-email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? "resend-email-error" : undefined}
          />
          {form.formState.errors.email && (
            <p id="resend-email-error" className="text-sm text-destructive" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <Button type="submit" variant="outline" className="w-full" disabled={resend.isPending}>
          {resend.isPending ? "Sending…" : "Resend verification email"}
        </Button>
      </form>
    </div>
  );
}

type StepState = "done" | "active" | "pending";

/** WM-020D — the 4-item onboarding progress list. "Organization Ready" and
 * "Workspace Ready" complete together (this platform's Organization row
 * already *is* the tenant's one workspace — see the delivery summary's
 * Architecture Decision) but are shown as separate items since that's
 * literally what the milestone spec asks for, and it doubles as a visual
 * "two things happened here" cue distinct from "email verified." */
function OnboardingProgress({ emailVerified, orgReady }: { emailVerified: StepState; orgReady: StepState }) {
  const steps: { label: string; state: StepState }[] = [
    { label: "Account Created", state: "done" },
    { label: "Email Verified", state: emailVerified },
    { label: "Organization Ready", state: orgReady },
    { label: "Workspace Ready", state: orgReady },
  ];

  return (
    <ul className="space-y-2" aria-label="Onboarding progress">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-2 text-sm">
          {step.state === "done" && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden="true">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          {step.state === "active" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />}
          {step.state === "pending" && <Circle className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />}
          <span className={step.state === "pending" ? "text-muted-foreground" : "text-foreground"}>
            {step.label}
            {step.state === "done" && <span className="sr-only"> — complete</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // Round-tripped through this page's own URL by AuthService.issueEmailVerification() — see useCompleteOnboarding()'s own doc comment.
  const invitationToken = searchParams.get("invitationToken") ?? undefined;
  const companyName = searchParams.get("companyName") ?? undefined;
  const setOrganizationId = useSessionStore((s) => s.setOrganizationId);
  const onboarding = useCompleteOnboarding();
  // Guards against React 18 Strict Mode's dev-only double-invoke and
  // re-renders re-firing the mutation for the same token.
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (token && attempted.current !== token) {
      attempted.current = token;
      onboarding.mutate({ token, invitationToken, companyName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (onboarding.isSuccess) {
      // Bridges into the same legacy session store useLogin() already
      // populates accessToken/organizationId into — see that hook's own
      // comment on why this bridge exists.
      setOrganizationId(onboarding.data.organizationId);
      const timer = setTimeout(() => router.push("/dashboard"), 1800);
      return () => clearTimeout(timer);
    }
  }, [onboarding.isSuccess, onboarding.data, router, setOrganizationId]);

  const errorMessage = onboarding.isError
    ? onboarding.error instanceof ApiError
      ? onboarding.error.message
      : "Something went wrong. Please try again."
    : null;

  const showResend = !token || onboarding.isError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Verify your email</CardTitle>
          <CardDescription>Confirming your RMSM AI account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>This verification link is missing its token. Request a new one below.</AlertDescription>
            </Alert>
          )}

          {token && onboarding.isPending && (
            <>
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Verifying your email…
              </div>
              <OnboardingProgress emailVerified="active" orgReady="pending" />
            </>
          )}

          {token && onboarding.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                {errorMessage} This link may have expired or already been used — request a new one below.
              </AlertDescription>
            </Alert>
          )}

          {token && onboarding.isSuccess && (
            <div className="space-y-4">
              <OnboardingProgress emailVerified="done" orgReady="done" />
              <Alert>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {onboarding.data.source === "invitation_accepted"
                    ? `You've joined ${onboarding.data.organizationName}. Taking you to your dashboard…`
                    : `${onboarding.data.organizationName} is ready. Taking you to your dashboard…`}
                </AlertDescription>
              </Alert>
              <Button className="w-full" asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          )}

          {showResend && !onboarding.isPending && <ResendVerificationForm />}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
