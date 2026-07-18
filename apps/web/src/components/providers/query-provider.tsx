"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";

/** 4xx responses (auth, validation, not-found, conflict) will never succeed
 * on retry — retrying them only delays the error reaching the user and adds
 * needless load. Transient failures (network blips, 5xx) still get one retry. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) return false;
  return failureCount < 1;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: shouldRetry },
          // Mutations are writes with real side effects (publish, approve, archive...).
          // Auto-retrying one risks a duplicate action reaching the backend; a failed
          // mutation surfaces as a toast instead, and the user retries deliberately.
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
