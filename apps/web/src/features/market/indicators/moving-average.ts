import {
  calculateEMA as calculateTechnicalEMA,
  calculateSMA as calculateTechnicalSMA,
  toIndicatorPoints,
} from "./technical-indicators";

function validateMovingAveragePeriod(period: number): void {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error(
      "Moving-average period must be a positive integer.",
    );
  }
}

export function calculateSMA(
  values: number[],
  period: number,
): Array<number | null> {
  validateMovingAveragePeriod(period);
  return calculateTechnicalSMA(values, period);
}

export function calculateEMA(
  values: number[],
  period: number,
): Array<number | null> {
  validateMovingAveragePeriod(period);
  return calculateTechnicalEMA(values, period);
}

export { toIndicatorPoints };
