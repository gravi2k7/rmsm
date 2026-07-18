/**
 * Generic repository contract. Not every module's own repository will
 * implement every method here (e.g. AI-103's own repositories are
 * organization-scoped and take an explicit `client` for transaction
 * participation, per this platform's established convention) — this is a
 * minimal shape to align naming, not a mandate every concrete repository
 * must satisfy exactly.
 */
export interface Repository<TEntity, TId> {
  findById(id: TId): Promise<TEntity | null>;
  save(entity: TEntity): Promise<void>;
}
