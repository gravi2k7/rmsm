import { Injectable } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import type { StrategyCategory as StrategyCategoryRow, StrategyTag as StrategyTagRow } from "@rmsm/database";
import type { CategoryRepository as CategoryRepositoryInterface, TagRepository as TagRepositoryInterface, StrategyCategoryDisplayInfo } from "../../domain/repositories/category-tag.repository.interface";

@Injectable()
export class CategoryRepository implements CategoryRepositoryInterface {
  async listAll(): Promise<StrategyCategoryDisplayInfo[]> {
    const rows = await prisma.strategyCategory.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map((row: StrategyCategoryRow) => ({ code: row.code, displayName: row.displayName, description: row.description, sortOrder: row.sortOrder }));
  }
}

@Injectable()
export class TagRepository implements TagRepositoryInterface {
  async ensureExists(tagName: string): Promise<void> {
    await prisma.strategyTag.upsert({ where: { name: tagName }, create: { name: tagName }, update: {} });
  }

  async listAllKnown(): Promise<string[]> {
    const rows = await prisma.strategyTag.findMany({ orderBy: { name: "asc" } });
    return rows.map((r: StrategyTagRow) => r.name);
  }
}
