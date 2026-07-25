import { describe, it, expect, beforeEach } from "vitest";
import { DocumentParserRegistry } from "../document-parser.registry";
import { PlainTextDocumentParser } from "../plain-text-document.parser";
import { UnsupportedDocumentTypeError } from "../../domain/errors/document-domain.errors";
import { DocumentType } from "../../domain/enums/document.enum";

describe("DocumentParserRegistry", () => {
  let registry: DocumentParserRegistry;

  beforeEach(() => {
    registry = new DocumentParserRegistry();
    registry.register(new PlainTextDocumentParser());
  });

  it("dispatches to the registered parser for a source's type", async () => {
    const result = await registry.parse({
      id: "s1",
      fileName: "a.txt",
      mimeType: "text/plain",
      type: DocumentType.TEXT,
      bytes: new TextEncoder().encode("hi"),
    });
    expect(result.fullText).toBe("hi");
  });

  it("throws UnsupportedDocumentTypeError for an unregistered type", async () => {
    await expect(
      registry.parse({ id: "s1", fileName: "a.pdf", mimeType: "application/pdf", type: DocumentType.PDF, bytes: new Uint8Array() }),
    ).rejects.toThrow(UnsupportedDocumentTypeError);
  });
});
