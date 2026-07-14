jest.mock("dns/promises", () => ({
  lookup: jest.fn(),
}));

import { lookup } from "dns/promises";
import { assertSafeWebhookUrl } from "../ssrf-guard";

const mockedLookup = lookup as jest.Mock;

describe("assertSafeWebhookUrl", () => {
  beforeEach(() => {
    mockedLookup.mockReset();
  });

  it("rejects a malformed URL", async () => {
    await expect(assertSafeWebhookUrl("not a url")).rejects.toThrow("not a valid URL");
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(assertSafeWebhookUrl("ftp://example.com/hook")).rejects.toThrow("must use http or https");
  });

  it("rejects localhost by name, without needing a DNS lookup", async () => {
    await expect(assertSafeWebhookUrl("http://localhost:3000/hook")).rejects.toThrow("disallowed host");
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it("rejects the loopback IP literal, without needing a DNS lookup", async () => {
    await expect(assertSafeWebhookUrl("http://127.0.0.1/hook")).rejects.toThrow("private or reserved");
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it("rejects the cloud metadata endpoint IP literal", async () => {
    await expect(assertSafeWebhookUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow("private or reserved");
  });

  it("rejects RFC1918 private ranges (10.x, 172.16-31.x, 192.168.x) as literals", async () => {
    await expect(assertSafeWebhookUrl("http://10.0.0.5/hook")).rejects.toThrow("private or reserved");
    await expect(assertSafeWebhookUrl("http://172.20.0.5/hook")).rejects.toThrow("private or reserved");
    await expect(assertSafeWebhookUrl("http://192.168.1.5/hook")).rejects.toThrow("private or reserved");
  });

  it("does not falsely flag a public-looking 172.x literal outside the private range", async () => {
    // 172.32.x.x is outside the 172.16.0.0/12 private block (16-31 only) —
    // verifies the boundary check isn't accidentally over-broad.
    await expect(assertSafeWebhookUrl("https://172.32.0.5/hook")).resolves.toBeUndefined();
  });

  it("rejects a hostname that resolves to a private IP (the DNS-rebinding-relevant case)", async () => {
    mockedLookup.mockResolvedValue({ address: "10.0.0.5", family: 4 });
    await expect(assertSafeWebhookUrl("https://looks-public.example.com/hook")).rejects.toThrow("resolves to a private or reserved IP");
    expect(mockedLookup).toHaveBeenCalledWith("looks-public.example.com");
  });

  it("accepts a hostname that resolves to a public IP", async () => {
    mockedLookup.mockResolvedValue({ address: "93.184.216.34", family: 4 });
    await expect(assertSafeWebhookUrl("https://example.com/webhooks/rmsm")).resolves.toBeUndefined();
  });

  it("rejects a hostname that fails to resolve at all", async () => {
    mockedLookup.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertSafeWebhookUrl("https://does-not-exist.invalid/hook")).rejects.toThrow("could not be resolved");
  });
});
