/** The "lifecycle metadata" capability's vocabulary: a version starts
 * `DRAFT`, at most one version per agent is `ACTIVE` at a time
 * (enforced by `AgentCatalogService.activateVersion`), and old active
 * versions move to `DEPRECATED` (still runnable, no longer
 * recommended) before eventually `RETIRED` (terminal — no longer
 * discoverable). */
export enum AgentLifecycleStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  DEPRECATED = "DEPRECATED",
  RETIRED = "RETIRED",
}

export const AGENT_LIFECYCLE_STATUSES = Object.values(AgentLifecycleStatus) as readonly AgentLifecycleStatus[];
