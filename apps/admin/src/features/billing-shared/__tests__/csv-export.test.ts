import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exportToCsv } from "../csv-export";

describe("exportToCsv", () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue("blob:mock");
    revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing for an empty row set", () => {
    exportToCsv("empty.csv", []);
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });

  it("builds a CSV blob with headers from the first row and triggers a download", () => {
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    exportToCsv("payments.csv", [{ organization: "Acme", amountCents: 1000 }]);

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock");
  });

  it("escapes double quotes in values without throwing", () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = vi.fn();
      return el;
    });

    expect(() => exportToCsv("quoted.csv", [{ note: 'He said "hi"' }])).not.toThrow();
  });
});
