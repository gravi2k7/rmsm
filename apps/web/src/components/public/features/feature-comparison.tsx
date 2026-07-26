import { ComparisonTable, type ComparisonColumn, type ComparisonRow } from "@/components/public/comparison";

interface FeatureComparisonProps {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  caption?: string;
  className?: string;
}

/** Feature-comparison table — a thin, discoverable re-export of the shared
 * `ComparisonTable` (see `components/public/comparison/`), not a second
 * implementation. Kept as its own named export because Section 2 names
 * "FeatureComparison" explicitly. */
export function FeatureComparison(props: FeatureComparisonProps) {
  return <ComparisonTable {...props} />;
}
