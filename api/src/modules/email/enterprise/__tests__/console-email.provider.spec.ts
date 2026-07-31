import { ConsoleEmailProvider } from "../providers/console/console-email.provider";

describe("ConsoleEmailProvider", () => {
  it("is always enabled — zero-setup dev/local default", () => {
    expect(new ConsoleEmailProvider().enabled).toBe(true);
  });

  it("send() resolves with a CONSOLE provider message id and never throws", async () => {
    const provider = new ConsoleEmailProvider();

    const result = await provider.send({ to: ["user@example.com"], subject: "Hi", html: "<p>Hi</p>" });

    expect(result.provider).toBe("CONSOLE");
    expect(result.providerMessageId).toMatch(/^console_/);
  });

  it("verifyConnection() always resolves true — logging can't fail", async () => {
    await expect(new ConsoleEmailProvider().verifyConnection()).resolves.toBe(true);
  });

  it("does not throw when given cc/bcc/attachments (logged as extra lines, not required fields)", async () => {
    const provider = new ConsoleEmailProvider();

    await expect(
      provider.send({
        to: ["a@example.com", "b@example.com"],
        cc: ["c@example.com"],
        bcc: ["d@example.com"],
        subject: "Hi",
        html: "<p>Hi</p>",
        attachments: [{ fileName: "report.pdf", mimeType: "application/pdf", content: "base64==" }],
      }),
    ).resolves.toMatchObject({ provider: "CONSOLE" });
  });
});
