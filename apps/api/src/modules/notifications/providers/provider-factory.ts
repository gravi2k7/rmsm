import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { EmailProviderType, SmsProviderType, PushProviderType } from "@rmsm/database";
import { EmailProviderAdapter } from "../interfaces/providers/email-provider.interface";
import { SmsProviderAdapter } from "../interfaces/providers/sms-provider.interface";
import { PushProviderAdapter } from "../interfaces/providers/push-provider.interface";
import { CredentialEncryptionService } from "./shared/credential-encryption";

import { SmtpEmailProvider, SmtpCredentials } from "./email/smtp.provider";
import { SesEmailProvider, SesCredentials } from "./email/ses.provider";
import { SendGridEmailProvider, SendGridCredentials } from "./email/sendgrid.provider";
import { MailgunEmailProvider, MailgunCredentials } from "./email/mailgun.provider";
import { ResendEmailProvider, ResendCredentials } from "./email/resend.provider";

import { TwilioProvider, TwilioCredentials } from "./sms/twilio.provider";
import { MessageBirdProvider, MessageBirdCredentials } from "./sms/messagebird.provider";
import { VonageProvider, VonageCredentials } from "./sms/vonage.provider";
import { AwsSnsProvider, AwsSnsCredentials } from "./sms/aws-sns.provider";

import { FcmPushProvider, FcmCredentials } from "./push/fcm.provider";
import { ApnsPushProvider, ApnsCredentials } from "./push/apns.provider";

/**
 * Decrypts a provider row's stored credentials and constructs the
 * matching adapter instance — implements Phase 1's `IProviderFactory`
 * contract. The only component in this module that ever sees decrypted
 * credentials; every adapter it constructs is used immediately for one
 * send/verify call and then discarded (no caching — see the registries'
 * class comments for why that's a deliberate, named scope boundary, not
 * an oversight).
 */
@Injectable()
export class ProviderFactory {
  constructor(private readonly encryption: CredentialEncryptionService) {}

  createEmailAdapter(providerType: EmailProviderType, encryptedCredentials: string): EmailProviderAdapter {
    switch (providerType) {
      case "SMTP":
        return new SmtpEmailProvider(this.encryption.decrypt<SmtpCredentials>(encryptedCredentials));
      case "SES":
        return new SesEmailProvider(this.encryption.decrypt<SesCredentials>(encryptedCredentials));
      case "SENDGRID":
        return new SendGridEmailProvider(this.encryption.decrypt<SendGridCredentials>(encryptedCredentials));
      case "MAILGUN":
        return new MailgunEmailProvider(this.encryption.decrypt<MailgunCredentials>(encryptedCredentials));
      case "RESEND":
        return new ResendEmailProvider(this.encryption.decrypt<ResendCredentials>(encryptedCredentials));
      default:
        throw new ValidationError(`Unknown email provider type "${providerType}".`);
    }
  }

  createSmsAdapter(providerType: SmsProviderType, encryptedCredentials: string): SmsProviderAdapter {
    switch (providerType) {
      case "TWILIO":
        return new TwilioProvider(this.encryption.decrypt<TwilioCredentials>(encryptedCredentials));
      case "MESSAGEBIRD":
        return new MessageBirdProvider(this.encryption.decrypt<MessageBirdCredentials>(encryptedCredentials));
      case "VONAGE":
        return new VonageProvider(this.encryption.decrypt<VonageCredentials>(encryptedCredentials));
      case "AWS_SNS":
        return new AwsSnsProvider(this.encryption.decrypt<AwsSnsCredentials>(encryptedCredentials));
      default:
        throw new ValidationError(`Unknown SMS provider type "${providerType}".`);
    }
  }

  createPushAdapter(providerType: PushProviderType, encryptedCredentials: string): PushProviderAdapter {
    switch (providerType) {
      case "FCM":
        return new FcmPushProvider(this.encryption.decrypt<FcmCredentials>(encryptedCredentials));
      case "APNS":
        return new ApnsPushProvider(this.encryption.decrypt<ApnsCredentials>(encryptedCredentials));
      default:
        throw new ValidationError(`Unknown push provider type "${providerType}".`);
    }
  }
}
