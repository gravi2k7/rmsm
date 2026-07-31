import { ResendEmailProvider, type ResendProviderConfig } from "../providers/resend/resend-email.provider";

function buildConfig(overrides: Partial<ResendProviderConfig> = {}): ResendProviderConfig {
  return { apiKey: "re_test_key", from: "RMSM <no-reply@rmsm.ai>", timeoutMs: 200, ...overrides };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe("ResendEmailProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("is enabled only when an API key is configured", () => {
    expect(new ResendEmailProvider(buildConfig()).enabled).toBe(true);
    expect(new ResendEmailProvider(buildConfig({ apiKey: "" })).enabled).toBe(false);
  });

  it("send() posts to /emails with the mapped payload and Bearer auth", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { id: "resend-id-1" }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    const result = await provider.send({ to: ["a@example.com"], subject: "Hi", html: "<p>Hi</p>", replyTo: "reply@example.com" });

    expect(result).toEqual({ providerMessageId: "resend-id-1", provider: "RESEND" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ from: "RMSM <no-reply@rmsm.ai>", to: ["a@example.com"], subject: "Hi", html: "<p>Hi</p>", reply_to: "reply@example.com" });
  });

  it("base64-encodes Buffer attachment content", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { id: "resend-id-1" }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    await provider.send({ to: ["a@example.com"], subject: "Hi", attachments: [{ fileName: "report.csv", mimeType: "text/csv", content: Buffer.from("a,b,c") }] });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.attachments).toEqual([{ filename: "report.csv", content: Buffer.from("a,b,c").toString("base64") }]);
  });

  it("classifies a 401/403 as authentication_failure-flagged error", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(401, { message: "invalid API key" })) as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    await expect(provider.send({ to: ["a@example.com"], subject: "x" })).rejects.toMatchObject({ isAuthenticationFailure: true, httpStatus: 401 });
  });

  it("classifies a 422 as isInvalidRecipient", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(422, { message: "invalid recipient" })) as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    await expect(provider.send({ to: ["bad"], subject: "x" })).rejects.toMatchObject({ isInvalidRecipient: true });
  });

  it("classifies a 429 as isRateLimit", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(429, { message: "rate limited" })) as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    await expect(provider.send({ to: ["a@example.com"], subject: "x" })).rejects.toMatchObject({ isRateLimit: true });
  });

  it("classifies a 503 as isProviderUnavailable", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(503, { message: "down" })) as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    await expect(provider.send({ to: ["a@example.com"], subject: "x" })).rejects.toMatchObject({ isProviderUnavailable: true });
  });

  it("classifies an aborted request as isTimeout", async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    }) as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    await expect(provider.send({ to: ["a@example.com"], subject: "x" })).rejects.toMatchObject({ isTimeout: true });
  });

  it("classifies a raw network failure as isProviderUnavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const provider = new ResendEmailProvider(buildConfig());

    await expect(provider.send({ to: ["a@example.com"], subject: "x" })).rejects.toMatchObject({ isProviderUnavailable: true });
  });

  it("verifyConnection() resolves true when the domains endpoint responds ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    await expect(new ResendEmailProvider(buildConfig()).verifyConnection()).resolves.toBe(true);
  });

  it("verifyConnection() resolves false (never throws) on failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    await expect(new ResendEmailProvider(buildConfig()).verifyConnection()).resolves.toBe(false);
  });
});
