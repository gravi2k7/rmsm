# core

The platform's shared domain kernel: framework-agnostic DDD building blocks used by every domain
module — `Entity`, `AggregateRoot`, `ValueObject`, `DomainError` (+ common subclasses),
`Result`/`ok`/`err`, `DomainEvent`, `Guard`, the `Repository`/`Clock`/`IdGenerator` contracts,
CQRS handler contracts, and the `Specification` pattern.

_Status: foundation only. No domain classes (Market, Strategy, Decision, Execution, Portfolio, ...)
exist here — those are implemented by their own owning modules on top of this package._

## Layout

```
src/
  contracts/       CommandHandler/QueryHandler, Specification
  entities/        Entity<TId>, AggregateRoot<TId>
  enums/           SortDirection, Severity — generic, not domain-specific
  errors/          DomainError and common subclasses (InvariantViolationError, EntityNotFoundError, ...)
  events/          DomainEvent, DomainEventRecorder
  interfaces/      Repository<T, TId>, Clock, IdGenerator
  results/         Result<T, E>, ok(), err(), unwrap(), isOk(), isErr()
  value-objects/   ValueObject<TProps>
  validators/      Guard — construction-time invariant checks
  utils/           assertNever, isDefined, DeepReadonly<T>, chunk()
```

## Design principles

- **Zero runtime dependencies**, including on other `@rmsm/*` packages. Any future module can
  depend on `@rmsm/core` without pulling in anything else.
- **No business logic, no domain modeling.** Every export here is a generic building block a
  concrete domain class extends or uses — never a concrete domain class itself.
- **Errors are domain-layer, not HTTP-layer.** `DomainError` has no `statusCode` — HTTP mapping is
  each owning module's own exception filter, keyed on `code` (the platform's established
  convention). `@rmsm/shared`'s own `AppError` is the HTTP-aware counterpart; the two are
  deliberately separate.
- **`Result<T, E>` here is a separate type from `@rmsm/shared`'s own `Result`** — not duplication
  by oversight. Keeping `@rmsm/core` free of a dependency on `@rmsm/shared` was judged more
  valuable than sharing one `Result` implementation; the two are structurally identical, so a
  value from one is assignable to the other's shape without a cast if a call site needs to bridge
  them.

## Usage

```ts
import { AggregateRoot, DomainError, Guard, ok, err, type Result } from "@rmsm/core";

class ExampleAggregate extends AggregateRoot<string> {
  private constructor(id: string, private readonly name: string) {
    super(id);
  }

  static create(id: string, name: string): ExampleAggregate {
    Guard.againstEmptyString(name, "name");
    return new ExampleAggregate(id, name);
  }
}
```
