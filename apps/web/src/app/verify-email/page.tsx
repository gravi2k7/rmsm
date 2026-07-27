"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, LineChart, Loader2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Alert, AlertDescription } from "@rmsm/ui";
import { useResendVerification, useVerifyEmail } from "@/hooks/use-auth";
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

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verifyEmail = useVerifyEmail();
  // Guards against React 18 Strict Mode's dev-only double-invoke and
  // re-renders re-firing the mutation for the same token.
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (token && attempted.current !== token) {
      attempted.current = token;
      verifyEmail.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const errorMessage = verifyEmail.isError
    ? verifyEmail.error instanceof ApiError
      ? verifyEmail.error.message
      : "Something went wrong. Please try again."
    : null;

  const showResend = !token || verifyEmail.isError;

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

          {token && verifyEmail.isPending && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Verifying your email…
            </div>
          )}

          {token && verifyEmail.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                {errorMessage} This link may have expired or already been used — request a new one below.
              </AlertDescription>
            </Alert>
          )}

          {token && verifyEmail.isSuccess && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>Email verified successfully. You can now sign in.</AlertDescription>
              </Alert>
              <Button className="w-full" asChild>
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          )}

          {showResend && !verifyEmail.isPending && <ResendVerificationForm />}

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
