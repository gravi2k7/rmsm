"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <button
        className="rounded-md border px-4 py-2 text-sm"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
