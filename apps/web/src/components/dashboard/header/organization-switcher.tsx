"use client";

import { useEffect } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@rmsm/ui";

import { useOrganizationStore } from "@/lib/organization-store";
import { useSessionStore } from "@/lib/session-store";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";

export function OrganizationSwitcher() {
  const organizationsQuery = useOrganizations();

  const activeOrganization = useOrganizationStore(
    (s) => s.activeOrganization,
  );
  const availableOrganizations = useOrganizationStore(
    (s) => s.availableOrganizations,
  );
  const setActiveOrganization = useOrganizationStore(
    (s) => s.setActiveOrganization,
  );
  const setAvailableOrganizations = useOrganizationStore(
    (s) => s.setAvailableOrganizations,
  );

  const sessionOrganizationId = useSessionStore(
    (s) => s.organizationId,
  );
  const setSessionOrganizationId = useSessionStore(
    (s) => s.setOrganizationId,
  );

  useEffect(() => {
    const organizations =
      organizationsQuery.data?.items ?? [];

    if (organizations.length === 0) {
      if (!organizationsQuery.isLoading) {
        setAvailableOrganizations([]);
        setActiveOrganization(null);
      }
      return;
    }

    setAvailableOrganizations(organizations);

    const sessionMatch =
      sessionOrganizationId
        ? organizations.find(
            (organization) =>
              organization.id ===
              sessionOrganizationId,
          )
        : undefined;

    const currentMatch =
      activeOrganization
        ? organizations.find(
            (organization) =>
              organization.id ===
              activeOrganization.id,
          )
        : undefined;

    const selected =
      sessionMatch ??
      currentMatch ??
      organizations[0]!;

    setActiveOrganization(selected);

    if (
      sessionOrganizationId !== selected.id
    ) {
      setSessionOrganizationId(selected.id);
    }
  }, [
    organizationsQuery.data,
    organizationsQuery.isLoading,
    sessionOrganizationId,
    activeOrganization,
    setAvailableOrganizations,
    setActiveOrganization,
    setSessionOrganizationId,
  ]);

  if (
    organizationsQuery.isLoading &&
    availableOrganizations.length === 0
  ) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="gap-1.5 text-muted-foreground"
        aria-label="Loading organizations"
      >
        <Building2
          className="h-4 w-4"
          aria-hidden="true"
        />
        <span className="hidden lg:inline">
          Loading organization…
        </span>
      </Button>
    );
  }

  if (availableOrganizations.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="gap-1.5 text-muted-foreground"
        aria-label="No organization connected"
      >
        <Building2
          className="h-4 w-4"
          aria-hidden="true"
        />
        <span className="hidden lg:inline">
          Organization
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          aria-label="Switch organization"
        >
          <Building2
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span className="hidden max-w-[10rem] truncate lg:inline">
            {activeOrganization?.name ??
              "Select organization"}
          </span>
          <ChevronsUpDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-56"
      >
        <DropdownMenuLabel>
          Organizations
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {availableOrganizations.map(
          (organization) => (
            <DropdownMenuItem
              key={organization.id}
              onSelect={() => {
                setActiveOrganization(
                  organization,
                );
                setSessionOrganizationId(
                  organization.id,
                );
              }}
              className="justify-between"
            >
              <span className="truncate">
                {organization.name}
              </span>

              {activeOrganization?.id ===
                organization.id && (
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                  )}
                  aria-hidden="true"
                />
              )}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
