"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Laptop, ShieldCheck } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
  Skeleton,
  Separator,
} from "@rmsm/ui";
import { useChangePassword } from "@/hooks/use-auth";
import { useSessions, useRevokeSession, useRevokeAllOtherSessions } from "@/hooks/use-sessions";
import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api-client";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(12, "New password must be at least 12 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    await changePassword.mutateAsync(values);
    form.reset();
  }

  const errorMessage = changePassword.isError
    ? changePassword.error instanceof ApiError
      ? changePassword.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Change password
        </CardTitle>
        <CardDescription>Choose a new password of at least 12 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {changePassword.isSuccess && (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>Your password has been changed.</AlertDescription>
          </Alert>
        )}
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
              aria-invalid={!!form.formState.errors.currentPassword}
            />
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
              aria-invalid={!!form.formState.errors.newPassword}
            />
            {form.formState.errors.newPassword && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
              aria-invalid={!!form.formState.errors.confirmPassword}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Changing…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionsCard() {
  const currentSessionId = useAuthStore((s) => s.user?.sessionId);
  const sessionsQuery = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAllOthers = useRevokeAllOtherSessions();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(sessionId: string) {
    setRevokingId(sessionId);
    try {
      await revokeSession.mutateAsync(sessionId);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Laptop className="h-4 w-4" aria-hidden="true" />
            Active sessions
          </CardTitle>
          <CardDescription>Devices and browsers currently signed in to your account.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => revokeAllOthers.mutate()}
          disabled={revokeAllOthers.isPending || (sessionsQuery.data?.length ?? 0) <= 1}
        >
          {revokeAllOthers.isPending ? "Signing out others…" : "Sign out other sessions"}
        </Button>
      </CardHeader>
      <CardContent>
        {sessionsQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {sessionsQuery.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>Couldn&apos;t load your active sessions. Please try again.</AlertDescription>
          </Alert>
        )}

        {sessionsQuery.data && sessionsQuery.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No active sessions found.</p>
        )}

        {sessionsQuery.data && sessionsQuery.data.length > 0 && (
          <ul className="divide-y">
            {sessionsQuery.data.map((session, i) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <li key={session.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.deviceLabel ?? session.userAgent ?? "Unknown device"}
                        {isCurrent && <span className="ml-2 text-xs font-normal text-muted-foreground">(this device)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.ipAddress ?? "Unknown IP"} — last active {formatDistanceToNow(new Date(session.lastSeenAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!isCurrent && (
                      <Button variant="ghost" size="sm" onClick={() => handleRevoke(session.id)} disabled={revokingId === session.id}>
                        {revokingId === session.id ? "Signing out…" : "Sign out"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground">Manage your password and active sessions.</p>
      </div>
      <ChangePasswordCard />
      <SessionsCard />
    </div>
  );
}
