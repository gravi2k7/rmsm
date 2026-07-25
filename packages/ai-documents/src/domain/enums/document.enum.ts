export enum DocumentType {
  PDF = "pdf",
  DOCX = "docx",
  TEXT = "text",
  IMAGE = "image",
}

export const DOCUMENT_TYPES = Object.values(DocumentType) as readonly DocumentType[];
