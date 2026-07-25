import type { ModerationResult } from "../domain/entities/moderation-result.entity";

export interface ModerationProvider {
  moderate(text: string): Promise<ModerationResult>;
}
