import { describe, it, expect } from "vitest";
import { MarkdownTableExtractionProvider } from "../markdown-table-extraction.provider";
import { NoTableFoundError } from "../../domain/errors/extraction-domain.errors";

describe("MarkdownTableExtractionProvider", () => {
  const provider = new MarkdownTableExtractionProvider();

  it("parses a GitHub-flavored markdown table's headers and rows", async () => {
    const text = [
      "Some intro text.",
      "| Name | Age |",
      "|------|-----|",
      "| Ada  | 30  |",
      "| Grace | 40 |",
      "",
      "Trailing text.",
    ].join("\n");

    const result = await provider.extractTable(text);

    expect(result.headers).toEqual(["Name", "Age"]);
    expect(result.rows).toEqual([
      { Name: "Ada", Age: "30" },
      { Name: "Grace", Age: "40" },
    ]);
  });

  it("throws NoTableFoundError when there is no table in the text", async () => {
    await expect(provider.extractTable("just some plain prose, no pipes here")).rejects.toThrow(NoTableFoundError);
  });
});
