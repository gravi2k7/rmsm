"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from "@rmsm/ui";
import { useAuthStore } from "@/lib/auth-store";

export function SessionExpiredDialog() {
  const router = useRouter();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const clearSessionExpired = useAuthStore((s) => s.clearSessionExpired);

  function handleReturnToLogin() {
    clearSessionExpired();
    router.push("/login");
  }

  return (
    <Dialog open={sessionExpired} onOpenChange={(open) => !open && handleReturnToLogin()}>
      <DialogContent className="sm:max-w-sm" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle className="mt-3">Your session has expired</DialogTitle>
          <DialogDescription>For your security, you&apos;ve been signed out. Please log in again to continue.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleReturnToLogin} className="w-full">
            Return to login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
