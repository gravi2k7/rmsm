import { randomBytes } from "crypto";
import type { EmailMessage } from "../../interfaces/providers/email-provider.interface";

/**
 * Builds a raw RFC 5322 / MIME multipart email message — used by
 * providers whose API takes a raw message body (SMTP's DATA command,
 * SES's SendRawEmail action) rather than structured JSON fields (SendGrid/
 * Mailgun/Resend all take subject/html/text as separate API parameters
 * and build the MIME themselves, so they don't need this).
 */
export function buildMimeMessage(from: string, message: EmailMessage): string {
  const boundaryMixed = `mixed_${randomBytes(12).toString("hex")}`;
  const boundaryAlt = `alt_${randomBytes(12).toString("hex")}`;

  const headers = [
    `From: ${from}`,
    `To: ${message.to.join(", ")}`,
    ...(message.cc?.length ? [`Cc: ${message.cc.join(", ")}`] : []),
    `Subject: ${encodeMimeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    message.attachments?.length
      ? `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`
      : `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
  ];

  const alternativeParts: string[] = [];
  if (message.text) {
    alternativeParts.push(
      `--${boundaryAlt}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      quotedPrintableEncode(message.text),
    );
  }
  if (message.html) {
    alternativeParts.push(
      `--${boundaryAlt}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      quotedPrintableEncode(message.html),
    );
  }
  alternativeParts.push(`--${boundaryAlt}--`);
  const alternativeBlock = alternativeParts.join("\r\n");

  if (!message.attachments?.length) {
    return [...headers, "", alternativeBlock].join("\r\n");
  }

  const bodyParts: string[] = [
    `--${boundaryMixed}`,
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    "",
    alternativeBlock,
  ];
  for (const attachment of message.attachments) {
    const base64Content =
      typeof attachment.content === "string" ? attachment.content : attachment.content.toString("base64");
    bodyParts.push(
      `--${boundaryMixed}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.fileName}"`,
      `Content-Disposition: attachment; filename="${attachment.fileName}"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Content.replace(/(.{76})/g, "$1\r\n"),
    );
  }
  bodyParts.push(`--${boundaryMixed}--`);

  return [...headers, "", bodyParts.join("\r\n")].join("\r\n");
}

function encodeMimeHeader(value: string): string {
  // Encoded-word form (RFC 2047) for non-ASCII subjects — a plain ASCII
  // subject passes through this unchanged in practice, but we don't
  // special-case that; base64-encoding a pure-ASCII string is still valid
  // MIME, just slightly less human-readable in a raw-header dump.
  // eslint-disable-next-line no-control-regex -- matching the ASCII range is the actual intent, not an accidental control character
  return /^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function quotedPrintableEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("latin1")
    // eslint-disable-next-line no-control-regex -- quoted-printable encoding must match and escape actual control characters (RFC 2045) — this is the algorithm's correct behavior, not an accident
    .replace(/[=\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, (ch) => `=${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`)
    .replace(/(.{72})/g, "$1=\r\n");
}
