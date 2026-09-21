import { describe, expect, it } from "vitest";
import { CandleInterval } from "@rmsm/database";
import { GapDetectionService } from "../gap-detection.service";

describe("GapDetectionService", () => {
  const service = new GapDetectionService();

  const d = (minute: number) =>
    new Date(`2026-09-18T10:${String(minute).padStart(2, "0")}:00.000Z`);

  it("returns no gaps for continuous candles", () => {
    const result = service.detectGaps(
      [{ eventTime: d(0) }, { eventTime: d(1) }, { eventTime: d(2) }],
      CandleInterval.ONE_MINUTE,
      d(0),
      d(2),
    );

    expect(result).toEqual([]);
  });

  it("detects one contiguous gap", () => {
    const result = service.detectGaps(
      [{ eventTime: d(0) }, { eventTime: d(1) }, { eventTime: d(5) }],
      CandleInterval.ONE_MINUTE,
      d(0),
      d(5),
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.gapStart).toEqual(d(2));
    expect(result[0]!.gapEnd).toEqual(d(4));
  });

  it("does not create duplicate gaps for duplicate timestamps", () => {
    const result = service.detectGaps(
      [
        { eventTime: d(0) },
        { eventTime: d(1) },
        { eventTime: d(1) },
        { eventTime: d(2) },
      ],
      CandleInterval.ONE_MINUTE,
      d(0),
      d(2),
    );

    expect(result).toEqual([]);
  });

  it("detects separate gaps separately", () => {
    const result = service.detectGaps(
      [
        { eventTime: d(0) },
        { eventTime: d(2) },
        { eventTime: d(4) },
      ],
      CandleInterval.ONE_MINUTE,
      d(0),
      d(4),
    );

    expect(result).toHaveLength(2);
    expect(result[0]!.gapStart).toEqual(d(1));
    expect(result[0]!.gapEnd).toEqual(d(1));
    expect(result[1]!.gapStart).toEqual(d(3));
    expect(result[1]!.gapEnd).toEqual(d(3));
  });
});
