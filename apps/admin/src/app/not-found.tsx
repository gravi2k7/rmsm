import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h2 className="text-xl font-semibold">404 — Page not found</h2>
      <Link href="/" className="text-sm underline">
        Back home
      </Link>
    </div>
  );
}
