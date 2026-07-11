import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service.interface";
import { ConsoleEmailService } from "./console-email.service";

/**
 * Module 002 ships the console provider only. An SmtpEmailService
 * implementing the same EmailService interface is the natural next
 * addition (EMAIL_PROVIDER=smtp) — no callers change when it's added.
 */
@Global()
@Module({
  providers: [{ provide: EmailService, useClass: ConsoleEmailService }],
  exports: [EmailService],
})
export class EmailModule {}
