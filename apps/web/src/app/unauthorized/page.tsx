import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@rmsm/ui";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <LockKeyhole className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold">Sign in required</h1>
      <p className="max-w-md text-sm text-muted-foreground">You need to be signed in to view this page.</p>
      <Button asChild>
        <Link href="/login">Go to login</Link>
      </Button>
    </main>
  );
}
