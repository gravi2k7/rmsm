"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, LineChart, Loader2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@rmsm/ui";
import { useValidateInvitation, useAcceptInvitation, useDeclineInvitation } from "@/features/organizations/hooks/use-invitations";
import { useAuthStore } from "@/lib/auth-store";
import { ApiError } from "@/lib/api-client";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMINISTRATOR: "Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  TRADER: "Trader",
  VIEWER: "Viewer",
};

/**
 * Accept Invitation page (WM-020E) — `/invitations/accept?token=...`, the
 * link `OrganizationInvitationService.createInvitation()` emails. Uses
 * the public `validateInvitation()` preview (no account required) to
 * show what the invitee is being invited to, then branches on whether
 * they're already signed in:
 *
 * - Not signed in -> "Create an account" (forwards `?invitationToken=`
 *   to /signup, which already reads and forwards it through email
 *   verification — see WM-020D's onboarding flow, whose
 *   `acceptInvitationBranch()` accepts this exact invitation
 *   automatically once the new account's email is verified) or "Log in"
 *   (existing account; the invitee returns to this same link afterward).
 * - Signed in -> Accept / Decline buttons, calling the token-based
 *   endpoints directly.
 */
function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const validation = useValidateInvitation(token);
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  async function handleAccept() {
    if (!token) return;
    try {
      await acceptInvitation.mutateAsync(token);
      router.push("/invitations/success");
    } catch {
      // Surfaced via acceptInvitation.isError below — nothing further to do here.
    }
  }

  async function handleDecline() {
    if (!token) return;
    try {
      await declineInvitation.mutateAsync(token);
      router.push("/invitations/declined");
    } catch {
      // Surfaced via declineInvitation.isError below — nothing further to do here.
    }
  }

  const errorMessage =
    acceptInvitation.error instanceof ApiError
      ? acceptInvitation.error.message
      : declineInvitation.error instanceof ApiError
        ? declineInvitation.error.message
        : "Something went wrong. Please try again.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">You&apos;re invited</CardTitle>
          <CardDescription>Join your team on RMSM AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>This invitation link is missing its token.</AlertDescription>
            </Alert>
          )}

          {token && validation.isLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking your invitation…
            </div>
          )}

          {token && !validation.isLoading && (validation.isError || validation.data?.valid === false) && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>This invitation is no longer valid — it may have expired, already been used, or been cancelled.</AlertDescription>
              </Alert>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/invitations/expired">See details</Link>
              </Button>
            </div>
          )}

          {token && validation.data?.valid && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p>
                  <strong>{validation.data.organizationName}</strong> invited you to join as{" "}
                  <strong>{ROLE_LABELS[validation.data.role ?? ""] ?? validation.data.role}</strong>.
                </p>
                {validation.data.email && <p className="mt-1 text-muted-foreground">Invited email: {validation.data.email}</p>}
              </div>

              {(acceptInvitation.isError || declineInvitation.isError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {isAuthenticated ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={handleDecline} disabled={acceptInvitation.isPending || declineInvitation.isPending}>
                    {declineInvitation.isPending ? "Declining…" : "Decline"}
                  </Button>
                  <Button onClick={handleAccept} disabled={acceptInvitation.isPending || declineInvitation.isPending}>
                    {acceptInvitation.isPending ? "Accepting…" : "Accept"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full" asChild>
                    <Link href={`/signup?invitationToken=${encodeURIComponent(token)}`}>Create an account</Link>
                  </Button>
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/login">I already have an account</Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    After logging in, come back to this same invitation link to accept.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
