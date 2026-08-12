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
 * Authentication and Notifications both use this transport.
 * The implementation intentionally uses the SMTP protocol directly
 * so the application does not depend on a provider SDK.
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
    let socket = await this.connect();

    try {
      await this.expectCode(socket, 220);

      let ehloResponse = await this.commandAndRead(
        socket,
        `EHLO ${this.localHostname()}`,
      );

      if (!this.credentials.secure && ehloResponse.includes("STARTTLS")) {
        await this.commandAndExpect(socket, "STARTTLS", 220);

        socket = await this.upgradeToTls(socket);

        ehloResponse = await this.commandAndRead(
          socket,
          `EHLO ${this.localHostname()}`,
        );
      }

      return await this.authenticateAndSend(socket, message);
    } finally {
      socket.end();
    }
  }

  private async authenticateAndSend(
    socket: Socket | TLSSocket,
    message: ProviderEmailMessage,
  ): Promise<EmailSendResult> {
    await this.commandAndExpect(socket, "AUTH LOGIN", 334);

    await this.commandAndExpect(
      socket,
      Buffer.from(this.credentials.username, "utf8").toString("base64"),
      334,
    );

    await this.commandAndExpect(
      socket,
      Buffer.from(this.credentials.password, "utf8").toString("base64"),
      235,
    );

    await this.commandAndExpect(
      socket,
      `MAIL FROM:<${this.credentials.fromAddress}>`,
      250,
    );

    const recipients = [
      ...message.to,
      ...(message.cc ?? []),
      ...(message.bcc ?? []),
    ];

    if (recipients.length === 0) {
      throw new Error("SMTP: message has no recipients.");
    }

    for (const recipient of recipients) {
      await this.commandAndExpect(
        socket,
        `RCPT TO:<${recipient}>`,
        250,
      );
    }

    await this.commandAndExpect(socket, "DATA", 354);

    const raw = buildMimeMessage(
      this.credentials.fromAddress,
      message,
    );

    const dotStuffed = raw.replace(/^\./gm, "..");

    const finalResponse = await this.commandAndRead(
      socket,
      `${dotStuffed}\r\n.`,
    );

    const finalCode = Number(finalResponse.slice(0, 3));

    if (finalCode !== 250) {
      throw new Error(
        `SMTP: message rejected: ${finalResponse.trim()}`,
      );
    }

    await this.commandAndRead(socket, "QUIT");

    const queueIdMatch = finalResponse.match(
      /queued as ([^\s]+)/i,
    );

    return {
      providerMessageId:
        queueIdMatch?.[1] ?? `smtp_${randomUUID()}`,
    };
  }

  private commandAndExpect(
    socket: Socket | TLSSocket,
    command: string,
    expectedCode: number,
  ): Promise<string> {
    return this.commandAndRead(socket, command).then((response) => {
      const actualCode = Number(response.slice(0, 3));

      if (actualCode !== expectedCode) {
        throw new Error(
          `SMTP: expected ${expectedCode}, got response: ${response.trim()}`,
        );
      }

      return response;
    });
  }

  /**
   * Writes a command and waits for the complete SMTP response.
   *
   * The response listener is attached BEFORE writing the command,
   * preventing fast SMTP servers from responding before we start
   * listening for the response.
   */
  private commandAndRead(
    socket: Socket | TLSSocket,
    line: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = "";

      const cleanup = () => {
        socket.removeListener("data", onData);
        socket.removeListener("error", onError);
        socket.removeListener("close", onClose);
      };

      const finish = (response: string) => {
        cleanup();
        resolve(response);
      };

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");

        const lines = buffer.split("\r\n");

        for (const responseLine of lines) {
          if (/^\d{3} /.test(responseLine)) {
            finish(buffer);
            return;
          }
        }
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onClose = () => {
        cleanup();

        reject(
          new Error(
            `SMTP: connection closed before response to command "${line}"`,
          ),
        );
      };

      socket.on("data", onData);
      socket.once("error", onError);
      socket.once("close", onClose);

      socket.write(`${line}\r\n`, (error) => {
        if (error) {
          cleanup();
          reject(error);
        }
      });
    });
  }

  private expectCode(
    socket: Socket | TLSSocket,
    expectedCode: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = "";

      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");

        const lines = buffer.split("\r\n");

        for (const responseLine of lines) {
          if (/^\d{3} /.test(responseLine)) {
            cleanup();

            const actualCode = Number(responseLine.slice(0, 3));

            if (actualCode !== expectedCode) {
              reject(
                new Error(
                  `SMTP: expected ${expectedCode}, got response: ${buffer.trim()}`,
                ),
              );
              return;
            }

            resolve(buffer);
            return;
          }
        }
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        socket.removeListener("data", onData);
        socket.removeListener("error", onError);
      };

      socket.on("data", onData);
      socket.once("error", onError);
    });
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

      const onError = (error: Error) => {
        socket.removeListener("error", onError);
        reject(error);
      };

      socket.once("error", onError);

      socket.once(
        this.credentials.secure ? "secureConnect" : "connect",
        () => {
          socket.removeListener("error", onError);
          resolve(socket);
        },
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

      tlsSocket.once("secureConnect", () => {
        resolve(tlsSocket);
      });
    });
  }

  private localHostname(): string {
    return "rmsm-notifications.local";
  }
}