import type { DocumentType } from "../enums/document.enum";

/** The raw input handed to a `DocumentParser` — bytes plus a declared
 * type, never a file path (keeps this package I/O-source-agnostic:
 * caller reads bytes from disk/S3/an upload buffer/wherever). */
export interface DocumentSource {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly type: DocumentType;
  readonly bytes: Uint8Array;
}
