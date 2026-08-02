import { PageHeader } from "@/components/shared/page-header";
import { ImportWizard } from "@/features/market-data-historical-import/components/import-wizard";

export default function HistoricalImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Historical Import"
        description="Schedule a historical candle backfill for an instrument from a configured provider."
      />
      <ImportWizard />
    </div>
  );
}
