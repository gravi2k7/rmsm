/**
 * Minimal handler contracts for hand-rolled CQRS — the pattern this
 * platform has already committed to for at least one module (AI-103's
 * own commands/queries/handlers, deliberately not `@nestjs/cqrs`'s bus/
 * dispatcher machinery, "since no other module in this platform uses
 * it"). Extracting the shared shape here means the *next* module that
 * follows the same pattern doesn't redefine it from scratch — without
 * this package taking any dependency on NestJS, Express, or any other
 * framework.
 *
 * Deliberately generic over `TCommand`/`TQuery` rather than requiring
 * them to extend a marker `Command`/`Query` interface — an empty marker
 * interface constrains nothing under TypeScript's structural typing (any
 * object satisfies `{}`), so it would add ceremony without adding safety.
 */
export interface CommandHandler<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>;
}

export interface QueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<TResult>;
}
