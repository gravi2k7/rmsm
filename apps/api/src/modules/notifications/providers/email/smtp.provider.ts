import { connect as tlsConnect, TLSSocket } from "tls";
import { Socket } from "net";
import { randomUUID } from "crypto";
import type { EmailProviderType } from "@rmsm/database";
import {
  EmailProviderAdapter,
  EmailMessage,
  EmailSendResult,
} from "../../interfaces/providers/email-provider.interface";
import { buildMimeMessage } from "../shared/mime-builder";

export interface SmtpCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  /** STARTTLS (typical for port 587) vs. implicit TLS from connect (typical for port 465). */
  secure: boolean;
}

/**
 * A real SMTP client implemented directly against RFC 5321 using Node's
 * built-in `net`/`tls` modules — no `nodemailer` or any other SMTP
 * library, consistent with this project's "no vendor/protocol SDK
 * coupling" rule applied to every provider integration since Module 002.
 * Supports: EHLO, STARTTLS upgrade, AUTH LOGIN, MAIL FROM/RCPT TO, DATA
 * with dot-stuffing, and multi-line response parsing. Does not implement
 * connection pooling or pipelining — one connection per send, adequate
 * for the queue-driven, one-message-at-a-time dispatch this module's
 * QueueService (Phase 2c) will drive it with.
 *
 * SMTP has no webhook/callback concept of its own — `verifyWebhookSignature`/
 * `parseWebhookEvent` are not meaningful for this provider and are not
 * expected to be called; bounce handling for raw SMTP requires a separate
 * mechanism (e.g. a monitored catch-all mailbox), out of scope here and
 * flagged as such in the Provider Integration Guide.
 */
export class SmtpEmailProvider extends EmailProviderAdapter {
  readonly type: EmailProviderType = "SMTP";

  constructor(private readonly credentials: SmtpCredentials) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.credentials.host && this.credentials.username && this.credentials.password);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const socket = await this.connect();
    try {
      await this.expectCode(socket, 220); // server greeting

      await this.command(socket, `EHLO ${this.localHostname()}`);
      let ehloResponse = await this.readMultilineResponse(socket);

      if (!this.credentials.secure && ehloResponse.includes("STARTTLS")) {
        await this.command(socket, "STARTTLS");
        await this.expectCode(socket, 220);
        const upgraded = await this.upgradeToTls(socket as Socket);
        await this.command(upgraded, `EHLO ${this.localHostname()}`);
        ehloResponse = await this.readMultilineResponse(upgraded);
        return this.authenticateAndSend(upgraded, message);
      }

      return this.authenticateAndSend(socket, message);
    } finally {
      socket.end();
    }
  }

  private async authenticateAndSend(socket: Socket | TLSSocket, message: EmailMessage): Promise<EmailSendResult> {
    await this.command(socket, "AUTH LOGIN");
    await this.expectCode(socket, 334);
    await this.command(socket, Buffer.from(this.credentials.username, "utf8").toString("base64"));
    await this.expectCode(socket, 334);
    await this.command(socket, Buffer.from(this.credentials.password, "utf8").toString("base64"));
    await this.expectCode(socket, 235); // authenticated

    await this.command(socket, `MAIL FROM:<${this.credentials.fromAddress}>`);
    await this.expectCode(socket, 250);

    const recipients = [...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])];
    for (const recipient of recipients) {
      await this.command(socket, `RCPT TO:<${recipient}>`);
      await this.expectCode(socket, 250);
    }

    await this.command(socket, "DATA");
    await this.expectCode(socket, 354);

    const raw = buildMimeMessage(this.credentials.fromAddress, message);
    const dotStuffed = raw.replace(/^\./gm, "..");
    await this.command(socket, `${dotStuffed}\r\n.`);
    const finalResponse = await this.expectCode(socket, 250);

    await this.command(socket, "QUIT");

    // A well-behaved SMTP server's final 250 response after DATA often
    // includes a queue id we can use as a correlation id; if not present,
    // generate one locally so DeliveryService always has something to key
    // NotificationDelivery.providerMessageId on.
    const queueIdMatch = finalResponse.match(/queued as ([^\s]+)/i);
    return { providerMessageId: queueIdMatch?.[1] ?? `smtp_${randomUUID()}` };
  }

  private connect(): Promise<Socket | TLSSocket> {
    return new Promise((resolve, reject) => {
      const socket = this.credentials.secure
        ? tlsConnect({ host: this.credentials.host, port: this.credentials.port })
        : new Socket().connect(this.credentials.port, this.credentials.host);
      socket.once("error", reject);
      socket.once(this.credentials.secure ? "secureConnect" : "connect", () => resolve(socket));
    });
  }

  private upgradeToTls(socket: Socket): Promise<TLSSocket> {
    return new Promise((resolve, reject) => {
      const tlsSocket = tlsConnect({ socket, host: this.credentials.host });
      tlsSocket.once("error", reject);
      tlsSocket.once("secureConnect", () => resolve(tlsSocket));
    });
  }

  private command(socket: Socket | TLSSocket, line: string): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.write(`${line}\r\n`, (err) => (err ? reject(err) : resolve()));
    });
  }

  /** SMTP multi-line responses use "250-text" for continuation lines and "250 text" (space, not dash) for the final line. */
  private readMultilineResponse(socket: Socket | TLSSocket): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = "";
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\r\n").filter(Boolean);
        const lastLine = lines[lines.length - 1];
        if (lastLine && /^\d{3} /.test(lastLine)) {
          socket.removeListener("data", onData);
          resolve(buffer);
        }
      };
      socket.on("data", onData);
      socket.once("error", reject);
    });
  }

  private async expectCode(socket: Socket | TLSSocket, expectedCode: number): Promise<string> {
    const response = await this.readMultilineResponse(socket);
    const actualCode = Number(response.slice(0, 3));
    if (actualCode !== expectedCode) {
      throw new Error(`SMTP: expected ${expectedCode}, got response: ${response.trim()}`);
    }
    return response;
  }

  private localHostname(): string {
    return "rmsm-notifications.local";
  }

  async verifyWebhookSignature(): Promise<boolean> {
    return false; // SMTP has no webhook concept — see class comment.
  }

  parseWebhookEvent(): never {
    throw new Error("SmtpEmailProvider does not support inbound webhooks — see class comment.");
  }
}
