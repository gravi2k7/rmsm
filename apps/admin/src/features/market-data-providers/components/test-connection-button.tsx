"use client";

import { PlugZap } from "lucide-react";
import { Button, toast } from "@rmsm/ui";
import { useTestConnection } from "../hooks/use-providers";
import { ApiError } from "@/lib/api-client";

export function TestConnectionButton({ providerId }: { providerId: string }) {
  const testConnection = useTestConnection();

  async function handleTest() {
    try {
      const result = await testConnection.mutateAsync(providerId);
      if (result.success) {
        toast.success(`Connection OK${result.latencyMs !== undefined ? ` — ${result.latencyMs}ms` : ""}`);
      } else {
        toast.error(result.message ?? "Connection test failed.");
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to test connection.");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleTest} disabled={testConnection.isPending}>
      <PlugZap className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
      {testConnection.isPending ? "Testing…" : "Test Connection"}
    </Button>
  );
}
