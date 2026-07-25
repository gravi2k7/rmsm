/** Records that a prompt was rendered during a request — deliberately
 * shaped as plain identifiers/strings (`templateId`, `renderedText`),
 * not a reference to `@rmsm/ai-prompts`' own `CompiledPrompt` entity:
 * AI-204 observes AI-202 through the data an event carries, never
 * through a type-level dependency on the package itself. */
export interface PromptTrace {
  readonly requestId: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly renderedText: string;
  readonly occurredAt: Date;
}
