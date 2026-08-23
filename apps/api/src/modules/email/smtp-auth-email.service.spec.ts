import { SmtpAuthEmailService } from "./smtp-auth-email.service";
import type { SmtpEmailService } from "./smtp-email.service";

describe("SmtpAuthEmailService", () => {
  it("converts the single application recipient into the provider recipient array", async () => {
    const send = jest.fn().mockResolvedValue({
      providerMessageId: "smtp-test",
    });

    const transport = {
      send,
    } as unknown as SmtpEmailService;

    const service = new SmtpAuthEmailService(transport);

    await service.send({
      to: "gravi2k14@gmail.com",
      subject: "Password reset",
      html: "<p>Reset password</p>",
    });

    expect(send).toHaveBeenCalledWith({
      to: ["gravi2k14@gmail.com"],
      subject: "Password reset",
      html: "<p>Reset password</p>",
    });
  });
});
