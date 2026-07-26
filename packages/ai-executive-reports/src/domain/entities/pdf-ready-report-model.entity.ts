export interface ReportSection {
  readonly heading: string;
  readonly body: string;
}

/** A structured, presentation-agnostic shape any real PDF-rendering
 * infrastructure (implemented entirely outside this package — no PDF
 * library dependency here) can render directly, without needing to
 * understand any AI-6xx package's own domain types. */
export interface PdfReadyReportModel {
  readonly title: string;
  readonly sections: readonly ReportSection[];
  readonly generatedAt: Date;
}
