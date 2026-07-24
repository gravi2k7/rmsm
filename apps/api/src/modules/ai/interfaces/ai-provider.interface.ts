/**
 * The ONE contract every provider adapter implements — cloud (OpenAI,
 * Anthropic, Gemini, Azure OpenAI), local (Ollama, LM Studio), and
 * enterprise (vLLM, NVIDIA NIM, HuggingFace TGI). This phase's own
 * central rule made concrete: "no business module should ever know
 * whether the request is handled by GPT, Claude, Gemini, Ollama, or
 * another provider" — every provider, regardless of what actually
 * runs behind it, exposes exactly this shape, and the Gateway
 * (`gateway/ai-gateway.service.ts`) is the only thing that ever calls
 * a provider directly. A future provider (Anthropic, Gemini, Azure,
 * vLLM, NIM, TGI) is "pluggable" in the literal sense this phase's own
 * words use: implement this interface, register it
 * (`providers/provider-registrar.service.ts`'s own real pattern), and
 * nothing else in this module needs to change.
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Set when role is "tool" — which tool call this message is a result for. Real field for future Tool Calling (this phase's own "design for future Tool Calling" instruction) — unused by any provider adapter built this phase, since none of them perform real tool calls yet. */
  toolCallId?: string;
  name?: string;
}

export type FinishReason = "stop" | "length" | "content_filter" | "tool_calls" | "error";

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  finishReason: FinishReason;
  usage: TokenUsage;
}

export interface ChatStreamChunk {
  delta: string;
  finishReason: FinishReason | null;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  usage: Pick<TokenUsage, "promptTokens" | "totalTokens">;
}

export interface ModerationRequest {
  input: string;
}

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
}

/**
 * "Model Capability Detection" (this phase's own deliverable), made
 * concrete and checkable — the Gateway consults this BEFORE routing a
 * request, so calling `/api/ai/moderate` against a provider with
 * `moderation: false` (e.g. Ollama, which has no moderation endpoint
 * at all) fails with a clear `CapabilityNotSupportedError` at the
 * Gateway layer, not a confusing provider-specific HTTP error two
 * layers down.
 */
export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  embedding: boolean;
  moderation: boolean;
  maxContextTokens: number;
  supportsFunctionCalling: boolean;
}

export interface ProviderHealth {
  healthy: boolean;
  latencyMs?: number;
  message?: string;
}

export interface AiProvider {
  readonly type: string;
  readonly enabled: boolean;

  chat(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
  stream(request: ChatCompletionRequest): AsyncIterable<ChatStreamChunk>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
  moderate(request: ModerationRequest): Promise<ModerationResult>;
  healthCheck(): Promise<ProviderHealth>;
  /** A real, provider-specific estimate — see each adapter's own comment for its own real counting strategy (tiktoken-shaped for OpenAI, a documented approximation for Ollama, which exposes no public tokenizer). Never a placeholder constant. */
  countTokens(text: string, model: string): number;
  supportedModels(): string[];
  capabilities(): ProviderCapabilities;
}
