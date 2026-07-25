import type { PromptMetadata } from "./prompt-metadata.entity";

/**
 * The one and only output of `PromptCompiler.compile()` — fully
 * rendered, ready to hand to a provider (e.g. as
 * `{ role: "system", content: systemPrompt }` /
 * `{ role: "user", content: userPrompt }` in an AI-201
 * `ChatRequestDto.messages` array). Nothing downstream of a
 * `CompiledPrompt` should ever concatenate prompt strings again — if a
 * caller needs to add another prompt fragment, that means going back
 * through the compiler, not appending to `systemPrompt`/`userPrompt`
 * by hand.
 */
export interface CompiledPrompt {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  /** The final, resolved variable values used to render this prompt (declared values merged with applied defaults). */
  readonly variables: Readonly<Record<string, string>>;
  /** Metadata of every source template that contributed a fragment, in composition order. */
  readonly metadata: readonly PromptMetadata[];
}
