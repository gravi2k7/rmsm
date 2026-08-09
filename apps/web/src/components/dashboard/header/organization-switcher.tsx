"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, cn } from "@rmsm/ui";
import { useOrganizationStore } from "@/lib/organization-store";
import { useSyncOrganizationFromSession } from "@/hooks/use-sync-organization-from-session";

/**
 * UD-001.1 Phase 2 — Organization Switcher.
 *
 * See `hooks/use-sync-organization-from-session.ts` for where its data
 * comes from: today, at most one real organization (whatever
 * `SessionBar`/`useSessionStore` currently has connected) — not a
 * fabricated multi-org list. Structurally identical to
 * `WorkspaceSwitcher`, including the disabled empty state, so both
 * behave predictably once real multi-item data exists for either.
 */
export function OrganizationSwitcher() {
  useSyncOrganizationFromSession();
  const activeOrganization = useOrganizationStore((s) => s.activeOrganization);
  const availableOrganizations = useOrganizationStore((s) => s.availableOrganizations);
  const setActiveOrganization = useOrganizationStore((s) => s.setActiveOrganization);

  if (availableOrganizations.length === 0) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1.5 text-muted-foreground" aria-label="No organization connected">
        <Building2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">Organization</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Switch organization">
          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden max-w-[10rem] truncate lg:inline">{activeOrganization?.name ?? "Select organization"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableOrganizations.map((organization) => (
          <DropdownMenuItem key={organization.id} onSelect={() => setActiveOrganization(organization)} className="justify-between">
            <span className="truncate">{organization.name}</span>
            {activeOrganization?.id === organization.id && <Check className={cn("h-4 w-4 shrink-0")} aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
