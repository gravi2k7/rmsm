"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";

export function shouldRetry(failureCount: number, error: unknown): boolean {
  // Retry only once
  if (failureCount >= 1) {
    return false;
  }

  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 400:
      case 401:
      case 403:
      case 404:
      case 409:
      case 422:
        return false;

      default:
        return error.statusCode >= 500;
    }
  }

  // Network / unknown errors
  return true;
}

export function QueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: shouldRetry,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}