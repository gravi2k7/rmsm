/** "Delete" a strategy — per the platform's own established convention
 * (no hard deletes anywhere), this archives it (`Strategy.transitionTo("ARCHIVED")`)
 * rather than removing any record. `DELETE /strategies/:id` is the REST
 * verb Phase 4A's own spec names; what it actually does underneath is an
 * honest archive, documented here rather than silently implied. */
export class DeleteStrategyCommand {
  constructor(public readonly strategyId: string) {}
}
