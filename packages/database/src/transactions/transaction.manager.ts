import type { PrismaClient, Prisma } from "@prisma/client";
import type { DbClient } from "../interfaces/repository.interface";

export interface TransactionOptions {
  readonly maxWaitMs?: number;
  readonly timeoutMs?: number;
  readonly isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Thin, typed wrapper over `prisma.$transaction()` — the transaction
 * boundary itself stays a service-layer decision (per this platform's
 * own established convention, documented in `index.ts`'s comment above
 * `DbClient`: "the transaction boundary itself is a service-layer
 * decision"), this class exists so that decision is made through one
 * named, testable seam instead of every service calling
 * `prisma.$transaction()` directly and hand-rolling its own options
 * object each time.
 *
 * No business logic — `run()` takes an arbitrary callback and executes it
 * inside a transaction, nothing more. Multi-repository orchestration
 * belongs in the calling service, same as today.
 *
 * `run()` (not `execute()`) is the method name — kept as-is because
 * `transactions/unit-of-work.ts` already calls `transactionManager.run(...)`,
 * and renaming it here would require touching that file too, which is
 * out of scope for this fix.
 */
export class TransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Prisma's `$transaction` has two overloads: an array-of-`PrismaPromise`
   * form, and a callback form (`(tx: Prisma.TransactionClient) => Promise<T>`,
   * options?). Passing `fn` straight through — typed as
   * `(client: DbClient) => Promise<T>`, where `DbClient` is the broader
   * `PrismaClient | Prisma.TransactionClient` union — made TypeScript try
   * to reconcile that union against both overloads simultaneously instead
   * of cleanly resolving to the callback one. Wrapping it in a fresh
   * arrow function whose own parameter is explicitly typed as
   * `Prisma.TransactionClient` (exactly what the callback overload
   * declares) gives the call site one unambiguous signature to match, and
   * an explicit `<T>` type argument on `$transaction` itself pins the
   * generic instead of leaving it to be inferred from the union.
   */
  async run<T>(fn: (client: DbClient) => Promise<T>, options: TransactionOptions = {}): Promise<T> {
    return this.prisma.$transaction<T>(
      (tx: Prisma.TransactionClient) => fn(tx),
      {
        maxWait: options.maxWaitMs,
        timeout: options.timeoutMs,
        isolationLevel: options.isolationLevel,
      },
    );
  }
}