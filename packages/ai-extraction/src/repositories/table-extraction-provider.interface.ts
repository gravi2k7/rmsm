import type { TableExtractionResult } from "../domain/entities/table-extraction-result.entity";

export interface TableExtractionProvider {
  extractTable(text: string): Promise<TableExtractionResult>;
}
