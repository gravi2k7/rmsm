import type { DrawingPoint } from "../types";

export const FIB_RETRACEMENT_RATIOS = [
  0,
  0.236,
  0.382,
  0.5,
  0.618,
  0.786,
  1,
] as const;

export const FIB_EXTENSION_RATIOS = [
  0,
  0.618,
  1,
  1.272,
  1.618,
  2,
  2.618,
] as const;

export const FIB_PROJECTION_RATIOS = [
  0,
  0.618,
  1,
  1.272,
  1.618,
  2,
  2.618,
] as const;

export const FIB_TIME_RATIOS = [
  0,
  0.618,
  1,
  1.618,
  2.618,
  4.236,
  6.854,
] as const;

export interface FibonacciLevel {
  ratio: number;
  price?: number;
  time?: number;
  label: string;
}

function labelForRatio(ratio: number): string {
  const percentage = ratio * 100;

  return `${Number.isInteger(percentage)
    ? percentage.toString()
    : percentage.toFixed(1)}%`;
}

export function fibonacciRetracementLevels(
  first: DrawingPoint,
  second: DrawingPoint,
): FibonacciLevel[] {
  const range = second.price - first.price;

  return FIB_RETRACEMENT_RATIOS.map((ratio) => ({
    ratio,
    price: second.price - range * ratio,
    label: labelForRatio(ratio),
  }));
}

export function fibonacciExtensionLevels(
  first: DrawingPoint,
  second: DrawingPoint,
  third: DrawingPoint,
): FibonacciLevel[] {
  const range = second.price - first.price;

  return FIB_EXTENSION_RATIOS.map((ratio) => ({
    ratio,
    price: third.price + range * ratio,
    label: labelForRatio(ratio),
  }));
}

export function fibonacciProjectionLevels(
  first: DrawingPoint,
  second: DrawingPoint,
  third: DrawingPoint,
): FibonacciLevel[] {
  const range = second.price - first.price;

  return FIB_PROJECTION_RATIOS.map((ratio) => ({
    ratio,
    price: third.price + range * ratio,
    label: labelForRatio(ratio),
  }));
}

export function fibonacciTimeLevels(
  first: DrawingPoint,
  second: DrawingPoint,
): FibonacciLevel[] {
  const range = second.time - first.time;

  return FIB_TIME_RATIOS.map((ratio) => ({
    ratio,
    time: first.time + range * ratio,
    label: labelForRatio(ratio),
  }));
}
