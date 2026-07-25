import type { Conversation } from "../domain/entities/conversation.entity";
import type { ConversationRepository } from "../repositories/conversation-repository.interface";

export class InMemoryConversationProvider implements ConversationRepository {
  private readonly byId = new Map<string, Conversation>();

  async findById(id: string): Promise<Conversation | null> {
    return this.byId.get(id) ?? null;
  }

  async save(conversation: Conversation): Promise<void> {
    this.byId.set(conversation.id, conversation);
  }
}
