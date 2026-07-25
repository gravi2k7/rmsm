/** Records that memory was loaded/retrieved during a request — same
 * "observe through data, not a type dependency" rule as `PromptTrace`
 * applies here relative to `@rmsm/ai-memory`. */
export interface MemoryTrace {
  readonly requestId: string;
  readonly conversationId: string | null;
  readonly entryCount: number;
  readonly occurredAt: Date;
}
