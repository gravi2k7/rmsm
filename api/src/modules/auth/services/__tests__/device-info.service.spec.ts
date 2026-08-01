import { DeviceInfoService } from "../device-info.service";

describe("DeviceInfoService", () => {
  const service = new DeviceInfoService();

  it("returns Unknown/Unknown/unknown for a missing user agent", () => {
    expect(service.parse(null)).toEqual({ browser: "Unknown", os: "Unknown", deviceType: "unknown" });
    expect(service.parse(undefined)).toEqual({ browser: "Unknown", os: "Unknown", deviceType: "unknown" });
    expect(service.parse("")).toEqual({ browser: "Unknown", os: "Unknown", deviceType: "unknown" });
  });

  it("identifies Chrome on Windows desktop", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(service.parse(ua)).toEqual({ browser: "Chrome", os: "Windows", deviceType: "desktop" });
  });

  it("identifies Safari on macOS desktop", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(service.parse(ua)).toEqual({ browser: "Safari", os: "macOS", deviceType: "desktop" });
  });

  it("identifies Safari on iOS mobile", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const result = service.parse(ua);
    expect(result.os).toBe("iOS");
    expect(result.deviceType).toBe("mobile");
  });

  it("identifies Firefox on Linux desktop", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0";
    expect(service.parse(ua)).toEqual({ browser: "Firefox", os: "Linux", deviceType: "desktop" });
  });

  it("identifies Edge on Windows", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(service.parse(ua).browser).toBe("Edge");
  });

  it("identifies Android mobile", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    const result = service.parse(ua);
    expect(result.os).toBe("Android");
    expect(result.deviceType).toBe("mobile");
  });

  it("identifies an iPad as tablet", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(service.parse(ua).deviceType).toBe("tablet");
  });

  it("falls back to Unknown browser/os for an unrecognized user agent string", () => {
    const result = service.parse("SomeCustomBot/1.0");
    expect(result.browser).toBe("Unknown");
    expect(result.os).toBe("Unknown");
  });
});
