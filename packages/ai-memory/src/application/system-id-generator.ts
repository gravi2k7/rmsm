import { randomUUID } from "node:crypto";
import type { IdGenerator } from "@rmsm/core";

/**
 * The real, default `IdGenerator` implementation — `@rmsm/core` defines
 * only the interface (deliberately, per its own doc comments: it has
 * zero concrete implementations of anything), and nothing else in this
 * repo has implemented it yet. A thin wrapper over Node's own
 * `crypto.randomUUID()`, the same "the only place this touches the real
 * mechanism" role `SystemClock` plays for `Clock` in `@rmsm/core`
 * itself.
 */
export class SystemIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
