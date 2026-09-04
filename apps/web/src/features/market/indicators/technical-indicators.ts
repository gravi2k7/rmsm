export interface IndicatorCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface BollingerPoint {
  time: number;
  middle: number;
  upper: number;
  lower: number;
}

export interface MacdPoint {
  time: number;
  macd: number;
  signal: number | null;
  histogram: number | null;
}

export interface StochasticPoint {
  time: number;
  k: number;
  d: number | null;
}

export interface AdxPoint {
  time: number;
  adx: number | null;
  plusDi: number | null;
  minusDi: number | null;
}

function validatePeriod(period: number): void {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("Indicator period must be a positive integer.");
  }
}

function smaValues(values: number[], period: number): Array<number | null> {
  validatePeriod(period);

  const result: Array<number | null> = Array(values.length).fill(null);

  if (values.length < period) {
    return result;
  }

  let sum = 0;

  for (let i = 0; i < values.length; i += 1) {
    sum += values[i]!;

    if (i >= period) {
      sum -= values[i - period]!;
    }

    if (i >= period - 1) {
      result[i] = sum / period;
    }
  }

  return result;
}

export function calculateSMA(
  values: number[],
  period: number,
): Array<number | null> {
  return smaValues(values, period);
}

export function calculateEMA(
  values: number[],
  period: number,
): Array<number | null> {
  validatePeriod(period);

  const result: Array<number | null> = Array(values.length).fill(null);

  if (values.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);

  let sum = 0;

  for (let i = 0; i < period; i += 1) {
    sum += values[i]!;
  }

  let previous = sum / period;
  result[period - 1] = previous;

  for (let i = period; i < values.length; i += 1) {
    previous =
      (values[i]! - previous) * multiplier + previous;

    result[i] = previous;
  }

  return result;
}

export function calculateWMA(
  values: number[],
  period: number,
): Array<number | null> {
  validatePeriod(period);

  const result: Array<number | null> = Array(values.length).fill(null);
  const denominator = (period * (period + 1)) / 2;

  for (let i = period - 1; i < values.length; i += 1) {
    let weightedSum = 0;

    for (let j = 0; j < period; j += 1) {
      weightedSum += values[i - period + 1 + j]! * (j + 1);
    }

    result[i] = weightedSum / denominator;
  }

  return result;
}

export function calculateVWAP(
  candles: IndicatorCandle[],
): Array<number | null> {
  const result: Array<number | null> = Array(candles.length).fill(null);

  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i]!;
    const typicalPrice =
      (candle.high + candle.low + candle.close) / 3;

    cumulativePriceVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;

    result[i] =
      cumulativeVolume > 0
        ? cumulativePriceVolume / cumulativeVolume
        : null;
  }

  return result;
}

export function calculateBollingerBands(
  values: number[],
  period: number,
  standardDeviations = 2,
): BollingerPoint[] {
  validatePeriod(period);

  if (standardDeviations < 0) {
    throw new Error("Standard deviations must not be negative.");
  }

  const points: BollingerPoint[] = [];

  for (let i = period - 1; i < values.length; i += 1) {
    const window = values.slice(i - period + 1, i + 1);
    const middle =
      window.reduce((sum, value) => sum + value, 0) / period;

    const variance =
      window.reduce(
        (sum, value) => sum + (value - middle) ** 2,
        0,
      ) / period;

    const deviation = Math.sqrt(variance);

    points.push({
      time: i,
      middle,
      upper: middle + standardDeviations * deviation,
      lower: middle - standardDeviations * deviation,
    });
  }

  return points;
}

export function calculateRSI(
  values: number[],
  period: number,
): Array<number | null> {
  validatePeriod(period);

  const result: Array<number | null> = Array(values.length).fill(null);

  if (values.length <= period) {
    return result;
  }

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i += 1) {
    const change = values[i]! - values[i - 1]!;

    if (change >= 0) {
      gainSum += change;
    } else {
      lossSum -= change;
    }
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;

  result[period] =
    averageLoss === 0
      ? 100
      : 100 - 100 / (1 + averageGain / averageLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i]! - values[i - 1]!;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;

    result[i] =
      averageLoss === 0
        ? 100
        : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return result;
}

export function calculateMACD(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdPoint[] {
  validatePeriod(fastPeriod);
  validatePeriod(slowPeriod);
  validatePeriod(signalPeriod);

  if (fastPeriod >= slowPeriod) {
    throw new Error("MACD fast period must be less than slow period.");
  }

  const fast = calculateEMA(values, fastPeriod);
  const slow = calculateEMA(values, slowPeriod);

  const macdValues: Array<number | null> = values.map((_, index) => {
    if (fast[index] === null || slow[index] === null) {
      return null;
    }

    return fast[index]! - slow[index]!;
  });

  const signalInput: number[] = [];
  const signalIndexes: number[] = [];

  macdValues.forEach((value, index) => {
    if (value !== null) {
      signalInput.push(value);
      signalIndexes.push(index);
    }
  });

  const signalValues = calculateEMA(signalInput, signalPeriod);

  return macdValues
    .map((macd, index) => {
      if (macd === null) {
        return null;
      }

      const signalIndex = signalIndexes.indexOf(index);
      const signal =
        signalIndex >= 0
          ? signalValues[signalIndex]
          : null;

      return {
        time: index,
        macd,
        signal,
        histogram:
          signal !== null && signal !== undefined
            ? macd - signal
            : null,
      };
    })
    .filter((point): point is MacdPoint => point !== null);
}

export function calculateStochastic(
  candles: IndicatorCandle[],
  period = 14,
  smoothK = 3,
  smoothD = 3,
): StochasticPoint[] {
  validatePeriod(period);
  validatePeriod(smoothK);
  validatePeriod(smoothD);

  const rawK: Array<number | null> = Array(candles.length).fill(null);

  for (let i = period - 1; i < candles.length; i += 1) {
    const window = candles.slice(i - period + 1, i + 1);

    const highestHigh = Math.max(...window.map((c) => c.high));
    const lowestLow = Math.min(...window.map((c) => c.low));
    const range = highestHigh - lowestLow;

    rawK[i] =
      range === 0
        ? 0
        : ((candles[i]!.close - lowestLow) / range) * 100;
  }

  const kInput: number[] = [];
  const kIndexes: number[] = [];

  rawK.forEach((value, index) => {
    if (value !== null) {
      kInput.push(value);
      kIndexes.push(index);
    }
  });

  const smoothKValues = calculateSMA(kInput, smoothK);
  const dValues = calculateSMA(
    smoothKValues.filter((value): value is number => value !== null),
    smoothD,
  );

  const points: StochasticPoint[] = [];

  smoothKValues.forEach((k, index) => {
    if (k === null) {
      return;
    }

    const originalIndex = kIndexes[index]!;
    const dIndex = index - (smoothD - 1);
    const d =
      dIndex >= 0 ? dValues[dIndex] ?? null : null;

    points.push({
      time: originalIndex,
      k,
      d,
    });
  });

  return points;
}

export function calculateATR(
  candles: IndicatorCandle[],
  period = 14,
): Array<number | null> {
  validatePeriod(period);

  const trueRanges: number[] = [];

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i]!;

    if (i === 0) {
      trueRanges.push(candle.high - candle.low);
      continue;
    }

    const previousClose = candles[i - 1]!.close;

    trueRanges.push(
      Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose),
      ),
    );
  }

  return calculateEMA(trueRanges, period);
}

export function calculateADX(
  candles: IndicatorCandle[],
  period = 14,
): AdxPoint[] {
  validatePeriod(period);

  if (candles.length <= period) {
    return [];
  }

  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i += 1) {
    const current = candles[i]!;
    const previous = candles[i - 1]!;

    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    plusDM.push(
      upMove > downMove && upMove > 0 ? upMove : 0,
    );

    minusDM.push(
      downMove > upMove && downMove > 0 ? downMove : 0,
    );

    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      ),
    );
  }

  const atr = calculateEMA(trueRanges, period);
  const plus = calculateEMA(plusDM, period);
  const minus = calculateEMA(minusDM, period);

  const dx: Array<number | null> = [];

  for (let i = 0; i < trueRanges.length; i += 1) {
    if (
      atr[i] === null ||
      plus[i] === null ||
      minus[i] === null ||
      atr[i] === 0
    ) {
      dx.push(null);
      continue;
    }

    const plusDI = (plus[i]! / atr[i]!) * 100;
    const minusDI = (minus[i]! / atr[i]!) * 100;
    const denominator = plusDI + minusDI;

    dx.push(
      denominator === 0
        ? 0
        : (Math.abs(plusDI - minusDI) / denominator) * 100,
    );
  }

  const dxInput: number[] = [];
  const dxIndexes: number[] = [];

  dx.forEach((value, index) => {
    if (value !== null) {
      dxInput.push(value);
      dxIndexes.push(index);
    }
  });

  const adxValues = calculateEMA(dxInput, period);

  const points: AdxPoint[] = [];

  adxValues.forEach((adx, index) => {
    if (adx === null) {
      return;
    }

    const originalIndex = dxIndexes[index]!;
    const atrValue = atr[originalIndex];

    if (
      atrValue === null ||
      atrValue === undefined ||
      atrValue === 0
    ) {
      return;
    }

    const plusValue = plus[originalIndex]!;
    const minusValue = minus[originalIndex]!;

    points.push({
      time: originalIndex + 1,
      adx,
      plusDi: (plusValue / atrValue) * 100,
      minusDi: (minusValue / atrValue) * 100,
    });
  });

  return points;
}

export function toIndicatorPoints(
  times: number[],
  values: Array<number | null>,
): IndicatorPoint[] {
  const points: IndicatorPoint[] = [];

  for (let i = 0; i < Math.min(times.length, values.length); i += 1) {
    const value = values[i];

    if (
      value !== null &&
      value !== undefined &&
      Number.isFinite(value)
    ) {
      points.push({
        time: times[i]!,
        value,
      });
    }
  }

  return points;
}
