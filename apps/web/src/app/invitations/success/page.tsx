"use client";

import Link from "next/link";
import { CheckCircle2, LineChart } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@rmsm/ui";

/** Invitation Success page (WM-020E) — reached after `/invitations/accept`
 * successfully calls acceptInvitation(). A separate, stable route (rather
 * than an inline state on the accept page) so it's shareable/bookmarkable
 * and matches the milestone's own enumerated page list. */
export default function InvitationSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">You&apos;re in</CardTitle>
          <CardDescription>The invitation has been accepted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>You&apos;ve joined the organization with the role you were invited as.</AlertDescription>
          </Alert>
          <Button className="w-full" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
