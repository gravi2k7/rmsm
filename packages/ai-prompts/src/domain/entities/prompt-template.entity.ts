import type { PromptType } from "../enums/prompt-type.enum";
import type { PromptVariable } from "./prompt-variable.entity";
import type { PromptMetadata } from "./prompt-metadata.entity";

/**
 * The core domain entity of AI-202: one named, versioned, renderable
 * prompt body. `id` is the immutable identity of one specific version
 * (registry lookups by id never change what they return); `name` is
 * the stable identity across versions (registry lookups by name resolve
 * to whichever version is requested, defaulting to the latest).
 *
 * `template` holds raw `{{variable}}` placeholder syntax — never
 * pre-rendered, never provider-specific. Rendering happens exactly once,
 * in `PromptCompiler`/`renderTemplate`, on the way to a `CompiledPrompt`.
 */
export interface PromptTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly type: PromptType;
  readonly template: string;
  readonly variables: readonly PromptVariable[];
  readonly metadata: PromptMetadata;
}
