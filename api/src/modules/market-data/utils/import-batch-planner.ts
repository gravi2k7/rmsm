/** One [start, end) window within a larger requested date range. */
export interface ImportBatch {
  from: Date;
  to: Date;
}

/** FIP-001 Domain 3 "Batch processing" / "Parallel imports" prep — splits an arbitrarily large [from, to) range into fixed-size windows so HistoricalImportService can fetch/validate/persist one manageable chunk at a time (bounding memory and giving ImportBatchExecutorService a natural progress-checkpoint boundary for resume). A uniform day-count chunk, not interval-aware sizing — a defensible, documented simplification: a real per-interval "how many candles fit in one provider call" tuning is a legitimate follow-up, not attempted here since the providers' own rate-limit policies (ProviderOrchestrationService) already bound call frequency independently of batch size. */
export function planImportBatches(from: Date, to: Date, batchSizeDays = 30): ImportBatch[] {
  if (from >= to) return [];
  const batches: ImportBatch[] = [];
  const batchMs = batchSizeDays * 24 * 60 * 60 * 1000;
  let cursor = from;
  while (cursor < to) {
    const batchEnd = new Date(Math.min(cursor.getTime() + batchMs, to.getTime()));
    batches.push({ from: cursor, to: batchEnd });
    cursor = batchEnd;
  }
  return batches;
}
