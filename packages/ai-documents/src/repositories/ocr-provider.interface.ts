/** Abstraction only — the spec explicitly calls for an "OCR
 * abstraction" and "future OCR provider interfaces", not a concrete
 * OCR engine. No implementation ships in this package. */
export interface OcrProvider {
  recognize(imageBytes: Uint8Array): Promise<string>;
}
