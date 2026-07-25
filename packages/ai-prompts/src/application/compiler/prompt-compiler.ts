import { PromptType } from "../../domain/enums/prompt-type.enum";
import type { PromptTemplate } from "../../domain/entities/prompt-template.entity";
import type { PromptMetadata } from "../../domain/entities/prompt-metadata.entity";
import type { CompiledPrompt } from "../../domain/entities/compiled-prompt.entity";
import { InvalidPromptError } from "../../domain/errors/prompt-domain.errors";
import { resolveEffectiveVariables, renderTemplate } from "../rendering/variable-renderer";
import { assertValidTemplate } from "../validation/prompt-validator";

/**
 * One piece of a composed prompt: either a raw string (rendered as an
 * inline, undeclared-variable template — every `{{name}}` it uses must
 * be supplied directly in `variables`, since there's no
 * `PromptTemplate.variables` list to supply defaults or to validate
 * against) or a full registered `PromptTemplate` (validated via
 * `assertValidTemplate`, rendered with its own declared defaults
 * applied, and contributing its `metadata` to the compiled result).
 */
export type PromptFragment = string | PromptTemplate;

export interface PromptCompositionInput {
  readonly systemPrompt?: PromptFragment;
  readonly safetyPrompt?: PromptFragment;
  readonly rolePrompt?: PromptFragment;
  readonly contextPrompt?: PromptFragment;
  readonly taskPrompt?: PromptFragment;
  readonly userPrompt: PromptFragment;
  readonly variables?: Readonly<Record<string, string>>;
}

interface ResolvedFragment {
  readonly text: string;
  readonly metadata?: PromptMetadata;
  readonly effectiveVariables: Readonly<Record<string, string>>;
}

function resolveFragment(
  fragment: PromptFragment,
  variables: Readonly<Record<string, string>>,
  inlineId: string,
): ResolvedFragment {
  if (typeof fragment === "string") {
    const effectiveVariables = resolveEffectiveVariables({ templateId: inlineId, template: fragment, variables });
    const text = renderTemplate({ templateId: inlineId, template: fragment, variables });
    return { text, effectiveVariables };
  }

  assertValidTemplate(fragment, variables);
  const effectiveVariables = resolveEffectiveVariables({
    templateId: fragment.id,
    template: fragment.template,
    variables,
    declaredVariables: fragment.variables,
  });
  const text = renderTemplate({
    templateId: fragment.id,
    template: fragment.template,
    variables,
    declaredVariables: fragment.variables,
  });
  return { text, metadata: fragment.metadata, effectiveVariables };
}

/**
 * The ONLY sanctioned way to assemble a final prompt out of several
 * fragments in this platform. Per AI-202's own spec: "Do NOT
 * concatenate strings across the application. Everything should go
 * through the compiler." `systemPrompt` through `taskPrompt` are joined
 * (in that fixed order, blank fragments skipped, non-blank ones
 * separated by a blank line) into `CompiledPrompt.systemPrompt`;
 * `userPrompt` is rendered on its own into `CompiledPrompt.userPrompt`.
 * Each fragment may be raw text or a registered `PromptTemplate` —
 * template fragments are structurally validated
 * (`assertValidTemplate`) before rendering, so a broken template can
 * never silently make it into a compiled prompt.
 */
export class PromptCompiler {
  compile(input: PromptCompositionInput): CompiledPrompt {
    const variables = input.variables ?? {};
    const orderedSystemFragments: Array<[string, PromptFragment | undefined]> = [
      ["system", input.systemPrompt],
      ["safety", input.safetyPrompt],
      ["role", input.rolePrompt],
      ["context", input.contextPrompt],
      ["task", input.taskPrompt],
    ];

    const systemParts: string[] = [];
    const metadata: PromptMetadata[] = [];
    let effectiveVariables: Record<string, string> = {};

    for (const [slot, fragment] of orderedSystemFragments) {
      if (fragment === undefined) continue;
      const resolved = resolveFragment(fragment, variables, `inline:${slot}`);
      effectiveVariables = { ...effectiveVariables, ...resolved.effectiveVariables };
      if (resolved.text.trim().length > 0) systemParts.push(resolved.text.trim());
      if (resolved.metadata) metadata.push(resolved.metadata);
    }

    const resolvedUser = resolveFragment(input.userPrompt, variables, "inline:user");
    effectiveVariables = { ...effectiveVariables, ...resolvedUser.effectiveVariables };
    if (resolvedUser.metadata) metadata.push(resolvedUser.metadata);

    const systemPrompt = systemParts.join("\n\n");
    const userPrompt = resolvedUser.text.trim();

    if (systemPrompt.length === 0 && userPrompt.length === 0) {
      throw new InvalidPromptError("Compiled prompt is empty — every fragment rendered to blank content.");
    }

    return { systemPrompt, userPrompt, variables: effectiveVariables, metadata };
  }

  /**
   * Convenience path for the common case of compiling one registered
   * template on its own, with no composition. A `SYSTEM`-typed
   * template compiles into the `systemPrompt` slot; every other type
   * compiles into `userPrompt` — matching how AI-201's own
   * `ChatMessageDto.role` values line up with this package's
   * `PromptType`.
   */
  compileTemplate(template: PromptTemplate, variables: Readonly<Record<string, string>> = {}): CompiledPrompt {
    return template.type === PromptType.SYSTEM
      ? this.compile({ systemPrompt: template, userPrompt: "", variables })
      : this.compile({ userPrompt: template, variables });
  }
}
