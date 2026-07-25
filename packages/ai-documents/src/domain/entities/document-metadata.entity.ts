export interface DocumentMetadata {
  readonly sourceId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly pageCount: number;
  readonly characterCount: number;
  readonly extractedAt: Date;
}
