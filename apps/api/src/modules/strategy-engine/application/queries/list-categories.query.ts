import { Injectable } from "@nestjs/common";
import { CategoryRepository } from "../../infrastructure/repositories/category-tag.repository";
import type { StrategyCategoryDisplayInfo } from "../../domain/repositories/category-tag.repository.interface";

export class ListCategoriesQuery {}

@Injectable()
export class ListCategoriesHandler {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(): Promise<StrategyCategoryDisplayInfo[]> {
    return this.categoryRepository.listAll();
  }
}
