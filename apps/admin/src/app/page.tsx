"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  );
}
