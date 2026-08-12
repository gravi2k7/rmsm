import { Global, Module } from "@nestjs/common";
import { loadConfig } from "@rmsm/config";

import { EmailService } from "./email.service.interface";
import { ConsoleEmailService } from "./console-email.service";
import { createSmtpEmailService } from "./smtp-email.service.factory";

@Global()
@Module({
  providers: [
    ConsoleEmailService,
    {
      provide: EmailService,
      useFactory: (consoleEmailService: ConsoleEmailService) => {
        const config = loadConfig();

        if (config.EMAIL_PROVIDER === "smtp") {
          return createSmtpEmailService();
        }

        return consoleEmailService;
      },
      inject: [ConsoleEmailService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}