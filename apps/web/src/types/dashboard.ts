/**
 * Enterprise Dashboard Foundation (UD-001.1) — forward type contract.
 *
 * Phase 1 only formalizes the shell/navigation. Workspace and
 * Organization switchers are Phase 3 per the approved implementation
 * order, so no store or UI reads these types yet. They're declared now,
 * ahead of that implementation, using the enterprise naming the spec
 * requires (`activeWorkspace`/`availableWorkspaces`/`activeOrganization`/
 * `availableOrganizations`) so Phase 3's Zustand stores and switcher
 * components are built against a contract fixed in Phase 1, instead of
 * inventing field names at that point that Phase 1's Header slot would
 * then have to be retrofitted to match.
 *
 * Distinct from the backend's `Organization` domain entity (`packages/`,
 * `api/src/modules/organizations`) — this is only the shape the frontend
 * switcher UI needs (id/name/slug), not a redeclaration of the full
 * backend model.
 */

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

/** Shape a future `useWorkspaceStore` (Phase 3) will implement. */
export interface WorkspaceState {
  activeWorkspace: Workspace | null;
  availableWorkspaces: Workspace[];
}

/** Shape a future `useOrganizationStore` (Phase 3) will implement. */
export interface OrganizationState {
  activeOrganization: Organization | null;
  availableOrganizations: Organization[];
}
