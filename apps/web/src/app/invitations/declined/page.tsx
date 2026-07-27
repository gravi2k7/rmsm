"use client";

import Link from "next/link";
import { XCircle, LineChart } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@rmsm/ui";

/** Declined page (WM-020E) — reached after `/invitations/accept` calls
 * declineInvitation(). No membership is created (see
 * OrganizationInvitationService.rejectInvitation()); this is a pure
 * confirmation screen. */
export default function InvitationDeclinedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Invitation declined</CardTitle>
          <CardDescription>You won&apos;t be added to this organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <XCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>If this was a mistake, ask whoever invited you to send a new invitation.</AlertDescription>
          </Alert>
          <Button className="w-full" variant="outline" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
