import { describe, it, expect } from "vitest";
import {
  UnsupportedDocumentTypeError,
  DocumentParseError,
  EmptyDocumentError,
  InvalidChunkOptionsError,
} from "../errors/document-domain.errors";

describe("document domain errors", () => {
  it("UnsupportedDocumentTypeError carries a stable code", () => {
    expect(new UnsupportedDocumentTypeError("pdf").code).toBe("UNSUPPORTED_DOCUMENT_TYPE");
  });
  it("DocumentParseError carries a stable code", () => {
    expect(new DocumentParseError("s1", "bad bytes").code).toBe("DOCUMENT_PARSE_FAILED");
  });
  it("EmptyDocumentError carries a stable code", () => {
    expect(new EmptyDocumentError("s1").code).toBe("EMPTY_DOCUMENT");
  });
  it("InvalidChunkOptionsError carries a stable code", () => {
    expect(new InvalidChunkOptionsError("bad").code).toBe("INVALID_CHUNK_OPTIONS");
  });
});
