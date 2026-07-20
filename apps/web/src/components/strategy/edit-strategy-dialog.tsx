"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, Textarea, toast } from "@rmsm/ui";
import { useUpdateStrategy } from "@/hooks/use-strategies";
import type { Strategy } from "@/types/strategy";

export function EditStrategyDialog({ strategy }: { strategy: Strategy }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(strategy.name);
  const [description, setDescription] = useState(strategy.description);
  const [tagsText, setTagsText] = useState(strategy.tags.join(", "));
  const update = useUpdateStrategy(strategy.id);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(strategy.name);
      setDescription(strategy.description);
      setTagsText(strategy.tags.join(", "));
    }
    setOpen(next);
  }

  function handleSave() {
    const nextTags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const addTags = nextTags.filter((t) => !strategy.tags.includes(t));
    const removeTags = strategy.tags.filter((t) => !nextTags.includes(t));

    update.mutate(
      {
        name: name.trim() !== strategy.name ? name.trim() : undefined,
        description: description.trim() !== strategy.description ? description.trim() : undefined,
        addTags: addTags.length > 0 ? addTags : undefined,
        removeTags: removeTags.length > 0 ? removeTags : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Strategy updated.");
          setOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update strategy."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" onClick={() => handleOpenChange(true)}>
        <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
        Edit
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit strategy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
            <Input id="edit-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="trend, fx, intraday" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || !name.trim()}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
