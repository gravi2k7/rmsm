import {
  describe,
  expect,
  it,
} from "@jest/globals";

import {
  generateMt5WorkerSecret,
  hashMt5WorkerSecret,
  verifyMt5WorkerSecret,
} from "./mt5-worker-secret";

describe("Mt5WorkerSecret", () => {
  it("generates and verifies a high-entropy secret", () => {
    const secret = generateMt5WorkerSecret();
    const hash = hashMt5WorkerSecret(secret);

    expect(secret.length).toBeGreaterThan(40);
    expect(hash).toHaveLength(64);
    expect(
      verifyMt5WorkerSecret(secret, hash),
    ).toBe(true);
    expect(
      verifyMt5WorkerSecret(
        `${secret}x`,
        hash,
      ),
    ).toBe(false);
  });
});
