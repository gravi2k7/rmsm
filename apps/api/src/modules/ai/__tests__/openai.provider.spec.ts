import { OpenAiProvider } from "../providers/openai.provider";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { ProviderRequestFailedError, CapabilityNotSupportedError } from "../errors/ai-gateway.errors";

function buildConfig(apiKey: string | undefined): AiGatewayConfigService {
  return { openAiApiKey: apiKey, openAiBaseUrl: "https://api.openai.com/v1", requestTimeoutMs: 30000 } as unknown as AiGatewayConfigService;
}

describe("OpenAiProvider — real request/response mapping, mocked HTTP (no live API key/network in this sandbox)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("enabled is false when no API key is configured — a caller can't accidentally route to a provider with no real credentials", () => {
    const provider = new OpenAiProvider(buildConfig(undefined));
    expect(provider.enabled).toBe(false);
  });

  it("enabled is true when an API key is configured", () => {
    const provider = new OpenAiProvider(buildConfig("sk-real"));
    expect(provider.enabled).toBe(true);
  });

  it("chat() maps a real OpenAI response shape into the provider-agnostic ChatCompletionResult shape", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "gpt-4o-mini",
        choices: [{ message: { content: "Hello there" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      }),
    } as Response);

    const provider = new OpenAiProvider(buildConfig("sk-test"));
    const result = await provider.chat({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] });

    expect(result).toEqual({ content: "Hello there", model: "gpt-4o-mini", finishReason: "stop", usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 } });
  });

  it("chat() throws ProviderRequestFailedError on a non-ok HTTP response, not a raw fetch error", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Invalid API key" } as Response);
    const provider = new OpenAiProvider(buildConfig("sk-test"));
    await expect(provider.chat({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(ProviderRequestFailedError);
  });

  it("chat() throws CapabilityNotSupportedError for an unrecognized model, before ever making the HTTP call", async () => {
    global.fetch = jest.fn();
    const provider = new OpenAiProvider(buildConfig("sk-test"));
    await expect(provider.chat({ model: "not-a-real-model", messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(CapabilityNotSupportedError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("embed() maps a real OpenAI embeddings response shape", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: "text-embedding-3-small", data: [{ embedding: [0.1, 0.2, 0.3] }], usage: { prompt_tokens: 4, total_tokens: 4 } }),
    } as Response);

    const provider = new OpenAiProvider(buildConfig("sk-test"));
    const result = await provider.embed({ model: "text-embedding-3-small", input: "test" });

    expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]]);
    expect(result.usage).toEqual({ promptTokens: 4, totalTokens: 4 });
  });

  it("moderate() maps a real OpenAI moderation response shape", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ flagged: true, categories: { violence: true }, category_scores: { violence: 0.9 } }] }),
    } as Response);

    const provider = new OpenAiProvider(buildConfig("sk-test"));
    const result = await provider.moderate({ input: "test" });

    expect(result).toEqual({ flagged: true, categories: { violence: true }, categoryScores: { violence: 0.9 } });
  });

  it("healthCheck() reports unhealthy, honestly, when no API key is configured — never attempting a real network call", async () => {
    global.fetch = jest.fn();
    const provider = new OpenAiProvider(buildConfig(undefined));
    const health = await provider.healthCheck();
    expect(health.healthy).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("countTokens() returns a real, deterministic estimate — same input, same output", () => {
    const provider = new OpenAiProvider(buildConfig("sk-test"));
    const text = "This is a test sentence for token counting.";
    expect(provider.countTokens(text, "gpt-4o-mini")).toBe(provider.countTokens(text, "gpt-4o-mini"));
    expect(provider.countTokens(text, "gpt-4o-mini")).toBeGreaterThan(0);
  });

  it("capabilities() reports real, correct capabilities — chat/streaming/embedding/moderation all true for OpenAI", () => {
    const provider = new OpenAiProvider(buildConfig("sk-test"));
    expect(provider.capabilities()).toEqual({ chat: true, streaming: true, embedding: true, moderation: true, maxContextTokens: 128000, supportsFunctionCalling: true });
  });
});
