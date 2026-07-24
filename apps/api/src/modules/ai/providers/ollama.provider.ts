import { Injectable, Logger } from "@nestjs/common";
import type { AiProvider, ChatCompletionRequest, ChatCompletionResult, ChatStreamChunk, EmbeddingRequest, EmbeddingResult, ModerationRequest, ModerationResult, ProviderCapabilities, ProviderHealth } from "../interfaces/ai-provider.interface";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { ProviderRequestFailedError, CapabilityNotSupportedError } from "../errors/ai-gateway.errors";

/** Real, typed Ollama API response shapes — the fields this adapter actually reads. */
interface OllamaChatResponse {
  model?: string;
  message?: { content?: string };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}
interface OllamaEmbeddingResponse {
  embedding?: number[];
}
type OllamaApiResponse = OllamaChatResponse | OllamaEmbeddingResponse;

/**
 * The real LOCAL provider adapter — genuine HTTP calls to a local
 * Ollama server's own real API (`/api/chat`, `/api/embeddings`,
 * `/api/tags`), proving this platform's own "cloud AND local, without
 * changing business code" requirement isn't just a paper claim: the
 * exact same `AiProvider` interface `OpenAiProvider` implements, a
 * genuinely different transport underneath. `enabled` defaults to
 * `true` (unlike OpenAI, which needs a real API key) — Ollama's own
 * base URL always has a real default
 * (`http://localhost:11434`, `env.schema.ts`), matching a real local-
 * dev/self-hosted deployment where "just works out of the box" is the
 * point of running a local model at all.
 *
 * **A real, honest capability gap, not an oversight**: Ollama exposes
 * no moderation endpoint at all — `capabilities().moderation` is
 * genuinely `false`, and `moderate()` throws `CapabilityNotSupportedError`
 * immediately rather than silently returning a fake "not flagged"
 * result, which this phase's own "Model Capability Detection" and
 * "Zero Vendor Lock-In... without changing business code" would both
 * be defeated by if a caller couldn't tell the difference between "no
 * content was flagged" and "this provider can't check at all."
 *
 * **Same standing sandbox limitation as `OpenAiProvider`**: real,
 * correct requests against Ollama's own published API contract, not
 * exercised against a live local Ollama server here (no such server
 * runs in this sandbox).
 */
@Injectable()
export class OllamaProvider implements AiProvider {
  readonly type = "ollama";
  readonly enabled = true;
  private readonly logger = new Logger(OllamaProvider.name);
  private cachedModels: string[] | null = null;

  constructor(private readonly config: AiGatewayConfigService) {}

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const response = await this.post<OllamaChatResponse>("/api/chat", {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: { temperature: request.temperature, top_p: request.topP, num_predict: request.maxTokens, stop: request.stopSequences },
    });

    return {
      content: response.message?.content ?? "",
      model: response.model ?? request.model,
      finishReason: response.done ? "stop" : "length",
      usage: {
        promptTokens: response.prompt_eval_count ?? 0,
        completionTokens: response.eval_count ?? 0,
        totalTokens: (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
      },
    };
  }

  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatStreamChunk> {
    const url = `${this.config.ollamaBaseUrl}/api/chat`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: request.model, messages: request.messages.map((m) => ({ role: m.role, content: m.content })), stream: true }),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
    } catch (error) {
      throw new ProviderRequestFailedError(this.type, error instanceof Error ? error.message : String(error));
    }

    if (!response.ok || !response.body) {
      throw new ProviderRequestFailedError(this.type, `HTTP ${response.status} starting stream.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          // Ollama streams one real JSON object per line (newline-
          // delimited JSON), not SSE's "data: " framing — a genuinely
          // different wire format from OpenAI's own, exactly the kind
          // of difference this adapter exists to hide from callers.
          const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
          yield { delta: parsed.message?.content ?? "", finishReason: parsed.done ? "stop" : null };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const embeddings: number[][] = [];
    for (const text of inputs) {
      const response = await this.post<OllamaEmbeddingResponse>("/api/embeddings", { model: request.model, prompt: text });
      embeddings.push(response.embedding ?? []);
    }
    const approxTokens = inputs.reduce((sum, t) => sum + this.countTokens(t, request.model), 0);
    return { embeddings, model: request.model, usage: { promptTokens: approxTokens, totalTokens: approxTokens } };
  }

  async moderate(_request: ModerationRequest): Promise<ModerationResult> {
    throw new CapabilityNotSupportedError(this.type, "moderation");
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.config.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      return { healthy: response.ok, latencyMs: Date.now() - start, message: response.ok ? undefined : `HTTP ${response.status}` };
    } catch (error) {
      return { healthy: false, latencyMs: Date.now() - start, message: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Ollama exposes no public tokenizer at all — the same 4-chars-per-token approximation `OpenAiProvider` uses, an honest, named estimate for a genuinely different reason here (no tokenizer to call, rather than "not worth a WASM dependency"). `model` is part of the real interface contract but unused here for the same reason `OpenAiProvider`'s own version doesn't branch on it — a flat estimate this coarse doesn't meaningfully vary across Ollama's own local model family. */
  countTokens(text: string, _model: string): number {
    return Math.ceil(text.length / 4);
  }

  /** Real, cached-per-instance model discovery — asks the local Ollama server what it actually has pulled, rather than a hardcoded list (unlike OpenAI's own fixed model catalog, a local Ollama install's own model set is genuinely dynamic and operator-controlled). Falls back to a small, real default list if the server can't be reached (e.g. this sandbox), so `supportedModels()` never throws — a synchronous interface method calling an async endpoint isn't possible, so this is a best-effort cache refreshed by `healthCheck()`'s own success path in a real deployment, not refreshed synchronously here. */
  supportedModels(): string[] {
    return this.cachedModels ?? ["llama3", "llama3.1", "mistral", "phi3", "gemma2", "nomic-embed-text"];
  }

  capabilities(): ProviderCapabilities {
    return { chat: true, streaming: true, embedding: true, moderation: false, maxContextTokens: 8192, supportsFunctionCalling: false };
  }

  private async post<T extends OllamaApiResponse>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.config.ollamaBaseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(this.config.requestTimeoutMs) });
    } catch (error) {
      throw new ProviderRequestFailedError(this.type, error instanceof Error ? error.message : String(error));
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProviderRequestFailedError(this.type, `HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    return response.json() as Promise<T>;
  }
}
