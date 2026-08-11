import { loadConfig } from "@rmsm/config";

import {
  SmtpEmailCredentials,
  SmtpEmailService,
} from "./smtp-email.service";

export function createSmtpEmailService(): SmtpEmailService {
  const config = loadConfig();

  const {
    SMTP_HOST: host,
    SMTP_PORT: port,
    SMTP_USER: username,
    SMTP_PASSWORD: password,
    EMAIL_FROM: fromAddress,
  } = config;

  if (!host || !port || !username || !password || !fromAddress) {
    throw new Error(
      "SMTP email provider is enabled but SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM must all be configured.",
    );
  }

  const credentials: SmtpEmailCredentials = {
    host,
    port,
    username,
    password,
    fromAddress,
    secure: port === 465,
  };

  return new SmtpEmailService(credentials);
}