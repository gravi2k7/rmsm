import type { StrategyWithTags } from "@rmsm/database";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import { toPrismaCategoryCode, toDomainCategoryCode, toPrismaStrategyStatus, toDomainStrategyStatus } from "./enum-mappers.util";

/** Milestone 2 fix applied — categoryCode/status now go through the exhaustive enum-mappers.util.ts translation instead of blind `as` casts. */
export function toStrategyDomain(row: StrategyWithTags): Strategy {
  const tags = row.tagAssignments.map((a) => a.tag.name);
  return new Strategy(row.id, row.organizationId, row.name, row.description, toDomainCategoryCode(row.categoryCode), tags, toDomainStrategyStatus(row.status), row.currentPublishedVersionId, row.createdById ?? "", row.createdAt);
}

/** Only the Strategy's own top-level columns — tag assignments are a separate table (`strategy_tag_assignments`) a repository's own `save()` reconciles independently (insert newly-added tags, delete removed ones), not something this mapper's own single "one row in, one row out" shape can express. */
export function toStrategyPersistence(strategy: Strategy, updatedById: string | null) {
  return {
    id: strategy.id,
    organizationId: strategy.organizationId,
    name: strategy.name,
    slug: slugify(strategy.name),
    description: strategy.description,
    categoryCode: toPrismaCategoryCode(strategy.category),
    status: toPrismaStrategyStatus(strategy.status),
    currentPublishedVersionId: strategy.currentPublishedVersionId,
    updatedById,
  };
}

/** A real, deliberately simple slugify — lowercase, non-alphanumerics collapsed to single hyphens, trimmed. Not exposed as a domain concern (the `Strategy` aggregate has no `slug` field at all — a pure persistence/URL concern, generated here at the mapping boundary rather than forcing the domain to know about URL-safety). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
