import { Injectable } from "@nestjs/common";
import { TagRepository } from "../../infrastructure/repositories/category-tag.repository";

export class ListTagsQuery {}

@Injectable()
export class ListTagsHandler {
  constructor(private readonly tagRepository: TagRepository) {}

  async execute(): Promise<string[]> {
    return this.tagRepository.listAllKnown();
  }
}
