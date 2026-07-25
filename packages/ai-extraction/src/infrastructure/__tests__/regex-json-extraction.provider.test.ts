import { describe, it, expect } from "vitest";
import { RegexJsonExtractionProvider } from "../regex-json-extraction.provider";
import { NoJsonFoundError } from "../../domain/errors/extraction-domain.errors";

describe("RegexJsonExtractionProvider", () => {
  const provider = new RegexJsonExtractionProvider();

  it("extracts a JSON object embedded in prose", async () => {
    const result = await provider.extractJson('Here is the data: {"name": "Ada", "age": 30} — hope that helps!');
    expect(result).toEqual({ name: "Ada", age: 30 });
  });

  it("extracts a JSON array embedded in prose", async () => {
    const result = await provider.extractJson("The list is: [1, 2, 3] as requested.");
    expect(result).toEqual([1, 2, 3]);
  });

  it("handles braces inside quoted string values without miscounting depth", async () => {
    const result = await provider.extractJson('prefix {"note": "contains { and } inside"} suffix');
    expect(result).toEqual({ note: "contains { and } inside" });
  });

  it("throws NoJsonFoundError when there is no JSON in the text", async () => {
    await expect(provider.extractJson("just plain text, nothing here")).rejects.toThrow(NoJsonFoundError);
  });
});
