import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold">403</h1>

      <h2 className="mt-4 text-2xl font-semibold">Access Forbidden</h2>

      <p className="mt-2 text-muted-foreground">
        You do not have permission to view this page.
      </p>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex rounded-md border px-4 py-2"
      >
        Back to dashboard
      </Link>
    </main>
  );
}