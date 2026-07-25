/** The "agent catalog" capability's top-level record: one entry per
 * distinct agent product, stable across every `AgentVersion` published
 * under it. */
export interface AgentCatalogEntry {
  readonly agentId: string;
  readonly name: string;
  readonly description: string;
  readonly activeVersion: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
