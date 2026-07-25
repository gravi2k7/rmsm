import type { TableExtractionProvider } from "../repositories/table-extraction-provider.interface";
import type { TableExtractionResult } from "../domain/entities/table-extraction-result.entity";
import { NoTableFoundError } from "../domain/errors/extraction-domain.errors";

function splitRow(line: string): readonly string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(line.trim());
}

/**
 * The real, default `TableExtractionProvider` — parses a GitHub-flavored
 * markdown pipe table (`| a | b |` header, `|---|---|` separator, data
 * rows). No external dependency; a real vision/OCR-table extractor for
 * scanned documents is a future adapter of this interface.
 */
export class MarkdownTableExtractionProvider implements TableExtractionProvider {
  async extractTable(text: string): Promise<TableExtractionResult> {
    const lines = text.split("\n").map((line) => line.trim());

    for (let i = 0; i < lines.length - 1; i++) {
      const headerLine = lines[i]!;
      const separatorLine = lines[i + 1]!;
      if (!headerLine.includes("|") || !isSeparatorRow(separatorLine)) continue;

      const headers = splitRow(headerLine);
      const rows: Record<string, string>[] = [];

      for (let j = i + 2; j < lines.length; j++) {
        const rowLine = lines[j]!;
        if (!rowLine.includes("|")) break;
        const cells = splitRow(rowLine);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = cells[index] ?? "";
        });
        rows.push(row);
      }

      return { headers, rows };
    }

    throw new NoTableFoundError();
  }
}
