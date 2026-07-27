"use client";

import Link from "next/link";
import { AlertCircle, LineChart } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@rmsm/ui";

/**
 * Expired page (WM-020E) — "Display 'Invitation expired', Allow resend."
 * Resend is admin-initiated (`useResendInvitation()`, gated by the
 * `organization.member.invite` permission on the Team settings page's
 * Pending Invitations list — see `resendInvitation()`'s
 * `@RequireOrgRole(...MANAGEMENT_ORG_ROLES)` guard), not self-service by
 * the invitee: there is no public "resend my own expired invitation"
 * endpoint, by design, since that would let anyone re-arm an expired
 * token for an email they don't control. This page tells the invitee
 * what happened and how to actually get a new link.
 */
export default function InvitationExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Invitation expired</CardTitle>
          <CardDescription>This invitation link is no longer valid.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>It may have expired, already been used, or been cancelled. Ask whoever invited you to send a new one.</AlertDescription>
          </Alert>
          <Button className="w-full" variant="outline" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
