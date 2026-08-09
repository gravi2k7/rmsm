"use client";

import { Layers, Check, ChevronsUpDown } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, cn } from "@rmsm/ui";
import { useWorkspaceStore } from "@/lib/workspace-store";

/**
 * UD-001.1 Phase 2 — Workspace Switcher.
 *
 * Reads/writes `useWorkspaceStore` (the real `WorkspaceState` contract
 * from Phase 1). No workspace-listing endpoint exists in this codebase
 * yet (see `lib/workspace-store.ts`'s own header comment), so
 * `availableWorkspaces` is genuinely empty today — this renders a
 * disabled, clearly-labeled trigger rather than fabricating workspace
 * entries. The moment a real hook populates the store via
 * `setAvailableWorkspaces`, this same component starts listing and
 * switching between them with no changes needed here.
 */
export function WorkspaceSwitcher() {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const availableWorkspaces = useWorkspaceStore((s) => s.availableWorkspaces);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  if (availableWorkspaces.length === 0) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1.5 text-muted-foreground" aria-label="No workspaces available">
        <Layers className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">Workspace</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Switch workspace">
          <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden max-w-[10rem] truncate lg:inline">{activeWorkspace?.name ?? "Select workspace"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableWorkspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} onSelect={() => setActiveWorkspace(workspace)} className="justify-between">
            <span className="truncate">{workspace.name}</span>
            {activeWorkspace?.id === workspace.id && <Check className={cn("h-4 w-4 shrink-0")} aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
