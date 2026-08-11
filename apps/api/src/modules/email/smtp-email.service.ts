import { connect as tlsConnect, TLSSocket } from "tls";
import { Socket } from "net";
import { randomUUID } from "crypto";

import type {
  EmailMessage as ProviderEmailMessage,
  EmailSendResult,
} from "../notifications/interfaces/providers/email-provider.interface";
import { buildMimeMessage } from "../notifications/providers/shared/mime-builder";

export interface SmtpEmailCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  secure: boolean;
}

/**
 * Shared SMTP transport.
 *
 * Authentication and Notifications both use this transport. It contains
 * the SMTP protocol implementation; callers remain responsible for their
 * own application-level EmailService/provider contracts.
 */
export class SmtpEmailService {
  constructor(private readonly credentials: SmtpEmailCredentials) {}

  get enabled(): boolean {
    return Boolean(
      this.credentials.host &&
        this.credentials.username &&
        this.credentials.password &&
        this.credentials.fromAddress,
    );
  }

  async send(message: ProviderEmailMessage): Promise<EmailSendResult> {
  const socket = await this.connect();
  let activeSocket: Socket | TLSSocket = socket;

  try {
    await this.expectCode(activeSocket, 220);

    await this.command(activeSocket, `EHLO ${this.localHostname()}`);
    let ehloResponse = await this.readMultilineResponse(activeSocket);

    if (!this.credentials.secure && ehloResponse.includes("STARTTLS")) {
      await this.command(activeSocket, "STARTTLS");
      await this.expectCode(activeSocket, 220);

      activeSocket = await this.upgradeToTls(activeSocket as Socket);

      await this.command(activeSocket, `EHLO ${this.localHostname()}`);
      ehloResponse = await this.readMultilineResponse(activeSocket);

      return await this.authenticateAndSend(activeSocket, message);
    }

    return await this.authenticateAndSend(activeSocket, message);
  } finally {
    activeSocket.end();
  }
 }

  private async authenticateAndSend(
    socket: Socket | TLSSocket,
    message: ProviderEmailMessage,
  ): Promise<EmailSendResult> {
    await this.command(socket, "AUTH LOGIN");
    await this.expectCode(socket, 334);

    await this.command(
      socket,
      Buffer.from(this.credentials.username, "utf8").toString("base64"),
    );
    await this.expectCode(socket, 334);

    await this.command(
      socket,
      Buffer.from(this.credentials.password, "utf8").toString("base64"),
    );
    await this.expectCode(socket, 235);

    await this.command(
      socket,
      `MAIL FROM:<${this.credentials.fromAddress}>`,
    );
    await this.expectCode(socket, 250);

    const recipients = [
      ...message.to,
      ...(message.cc ?? []),
      ...(message.bcc ?? []),
    ];

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

    const queueIdMatch = finalResponse.match(/queued as ([^\s]+)/i);

    return {
      providerMessageId:
        queueIdMatch?.[1] ?? `smtp_${randomUUID()}`,
    };
  }

  private connect(): Promise<Socket | TLSSocket> {
    return new Promise((resolve, reject) => {
      const socket = this.credentials.secure
        ? tlsConnect({
            host: this.credentials.host,
            port: this.credentials.port,
          })
        : new Socket().connect(
            this.credentials.port,
            this.credentials.host,
          );

      socket.once("error", reject);

      socket.once(
        this.credentials.secure ? "secureConnect" : "connect",
        () => resolve(socket),
      );
    });
  }

  private upgradeToTls(socket: Socket): Promise<TLSSocket> {
    return new Promise((resolve, reject) => {
      const tlsSocket = tlsConnect({
        socket,
        host: this.credentials.host,
      });

      tlsSocket.once("error", reject);
      tlsSocket.once("secureConnect", () => resolve(tlsSocket));
    });
  }

  private command(
    socket: Socket | TLSSocket,
    line: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.write(`${line}\r\n`, (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  private readMultilineResponse(
    socket: Socket | TLSSocket,
  ): Promise<string> {
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

  private async expectCode(
    socket: Socket | TLSSocket,
    expectedCode: number,
  ): Promise<string> {
    const response = await this.readMultilineResponse(socket);
    const actualCode = Number(response.slice(0, 3));

    if (actualCode !== expectedCode) {
      throw new Error(
        `SMTP: expected ${expectedCode}, got response: ${response.trim()}`,
      );
    }

    return response;
  }

  private localHostname(): string {
    return "rmsm-notifications.local";
  }
}
