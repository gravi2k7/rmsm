import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";

const EMAIL_PROVIDER_TYPE_VALUES = ["SMTP", "SES", "SENDGRID", "MAILGUN", "RESEND"] as const;

export class CreateEmailProviderDto {
  @ApiProperty({ enum: EMAIL_PROVIDER_TYPE_VALUES })
  @IsEnum(EMAIL_PROVIDER_TYPE_VALUES)
  type!: (typeof EMAIL_PROVIDER_TYPE_VALUES)[number];

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  fromAddress!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiProperty({ type: "object", description: "Provider-specific credential fields (e.g. SMTP host/port/username/password, or an API key) — encrypted before storage, never returned by any endpoint." })
  @IsObject()
  credentials!: Record<string, unknown>;
}
