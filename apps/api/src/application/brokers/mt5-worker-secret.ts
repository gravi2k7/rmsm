import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

export function generateMt5WorkerSecret(): string {
  return randomBytes(48).toString("base64url");
}

export function hashMt5WorkerSecret(
  secret: string,
): string {
  return createHash("sha256")
    .update(secret, "utf8")
    .digest("hex");
}

export function verifyMt5WorkerSecret(
  secret: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(
    hashMt5WorkerSecret(secret),
    "utf8",
  );
  const expected = Buffer.from(
    expectedHash,
    "utf8",
  );

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
