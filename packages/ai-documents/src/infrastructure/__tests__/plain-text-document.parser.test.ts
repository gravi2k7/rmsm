import { describe, it, expect } from "vitest";
import { PlainTextDocumentParser } from "../plain-text-document.parser";
import { DocumentType } from "../../domain/enums/document.enum";

describe("PlainTextDocumentParser", () => {
  it("decodes UTF-8 bytes into a single-page ParsedDocument", async () => {
    const parser = new PlainTextDocumentParser();
    const bytes = new TextEncoder().encode("hello world");

    const result = await parser.parse({ id: "s1", fileName: "a.txt", mimeType: "text/plain", type: DocumentType.TEXT, bytes });

    expect(result.fullText).toBe("hello world");
    expect(result.pages).toEqual([{ pageNumber: 1, text: "hello world" }]);
  });
});
