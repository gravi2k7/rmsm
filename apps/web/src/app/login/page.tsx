"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, LineChart } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Alert, AlertDescription, Checkbox } from "@rmsm/ui";
import { useLogin } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api-client";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const twoFactorSchema = z.object({
  twoFactorCode: z.string().length(6, "Enter the 6-digit code."),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const setRememberMe = useAuthStore((s) => s.setRememberMe);
  const [stage, setStage] = useState<"credentials" | "2fa">("credentials");
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [rememberMe, setRememberMeChecked] = useState(true);

  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({ resolver: zodResolver(credentialsSchema) });
  const twoFactorForm = useForm<z.infer<typeof twoFactorSchema>>({ resolver: zodResolver(twoFactorSchema) });

  async function onSubmitCredentials(values: z.infer<typeof credentialsSchema>) {
    setRememberMe(rememberMe);
    const result = await login.mutateAsync(values);
    if (result.status === "requires-2fa") {
      setCredentials(values);
      setStage("2fa");
      return;
    }
    router.push("/dashboard");
  }

  async function onSubmitTwoFactor(values: z.infer<typeof twoFactorSchema>) {
    if (!credentials) return;
    await login.mutateAsync({ ...credentials, twoFactorCode: values.twoFactorCode });
    router.push("/dashboard");
  }

  const errorMessage = login.isError ? (login.error instanceof ApiError ? login.error.message : "Something went wrong. Please try again.") : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">RMSM Trader</CardTitle>
          <CardDescription>{stage === "credentials" ? "Sign in to continue" : "Enter your two-factor code"}</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {stage === "credentials" ? (
            <form className="space-y-4" onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...credentialsForm.register("email")} aria-invalid={!!credentialsForm.formState.errors.email} />
                {credentialsForm.formState.errors.email && (
                  <p className="text-sm text-destructive" role="alert">
                    {credentialsForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...credentialsForm.register("password")}
                  aria-invalid={!!credentialsForm.formState.errors.password}
                />
                {credentialsForm.formState.errors.password && (
                  <p className="text-sm text-destructive" role="alert">
                    {credentialsForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMeChecked(checked === true)} />
                <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground">
                  Remember me on this device
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)} noValidate>
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Authentication code</Label>
                <Input
                  id="twoFactorCode"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  {...twoFactorForm.register("twoFactorCode")}
                  aria-invalid={!!twoFactorForm.formState.errors.twoFactorCode}
                />
                {twoFactorForm.formState.errors.twoFactorCode && (
                  <p className="text-sm text-destructive" role="alert">
                    {twoFactorForm.formState.errors.twoFactorCode.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? "Verifying…" : "Verify"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
