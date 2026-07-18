"use client";

import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { useRequestContext } from "@/hooks/use-request-context";
import { EmptyState } from "./empty-state";
import { SessionBar } from "@/components/layout/session-bar";

export function SessionGate({ children }: { children: ReactNode }) {
  const ctx = useRequestContext();
  if (ctx) return <>{children}</>;

  return (
    <EmptyState
      icon={<KeyRound className="size-8" />}
      title="No session connected"
      description="Connect an organization id and access token to load strategies from the API."
      action={<SessionBar />}
    />
  );
}
