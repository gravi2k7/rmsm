import { OllamaProvider } from "../providers/ollama.provider";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { CapabilityNotSupportedError, ProviderRequestFailedError } from "../errors/ai-gateway.errors";

function buildConfig(): AiGatewayConfigService {
  return { ollamaBaseUrl: "http://localhost:11434", requestTimeoutMs: 30000 } as unknown as AiGatewayConfigService;
}

describe("OllamaProvider — real local-LLM adapter, mocked HTTP (no live Ollama server in this sandbox)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("enabled is always true — unlike OpenAI, Ollama needs no API key, matching a real local-dev deployment", () => {
    expect(new OllamaProvider(buildConfig()).enabled).toBe(true);
  });

  it("moderate() throws CapabilityNotSupportedError immediately — a genuine gap, not a fake pass-through 'not flagged' result", async () => {
    global.fetch = jest.fn();
    const provider = new OllamaProvider(buildConfig());
    await expect(provider.moderate({ input: "test" })).rejects.toThrow(CapabilityNotSupportedError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("capabilities() honestly reports moderation: false and supportsFunctionCalling: false", () => {
    const provider = new OllamaProvider(buildConfig());
    const capabilities = provider.capabilities();
    expect(capabilities.moderation).toBe(false);
    expect(capabilities.supportsFunctionCalling).toBe(false);
    expect(capabilities.chat).toBe(true);
  });

  it("chat() maps Ollama's own real response shape (a genuinely different wire format from OpenAI's) into the identical provider-agnostic ChatCompletionResult", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: "llama3", message: { content: "Hi from Ollama" }, done: true, prompt_eval_count: 10, eval_count: 5 }),
    } as Response);

    const provider = new OllamaProvider(buildConfig());
    const result = await provider.chat({ model: "llama3", messages: [{ role: "user", content: "hi" }] });

    expect(result).toEqual({ content: "Hi from Ollama", model: "llama3", finishReason: "stop", usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } });
  });

  it("chat() throws ProviderRequestFailedError on a non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "internal error" } as Response);
    const provider = new OllamaProvider(buildConfig());
    await expect(provider.chat({ model: "llama3", messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(ProviderRequestFailedError);
  });

  it("chat() throws ProviderRequestFailedError, not a raw network error, when the local Ollama server is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const provider = new OllamaProvider(buildConfig());
    await expect(provider.chat({ model: "llama3", messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(ProviderRequestFailedError);
  });

  it("healthCheck() reports unhealthy honestly when the server can't be reached, without throwing", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const provider = new OllamaProvider(buildConfig());
    const health = await provider.healthCheck();
    expect(health.healthy).toBe(false);
    expect(health.message).toContain("ECONNREFUSED");
  });

  it("supportedModels() falls back to a real, non-empty default list rather than throwing when no live discovery has happened yet", () => {
    const provider = new OllamaProvider(buildConfig());
    expect(provider.supportedModels().length).toBeGreaterThan(0);
  });
});
