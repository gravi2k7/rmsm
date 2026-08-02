"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, toast } from "@rmsm/ui";
import { useUpdateProviderPriority } from "../hooks/use-providers";
import { ApiError } from "@/lib/api-client";
import type { ProviderConfig } from "@/features/market-data-shared/types";

export function EditPriorityDialog({ provider }: { provider: ProviderConfig }) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState(String(provider.priority));
  const updatePriority = useUpdateProviderPriority(provider.id);

  async function handleSave() {
    try {
      await updatePriority.mutateAsync(Number(priority));
      toast.success("Priority updated.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update priority.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Priority — {provider.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority (lower runs first, 1–1000)</Label>
          <Input id="priority" type="number" min={1} max={1000} value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={updatePriority.isPending}>
            {updatePriority.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
