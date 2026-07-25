/**
 * The full set of prompt roles/categories AI-202 recognizes. Two
 * different axes are deliberately folded into one enum, mirroring how
 * the spec itself lists them together:
 *  - message-role types (SYSTEM, USER, ASSISTANT, TOOL, FUNCTION) —
 *    map directly onto AI-201's own `ChatMessageDto.role` values, so a
 *    compiled prompt's pieces can be handed straight to
 *    `AiGatewayService.chat()` without any translation layer.
 *  - use-case categories (CHAT, CODING, ANALYSIS, SUMMARY, RESEARCH,
 *    CUSTOM) — how templates are organized on disk under `templates/`
 *    (one folder per category) and how the registry's `list()` filters.
 * A single template's `type` is one value from this set; which axis it
 * belongs to is just a matter of how the template is used.
 */
export enum PromptType {
  SYSTEM = "SYSTEM",
  USER = "USER",
  ASSISTANT = "ASSISTANT",
  TOOL = "TOOL",
  FUNCTION = "FUNCTION",
  CHAT = "CHAT",
  CODING = "CODING",
  ANALYSIS = "ANALYSIS",
  SUMMARY = "SUMMARY",
  RESEARCH = "RESEARCH",
  CUSTOM = "CUSTOM",
}

/** Every `PromptType` value, for zod schemas and exhaustiveness checks. */
export const PROMPT_TYPES = Object.values(PromptType) as readonly PromptType[];
