import { Global, Module } from "@nestjs/common";
import { loadConfig } from "@rmsm/config";

import { EmailService } from "./email.service.interface";
import { ConsoleEmailService } from "./console-email.service";
import { createSmtpEmailService } from "./smtp-email.service.factory";
import { SmtpAuthEmailService } from "./smtp-auth-email.service";

@Global()
@Module({
  providers: [
    ConsoleEmailService,
    {
      provide: EmailService,
      useFactory: (
        consoleEmailService: ConsoleEmailService,
      ): EmailService => {
        const config = loadConfig();

        if (config.EMAIL_PROVIDER === "smtp") {
          return new SmtpAuthEmailService(createSmtpEmailService());
        }

        return consoleEmailService;
      },
      inject: [ConsoleEmailService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}