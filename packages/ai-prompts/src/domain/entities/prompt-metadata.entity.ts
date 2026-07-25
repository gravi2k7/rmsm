/**
 * Descriptive, non-behavioral information about a `PromptTemplate`.
 * Nothing in here changes how a template renders or compiles — it
 * exists for discovery (`PromptRegistry.list()` filtering by tag),
 * provider-fit decisions (a caller can skip a template whose
 * `providerCompatibility` excludes the provider it's about to call),
 * and sane generation defaults a caller may apply when it forwards a
 * `CompiledPrompt` to AI-201's `AiGatewayService.chat()`.
 */
export interface PromptMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** Provider type strings this prompt is known to work well with (e.g. "openai", "ollama"). Empty = provider-agnostic. */
  readonly providerCompatibility: readonly string[];
  readonly temperatureRecommendation?: number;
  readonly maxTokensRecommendation?: number;
  readonly author: string;
  readonly version: string;
}
