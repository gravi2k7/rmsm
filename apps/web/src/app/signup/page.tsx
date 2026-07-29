"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, LineChart } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Alert, AlertDescription, Checkbox } from "@rmsm/ui";
import { useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";

/**
 * WM-020A — Enterprise Sign Up page.
 *
 * WM-020B — wired to the real `POST /auth/register` backend (see
 * `hooks/use-auth.ts`'s `useRegister()`). Field mapping to the backend's
 * request contract: `businessEmail` -> `email`, `termsAccepted` ->
 * `acceptTerms`. `confirmPassword` and `marketingOptIn` stay
 * client-only — there's nothing for the server to do with a
 * confirmation field or a marketing preference with no persistence
 * target yet.
 *
 * WM-020D — `companyName` IS now sent (organization creation, deferred
 * in WM-020B, is this milestone): it names the organization
 * auto-created once the account's email is verified. WM-020E — an
 * `?invitationToken=` on this page's own URL (present when arriving from
 * an "Accept Invitation" link for an email with no account yet) is
 * carried through registration so OnboardingService accepts that
 * invitation instead of creating a new organization.
 *
 * DO NOT implement login after registration (per WM-020B) — success
 * shows a static confirmation message and does not redirect, create a
 * session, or store any token.
 */
const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    businessEmail: z.string().min(1, "Business email is required.").email("Enter a valid business email address."),
    companyName: z.string().min(1, "Company name is required."),
    password: z.string().min(12, "Password must be at least 12 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    termsAccepted: z.boolean().refine((value) => value === true, {
      message: "You must accept the Terms of Service to continue.",
    }),
    marketingOptIn: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

type PasswordStrength = {
  score: number; // 0-4
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
};

/**
 * Simple, dependency-free strength heuristic (length + character-class
 * variety). Communicated with both a text label and color, not color
 * alone, per WCAG "use of color" guidance.
 */
function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: "Very weak" };

  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.min(score, 4);
  const labels: Record<number, PasswordStrength["label"]> = {
    0: "Very weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };
  return { score: clamped, label: labels[clamped] ?? "Very weak" };
}

const STRENGTH_BAR_COLORS = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-amber-500", "bg-emerald-500"];

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (password.length === 0) return null;

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" role="presentation">
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${segment < strength.score ? STRENGTH_BAR_COLORS[strength.score] : "bg-muted"}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{strength.label}</span>
      </p>
    </div>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitationToken") ?? undefined;
  const [submitted, setSubmitted] = useState(false);
  const [genericError, setGenericError] = useState<string | null>(null);
  const registerMutation = useRegister();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { termsAccepted: false, marketingOptIn: false },
  });
  const password = form.watch("password") ?? "";

  async function onSubmit(values: SignupValues) {
    setGenericError(null);
    try {
      await registerMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.businessEmail,
        password: values.password,
        acceptTerms: values.termsAccepted,
        companyName: values.companyName,
        invitationToken,
      });
      setSubmitted(true);
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_ALREADY_EXISTS") {
        form.setError("businessEmail", { message: err.message });
        return;
      }
      setGenericError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Create your RMSM workspace</CardTitle>
          <CardDescription>Start your free enterprise trial.</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>Registration successful. Please verify your email.</AlertDescription>
            </Alert>
          ) : (
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate aria-label="Enterprise sign up">
              {genericError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{genericError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    {...form.register("firstName")}
                    aria-invalid={!!form.formState.errors.firstName}
                    aria-describedby={form.formState.errors.firstName ? "firstName-error" : undefined}
                  />
                  {form.formState.errors.firstName && (
                    <p id="firstName-error" className="text-sm text-destructive" role="alert">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    {...form.register("lastName")}
                    aria-invalid={!!form.formState.errors.lastName}
                    aria-describedby={form.formState.errors.lastName ? "lastName-error" : undefined}
                  />
                  {form.formState.errors.lastName && (
                    <p id="lastName-error" className="text-sm text-destructive" role="alert">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessEmail">Business email</Label>
                <Input
                  id="businessEmail"
                  type="email"
                  autoComplete="email"
                  {...form.register("businessEmail")}
                  aria-invalid={!!form.formState.errors.businessEmail}
                  aria-describedby={form.formState.errors.businessEmail ? "businessEmail-error" : undefined}
                />
                {form.formState.errors.businessEmail && (
                  <p id="businessEmail-error" className="text-sm text-destructive" role="alert">
                    {form.formState.errors.businessEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  autoComplete="organization"
                  {...form.register("companyName")}
                  aria-invalid={!!form.formState.errors.companyName}
                  aria-describedby={form.formState.errors.companyName ? "companyName-error" : undefined}
                />
                {form.formState.errors.companyName && (
                  <p id="companyName-error" className="text-sm text-destructive" role="alert">
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("password")}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={form.formState.errors.password ? "password-error" : "password-strength-hint"}
                />
                {form.formState.errors.password ? (
                  <p id="password-error" className="text-sm text-destructive" role="alert">
                    {form.formState.errors.password.message}
                  </p>
                ) : (
                  <div id="password-strength-hint">
                    <PasswordStrengthMeter password={password} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                  aria-invalid={!!form.formState.errors.confirmPassword}
                  aria-describedby={form.formState.errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                {form.formState.errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-sm text-destructive" role="alert">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="termsAccepted"
                    checked={form.watch("termsAccepted")}
                    onCheckedChange={(checked) => form.setValue("termsAccepted", checked === true, { shouldValidate: true })}
                    aria-invalid={!!form.formState.errors.termsAccepted}
                    aria-describedby={form.formState.errors.termsAccepted ? "termsAccepted-error" : undefined}
                  />
                  <Label htmlFor="termsAccepted" className="text-sm font-normal text-muted-foreground">
                    I agree to the Terms of Service and Privacy Policy.
                  </Label>
                </div>
                {form.formState.errors.termsAccepted && (
                  <p id="termsAccepted-error" className="text-sm text-destructive" role="alert">
                    {form.formState.errors.termsAccepted.message}
                  </p>
                )}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="marketingOptIn"
                    checked={form.watch("marketingOptIn")}
                    onCheckedChange={(checked) => form.setValue("marketingOptIn", checked === true)}
                  />
                  <Label htmlFor="marketingOptIn" className="text-sm font-normal text-muted-foreground">
                    Send me product news and platform updates (optional).
                  </Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Creating workspace…" : "Create Workspace"}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
