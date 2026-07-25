import type { Conversation } from "../domain/entities/conversation.entity";

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
}
