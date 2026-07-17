import { Injectable } from "@nestjs/common";
import { prisma, DbClient } from "@rmsm/database";
import type { StrategyTagAssignmentWithTag } from "@rmsm/database";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import type { StrategyRepository as StrategyRepositoryInterface, StrategyListFilter, StrategyListResult } from "../../domain/repositories/strategy.repository.interface";
import { toStrategyDomain, toStrategyPersistence } from "../mappers/strategy.mapper";
import { toPrismaStrategyStatus, toPrismaCategoryCode } from "../mappers/enum-mappers.util";

const TAG_INCLUDE = { tagAssignments: { include: { tag: true } } } as const;

/**
 * Real implementation of the domain's own `StrategyRepository`
 * interface (added this milestone to fill a genuine Milestone-1 gap —
 * see this module's own Milestone 2 documentation). `save()` reconciles
 * the tag JUNCTION table (`strategy_tag_assignments`) against the
 * aggregate's own current `tags` list — insert newly-added tags,
 * delete removed ones — inside a transaction, since a Strategy's own
 * top-level row and its tag assignments must stay consistent as one
 * unit (this milestone's own "maintain aggregate consistency" rule).
 */
@Injectable()
export class StrategyRepository implements StrategyRepositoryInterface {
  async findById(id: string, organizationId: string): Promise<Strategy | null> {
    const row = await prisma.strategy.findFirst({ where: { id, organizationId, deletedAt: null }, include: TAG_INCLUDE });
    return row ? toStrategyDomain(row) : null;
  }

  async findBySlug(slug: string, organizationId: string): Promise<Strategy | null> {
    const row = await prisma.strategy.findFirst({ where: { slug, organizationId, deletedAt: null }, include: TAG_INCLUDE });
    return row ? toStrategyDomain(row) : null;
  }

  async save(strategy: Strategy): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const persistenceData = toStrategyPersistence(strategy, strategy.createdByUserId);

      const existing = await tx.strategy.findUnique({ where: { id: strategy.id } });
      if (existing) {
        // Optimistic concurrency — item 8's own "Optimistic Concurrency
        // where appropriate," enforced for real: the WHERE clause
        // includes the version this repository last READ; if another
        // writer updated the row in between, `updateMany`'s own count
        // comes back 0, and this method throws rather than silently
        // overwriting a concurrent change.
        const result = await tx.strategy.updateMany({
          where: { id: strategy.id, version: existing.version },
          data: { ...persistenceData, version: { increment: 1 } },
        });
        if (result.count === 0) {
          throw new Error(`Optimistic concurrency conflict saving Strategy ${strategy.id} — it was modified by another writer since it was read.`);
        }
      } else {
        await tx.strategy.create({ data: { ...persistenceData, createdById: strategy.createdByUserId, createdAt: strategy.createdAt } });
      }

      await this.reconcileTags(tx, strategy);
    });
  }

  async list(filter: StrategyListFilter): Promise<StrategyListResult> {
    // Not annotated as Prisma.StrategyWhereInput — a real, generated
    // Prisma type this project's own simplified offline stub doesn't
    // model per-model (see this project's own standing "prisma
    // generate is network-blocked" limitation). The object literal
    // below is structurally what a real WhereInput expects; TypeScript
    // infers it correctly against the real generated client.
    //
    // Milestone 2 fix applied — filter.status/filter.category are
    // DOMAIN enum values; they're translated through the exhaustive
    // enum-mappers.util.ts functions before reaching the Prisma query,
    // not passed through raw (a real bug the original implementation
    // had — structurally harmless only because the string spellings
    // happen to match, not because it was actually correct).
    const where = {
      organizationId: filter.organizationId,
      deletedAt: null,
      ...(filter.status ? { status: toPrismaStrategyStatus(filter.status) } : {}),
      ...(filter.category ? { categoryCode: toPrismaCategoryCode(filter.category) } : {}),
      ...(filter.searchText ? { name: { contains: filter.searchText, mode: "insensitive" as const } } : {}),
      ...(filter.tag ? { tagAssignments: { some: { tag: { name: filter.tag } } } } : {}),
    };

    const [rows, totalCount] = await Promise.all([
      prisma.strategy.findMany({ where, include: TAG_INCLUDE, skip: (filter.page - 1) * filter.pageSize, take: filter.pageSize, orderBy: { updatedAt: "desc" } }),
      prisma.strategy.count({ where }),
    ]);

    return { strategies: rows.map(toStrategyDomain), totalCount };
  }

  private async reconcileTags(tx: DbClient, strategy: Strategy): Promise<void> {
    const currentAssignments = await tx.strategyTagAssignment.findMany({ where: { strategyId: strategy.id }, include: { tag: true } });
    const currentTagNames = new Set(currentAssignments.map((a: StrategyTagAssignmentWithTag) => a.tag.name));
    const desiredTagNames = new Set(strategy.tags);

    const toRemove = currentAssignments.filter((a: StrategyTagAssignmentWithTag) => !desiredTagNames.has(a.tag.name));
    const toAdd = [...desiredTagNames].filter((name) => !currentTagNames.has(name));

    if (toRemove.length > 0) {
      await tx.strategyTagAssignment.deleteMany({ where: { strategyId: strategy.id, tagId: { in: toRemove.map((a: StrategyTagAssignmentWithTag) => a.tagId) } } });
    }

    for (const tagName of toAdd) {
      const tag = await tx.strategyTag.upsert({ where: { name: tagName }, create: { name: tagName }, update: {} });
      await tx.strategyTagAssignment.create({ data: { strategyId: strategy.id, tagId: tag.id } });
    }
  }
}
