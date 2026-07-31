const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockCreateTransport = jest.fn().mockImplementation(() => ({ sendMail: mockSendMail, verify: mockVerify }));

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: { createTransport: mockCreateTransport },
}));

import { SMTPEmailProvider, type SmtpProviderConfig } from "../providers/smtp/smtp-email.provider";

function buildConfig(overrides: Partial<SmtpProviderConfig> = {}): SmtpProviderConfig {
  return {
    host: "smtp.example.com",
    port: 587,
    username: "user",
    password: "pass",
    tls: true,
    pool: true,
    maxConnections: 5,
    timeoutMs: 5000,
    from: "RMSM <no-reply@rmsm.ai>",
    ...overrides,
  };
}

describe("SMTPEmailProvider", () => {
  beforeEach(() => {
    mockSendMail.mockReset();
    mockVerify.mockReset();
    mockCreateTransport.mockClear();
  });

  it("is enabled only when a host is configured", () => {
    expect(new SMTPEmailProvider(buildConfig()).enabled).toBe(true);
    expect(new SMTPEmailProvider(buildConfig({ host: "" })).enabled).toBe(false);
  });

  it("send() maps the enterprise message onto nodemailer's sendMail options", async () => {
    mockSendMail.mockResolvedValue({ messageId: "msg-1", accepted: ["a@example.com"] });
    const provider = new SMTPEmailProvider(buildConfig());

    const result = await provider.send({ to: ["a@example.com"], cc: ["b@example.com"], subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

    expect(result).toEqual({ providerMessageId: "msg-1", provider: "SMTP" });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "RMSM <no-reply@rmsm.ai>", to: ["a@example.com"], cc: ["b@example.com"], subject: "Hi", html: "<p>Hi</p>", text: "Hi" }),
    );
  });

  it("maps attachments onto nodemailer's attachment shape", async () => {
    mockSendMail.mockResolvedValue({ messageId: "msg-1", accepted: [] });
    const provider = new SMTPEmailProvider(buildConfig());

    await provider.send({ to: ["a@example.com"], subject: "Hi", attachments: [{ fileName: "report.pdf", mimeType: "application/pdf", content: "YmFzZTY0" }] });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.attachments).toEqual([{ filename: "report.pdf", contentType: "application/pdf", content: "YmFzZTY0", encoding: "base64" }]);
  });

  it("uses secure:true when tls is enabled on port 465, and requireTLS otherwise", async () => {
    mockSendMail.mockResolvedValue({ messageId: "m", accepted: [] });
    await new SMTPEmailProvider(buildConfig({ port: 465, tls: true })).send({ to: ["a@example.com"], subject: "x" });
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, requireTLS: false }));

    mockCreateTransport.mockClear();
    await new SMTPEmailProvider(buildConfig({ port: 587, tls: true })).send({ to: ["a@example.com"], subject: "x" });
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: false, requireTLS: true }));
  });

  it("passes pool/maxConnections/timeout options through to nodemailer", async () => {
    mockSendMail.mockResolvedValue({ messageId: "m", accepted: [] });
    await new SMTPEmailProvider(buildConfig({ pool: true, maxConnections: 8, timeoutMs: 12_000 })).send({ to: ["a@example.com"], subject: "x" });

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ pool: true, maxConnections: 8, connectionTimeout: 12_000 }));
  });

  it("classifies an authentication failure (SMTP 535) distinctly", async () => {
    mockSendMail.mockRejectedValue(Object.assign(new Error("auth failed"), { responseCode: 535 }));
    const provider = new SMTPEmailProvider(buildConfig());

    await expect(provider.send({ to: ["a@example.com"], subject: "x" })).rejects.toMatchObject({ isAuthenticationFailure: true, smtpCode: 535 });
  });

  it("classifies an invalid recipient (SMTP 550) distinctly", async () => {
    mockSendMail.mockRejectedValue(Object.assign(new Error("mailbox unavailable"), { responseCode: 550 }));
    const provider = new SMTPEmailProvider(buildConfig());

    await expect(provider.send({ to: ["bad@example.com"], subject: "x" })).rejects.toMatchObject({ isInvalidRecipient: true, smtpCode: 550 });
  });

  it("falls back to a generic SMTP failure for an unrecognized error", async () => {
    mockSendMail.mockRejectedValue(new Error("something else"));
    const provider = new SMTPEmailProvider(buildConfig());

    await expect(provider.send({ to: ["a@example.com"], subject: "x" })).rejects.toMatchObject({ isSmtpFailure: true });
  });

  it("verifyConnection() resolves true when transporter.verify() succeeds", async () => {
    mockVerify.mockResolvedValue(true);
    await expect(new SMTPEmailProvider(buildConfig()).verifyConnection()).resolves.toBe(true);
  });

  it("verifyConnection() resolves false (never throws) when transporter.verify() fails", async () => {
    mockVerify.mockRejectedValue(new Error("connection refused"));
    await expect(new SMTPEmailProvider(buildConfig()).verifyConnection()).resolves.toBe(false);
  });

  it("reuses the same transporter across multiple sends rather than reconnecting each time", async () => {
    mockSendMail.mockResolvedValue({ messageId: "m", accepted: [] });
    const provider = new SMTPEmailProvider(buildConfig());

    await provider.send({ to: ["a@example.com"], subject: "x" });
    await provider.send({ to: ["b@example.com"], subject: "y" });

    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
  });
});
