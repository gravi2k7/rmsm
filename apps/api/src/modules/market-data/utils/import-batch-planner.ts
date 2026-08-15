/** One [start, end) window within a larger requested date range. */
export interface ImportBatch {
  from: Date;
  to: Date;
}

/**
 * Splits an arbitrarily large [from, to) range into fixed-size windows.
 *
 * A uniform day-count chunk is intentionally used rather than
 * interval-aware sizing. Provider rate-limit policies remain
 * responsible for bounding call frequency independently of batch size.
 */
export function planImportBatches(
  from: Date,
  to: Date,
  batchSizeDays = 30,
): ImportBatch[] {
  if (from >= to) return [];

  if (!Number.isFinite(batchSizeDays) || batchSizeDays <= 0) {
    throw new Error("batchSizeDays must be greater than zero.");
  }

  const batches: ImportBatch[] = [];
  const batchMs = batchSizeDays * 24 * 60 * 60 * 1000;

  let cursor = from;

  while (cursor < to) {
    const batchEnd = new Date(
      Math.min(cursor.getTime() + batchMs, to.getTime()),
    );

    batches.push({
      from: cursor,
      to: batchEnd,
    });

    cursor = batchEnd;
  }

  return batches;
}
