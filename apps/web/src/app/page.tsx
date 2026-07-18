import Link from "next/link";
import { Button } from "@rmsm/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">RMSM AI</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Institutional-grade AI trading platform. The Strategy Builder is the first business UI shipped in this
        repository (AI-103 Milestone 5).
      </p>
      <Button asChild>
        <Link href="/strategies">Open Strategy Builder</Link>
      </Button>
    </main>
  );
}
