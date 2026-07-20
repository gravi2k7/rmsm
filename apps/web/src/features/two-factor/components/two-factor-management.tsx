"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, ShieldOff, ShieldQuestion, Copy, AlertCircle, Info } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription,
  Badge,
  toast,
} from "@rmsm/ui";
import { useSetupTwoFactor, useConfirmTwoFactor, useDisableTwoFactor } from "../hooks/use-two-factor";
import { ApiError } from "@/lib/api-client";

type LocalStatus = "unknown" | "just-enabled" | "just-disabled";
type Stage = "idle" | "qr" | "recovery-codes" | "disable";

export function TwoFactorManagement() {
  const [stage, setStage] = useState<Stage>("idle");
  const [localStatus, setLocalStatus] = useState<LocalStatus>("unknown");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const setup = useSetupTwoFactor();
  const confirm = useConfirmTwoFactor();
  const disable = useDisableTwoFactor();

  async function handleStartSetup() {
    try {
      await setup.mutateAsync();
      setStage("qr");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to start 2FA setup.");
    }
  }

  async function handleConfirm() {
    try {
      const result = await confirm.mutateAsync(code);
      setRecoveryCodes(result.recoveryCodes);
      setStage("recovery-codes");
      setLocalStatus("just-enabled");
      setCode("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Invalid code. Please try again.");
    }
  }

  async function handleDisable() {
    try {
      await disable.mutateAsync(password);
      toast.success("Two-factor authentication disabled.");
      setLocalStatus("just-disabled");
      setStage("idle");
      setPassword("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to disable 2FA. Check your password.");
    }
  }

  function copyRecoveryCodes() {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Add an authenticator-app code as a second factor when signing in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            The API doesn&apos;t currently expose whether 2FA is enabled on your account (no status field is returned by any endpoint) — this
            page can&apos;t reliably show your current status on load. It reflects the outcome of actions you take right here, in this session
            only.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status (this session)</span>
          {localStatus === "just-enabled" && <Badge variant="success">Enabled</Badge>}
          {localStatus === "just-disabled" && <Badge variant="secondary">Disabled</Badge>}
          {localStatus === "unknown" && (
            <Badge variant="outline">
              <ShieldQuestion className="mr-1 h-3 w-3" aria-hidden="true" />
              Unknown
            </Badge>
          )}
        </div>

        {stage === "idle" && (
          <div className="flex gap-2">
            <Button onClick={handleStartSetup} disabled={setup.isPending}>
              {setup.isPending ? "Starting…" : "Set up 2FA"}
            </Button>
            <Button variant="outline" onClick={() => setStage("disable")}>
              <ShieldOff className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Disable 2FA
            </Button>
          </div>
        )}

        {stage === "qr" && setup.data && (
          <div className="space-y-4 rounded-md border p-4">
            <p className="text-sm">Scan this QR code in your authenticator app, then enter the 6-digit code it shows.</p>
            <div className="flex justify-center">
              <Image src={setup.data.qrCodeDataUrl} alt="2FA QR code" width={200} height={200} unoptimized />
            </div>
            <div className="space-y-2">
              <Label htmlFor="two-factor-code">Verification code</Label>
              <Input id="two-factor-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            {confirm.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{confirm.error instanceof ApiError ? confirm.error.message : "Failed to confirm."}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStage("idle")}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={code.length !== 6 || confirm.isPending}>
                {confirm.isPending ? "Verifying…" : "Verify and enable"}
              </Button>
            </div>
          </div>
        )}

        {stage === "recovery-codes" && (
          <div className="space-y-4 rounded-md border p-4">
            <Alert>
              <AlertDescription>
                Save these recovery codes somewhere safe. Each can be used once if you lose access to your authenticator app. They won&apos;t be
                shown again.
              </AlertDescription>
            </Alert>
            <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map((rc) => (
                <li key={rc} className="rounded bg-muted px-2 py-1">
                  {rc}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyRecoveryCodes}>
                <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Copy codes
              </Button>
              <Button onClick={() => setStage("idle")}>Done</Button>
            </div>
          </div>
        )}

        {stage === "disable" && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Confirm your password</Label>
              <Input id="disable-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {disable.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{disable.error instanceof ApiError ? disable.error.message : "Failed to disable 2FA."}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStage("idle")}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDisable} disabled={!password || disable.isPending}>
                {disable.isPending ? "Disabling…" : "Disable 2FA"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
