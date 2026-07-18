"use client";

import { useState } from "react";
import { Button, Input, Label } from "@rmsm/ui";
import { KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rmsm/ui";
import { useSessionStore } from "@/lib/session-store";

export function SessionBar() {
  const [open, setOpen] = useState(false);
  const organizationId = useSessionStore((s) => s.organizationId);
  const accessToken = useSessionStore((s) => s.accessToken);
  const setOrganizationId = useSessionStore((s) => s.setOrganizationId);
  const setAccessToken = useSessionStore((s) => s.setAccessToken);

  const [orgDraft, setOrgDraft] = useState(organizationId ?? "");
  const [tokenDraft, setTokenDraft] = useState(accessToken ?? "");

  const connected = !!organizationId && !!accessToken;

  function handleSave() {
    setOrganizationId(orgDraft.trim() || null);
    setAccessToken(tokenDraft.trim() || null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={connected ? "outline" : "default"} size="sm">
          <KeyRound />
          {connected ? "Session connected" : "Connect session"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a session</DialogTitle>
          <DialogDescription>
            The Strategy Builder calls the real Strategy Engine API, which requires an organization id and a bearer
            access token issued by the platform&apos;s own auth flow. Paste both here — nothing is generated or
            validated locally.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="organizationId">Organization ID</Label>
            <Input id="organizationId" value={orgDraft} onChange={(e) => setOrgDraft(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="accessToken">Access token</Label>
            <Input id="accessToken" type="password" value={tokenDraft} onChange={(e) => setTokenDraft(e.target.value)} placeholder="eyJhbGciOi..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
