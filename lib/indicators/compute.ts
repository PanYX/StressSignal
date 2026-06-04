const ONE_YEAR_DAYS = 252;
const TWO_YEARS_DAYS = ONE_YEAR_DAYS * 2;
export const ONE_YEAR_WEEKLY_BARS = 52;

export type NumericSeriesPoint = {
  readonly date: string;
  readonly value: number;
};

export type RiskScoreInput = {
  readonly vixPctRank: number | null;
  readonly vixVxvPctRank: number | null;
  readonly equityBreadthPctRank: number | null;
  readonly stlfsi4PctRank: number | null;
  readonly nfciPctRank: number | null;
};

export type FearGreedScoreInput = {
  readonly vixPctRank: number | null;
  readonly putCallPctRank: number | null;
  readonly hyOasPctRank: number | null;
  readonly breadthPctRank: number | null;
  readonly momentumPctRank: number | null;
};

export type CompositeRiskWeights = {
  readonly vixWeight: number;
  readonly termWeight: number;
  readonly breadthWeight: number;
  readonly stlfsi4Weight: number;
  readonly nfciWeight: number;
};

export const COMPOSITE_RISK_WEIGHTS: CompositeRiskWeights = {
  vixWeight: 0.3,
  termWeight: 0.15,
  breadthWeight: 0.15,
  stlfsi4Weight: 0.2,
  nfciWeight: 0.2,
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return NaN;
  }

  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const sanitizeValues = (values: readonly number[]): number[] =>
  values.filter(isFiniteNumber);

const toSortedSeries = (points: readonly NumericSeriesPoint[]): NumericSeriesPoint[] =>
  [...points]
    .filter((point) => isFiniteNumber(point.value))
    .sort((left, right) => left.date.localeCompare(right.date));

const toValues = (points: readonly NumericSeriesPoint[]): number[] =>
  toSortedSeries(points).map((point) => point.value);

const valuesFromWindow = (values: readonly number[], windowSize: number): number[] => {
  if (!Number.isFinite(windowSize) || windowSize <= 0) {
    return sanitizeValues(values);
  }

  const sanitized = sanitizeValues(values);
  if (sanitized.length <= windowSize) {
    return sanitized;
  }

  return sanitized.slice(-windowSize);
};

export function computeChange(values: readonly number[], lag: number): number | null {
  const sanitized = sanitizeValues(values);
  if (!Number.isFinite(lag) || lag <= 0) {
    return null;
  }

  const lagInteger = Math.floor(lag);
  if (sanitized.length <= lagInteger) {
    return null;
  }

  const latest = sanitized.at(-1);
  const prior = sanitized.at(-1 - lagInteger);

  if (!isFiniteNumber(latest) || !isFiniteNumber(prior)) {
    return null;
  }

  return latest - prior;
}

export function computeChange1d(values: readonly number[]): number | null {
  return computeChange(values, 1);
}

export function computeChange5d(values: readonly number[]): number | null {
  return computeChange(values, 5);
}

export function computeChange20d(values: readonly number[]): number | null {
  return computeChange(values, 20);
}

export function computeChangeFromPoints(points: readonly NumericSeriesPoint[], lag: 1 | 5 | 20): number | null {
  return computeChange(toValues(points), lag);
}

export function computeChange1dFromPoints(points: readonly NumericSeriesPoint[]): number | null {
  return computeChangeFromPoints(points, 1);
}

export function computeChange5dFromPoints(points: readonly NumericSeriesPoint[]): number | null {
  return computeChangeFromPoints(points, 5);
}

export function computeChange20dFromPoints(points: readonly NumericSeriesPoint[]): number | null {
  return computeChangeFromPoints(points, 20);
}

export function computePctRank(values: readonly number[], windowSize = ONE_YEAR_DAYS): number | null {
  const sanitized = sanitizeValues(values);
  const sample = valuesFromWindow(sanitized, windowSize);
  if (sample.length < 2) {
    return null;
  }

  const latest = sample.at(-1);
  if (!isFiniteNumber(latest)) {
    return null;
  }

  const sorted = [...sample].sort((left, right) => left - right);
  let lessThanLatestCount = 0;
  let lessOrEqualLatestCount = 0;

  for (const value of sorted) {
    if (value < latest) {
      lessThanLatestCount += 1;
    }
    if (value <= latest) {
      lessOrEqualLatestCount += 1;
    }
  }

  if (sorted.length < 2 || lessThanLatestCount === sorted.length - 1) {
    const fallback = lessThanLatestCount === sorted.length - 1 ? 1 : lessThanLatestCount / (sorted.length - 1);
    return clamp01(fallback);
  }

  const latestIndexFloor = lessThanLatestCount;
  const latestIndexCeil = lessOrEqualLatestCount - 1;
  const averageRank = (latestIndexFloor + latestIndexCeil) / 2;
  const percentRank = averageRank / (sorted.length - 1);
  return clamp01(percentRank);
}

export function computePctRank1y(values: readonly number[]): number | null {
  return computePctRank(values, ONE_YEAR_DAYS);
}

export function computePctRank1yFromPoints(points: readonly NumericSeriesPoint[]): number | null {
  return computePctRank1y(toValues(points));
}

export function computeZscore(values: readonly number[], windowSize = ONE_YEAR_DAYS): number | null {
  const sanitized = sanitizeValues(values);
  const sample = valuesFromWindow(sanitized, windowSize);
  if (sample.length < 2) {
    return null;
  }

  const latest = sample.at(-1);
  if (!isFiniteNumber(latest)) {
    return null;
  }

  const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const variance = sample.reduce(
    (sum, value) => {
      const delta = value - mean;
      return sum + delta * delta;
    },
    0,
  ) / sample.length;

  if (variance === 0) {
    return 0;
  }

  const std = Math.sqrt(variance);
  return (latest - mean) / std;
}

export function computeZscore1y(values: readonly number[]): number | null {
  return computeZscore(values, ONE_YEAR_DAYS);
}

export function computeZscore1yFromPoints(points: readonly NumericSeriesPoint[]): number | null {
  return computeZscore1y(toValues(points));
}

export function computeVixTermProxySeries(
  vixPoints: readonly NumericSeriesPoint[],
  vixvPoints: readonly NumericSeriesPoint[],
): NumericSeriesPoint[] {
  const term = new Map<string, number>();
  for (const point of toSortedSeries(vixvPoints)) {
    if (isFiniteNumber(point.value)) {
      term.set(point.date, point.value);
    }
  }

  const proxy: NumericSeriesPoint[] = [];
  for (const point of toSortedSeries(vixPoints)) {
    const vixv = term.get(point.date);
    if (!isFiniteNumber(point.value) || !isFiniteNumber(vixv) || vixv <= 0) {
      continue;
    }
    proxy.push({
      date: point.date,
      value: point.value / vixv,
    });
  }

  return proxy;
}

export function computeVixTermProxyLatest(
  vixPoints: readonly NumericSeriesPoint[],
  vixvPoints: readonly NumericSeriesPoint[],
): number | null {
  const proxy = computeVixTermProxySeries(vixPoints, vixvPoints);
  return proxy.at(-1)?.value ?? null;
}

export function computeRatioSeries(
  numeratorPoints: readonly NumericSeriesPoint[],
  denominatorPoints: readonly NumericSeriesPoint[],
): NumericSeriesPoint[] {
  const denominator = new Map<string, number>();
  for (const point of toSortedSeries(denominatorPoints)) {
    if (isFiniteNumber(point.value)) {
      denominator.set(point.date, point.value);
    }
  }

  const output: NumericSeriesPoint[] = [];
  for (const point of toSortedSeries(numeratorPoints)) {
    const denominatorValue = denominator.get(point.date);
    if (
      !isFiniteNumber(point.value) ||
      !isFiniteNumber(denominatorValue) ||
      denominatorValue <= 0
    ) {
      continue;
    }
    output.push({
      date: point.date,
      value: point.value / denominatorValue,
    });
  }

  return output;
}

export function computeDifferenceSeries(
  leftPoints: readonly NumericSeriesPoint[],
  rightPoints: readonly NumericSeriesPoint[],
): NumericSeriesPoint[] {
  const right = new Map<string, number>();
  for (const point of toSortedSeries(rightPoints)) {
    if (isFiniteNumber(point.value)) {
      right.set(point.date, point.value);
    }
  }

  const output: NumericSeriesPoint[] = [];
  for (const point of toSortedSeries(leftPoints)) {
    const rightValue = right.get(point.date);
    if (!isFiniteNumber(point.value) || !isFiniteNumber(rightValue)) {
      continue;
    }
    output.push({
      date: point.date,
      value: point.value - rightValue,
    });
  }

  return output;
}

export function computeMovingAverageSeries(
  points: readonly NumericSeriesPoint[],
  windowSize: number,
): NumericSeriesPoint[] {
  const sorted = toSortedSeries(points);
  const window = Math.max(1, Math.floor(windowSize));
  const output: NumericSeriesPoint[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const sample = sorted.slice(Math.max(0, index - window + 1), index + 1);
    if (sample.length < window) {
      continue;
    }

    const average =
      sample.reduce((sum, point) => sum + point.value, 0) / sample.length;
    output.push({
      date: sorted[index]!.date,
      value: average,
    });
  }

  return output;
}

export function computeMomentumReturnSeries(
  points: readonly NumericSeriesPoint[],
  lag = 20,
): NumericSeriesPoint[] {
  const sorted = toSortedSeries(points);
  const lagInteger = Math.max(1, Math.floor(lag));
  const output: NumericSeriesPoint[] = [];

  for (let index = lagInteger; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    const prior = sorted[index - lagInteger]!;
    if (!isFiniteNumber(current.value) || !isFiniteNumber(prior.value) || prior.value <= 0) {
      continue;
    }

    output.push({
      date: current.date,
      value: ((current.value / prior.value) - 1) * 100,
    });
  }

  return output;
}

export function computeEquityBreadthProxySeries(
  vixPoints: readonly NumericSeriesPoint[],
  vxnPoints: readonly NumericSeriesPoint[],
  rvxPoints: readonly NumericSeriesPoint[],
): NumericSeriesPoint[] {
  const vxn = new Map<string, number>();
  for (const point of toSortedSeries(vxnPoints)) {
    if (isFiniteNumber(point.value)) {
      vxn.set(point.date, point.value);
    }
  }

  const rvx = new Map<string, number>();
  for (const point of toSortedSeries(rvxPoints)) {
    if (isFiniteNumber(point.value)) {
      rvx.set(point.date, point.value);
    }
  }

  const proxy: NumericSeriesPoint[] = [];
  for (const point of toSortedSeries(vixPoints)) {
    const vxnValue = vxn.get(point.date);
    const rvxValue = rvx.get(point.date);
    if (!isFiniteNumber(point.value)) {
      continue;
    }

    const hasVxn = isFiniteNumber(vxnValue);
    const hasRvx = isFiniteNumber(rvxValue);

    if (!hasVxn && !hasRvx) {
      continue;
    }

    const maxRiskSeries = hasVxn && hasRvx ? Math.max(vxnValue, rvxValue) : hasVxn ? vxnValue : rvxValue;
    if (!isFiniteNumber(maxRiskSeries)) {
      continue;
    }

    proxy.push({
      date: point.date,
      value: maxRiskSeries - point.value,
    });
  }

  return proxy;
}

export function computeEquityBreadthProxyLatest(
  vixPoints: readonly NumericSeriesPoint[],
  vxnPoints: readonly NumericSeriesPoint[],
  rvxPoints: readonly NumericSeriesPoint[],
): number | null {
  return computeEquityBreadthProxySeries(vixPoints, vxnPoints, rvxPoints).at(-1)
    ?.value ?? null;
}

export function computeCompositeRiskScore(input: RiskScoreInput): number | null {
  const components = [
    { weight: COMPOSITE_RISK_WEIGHTS.vixWeight, value: input.vixPctRank },
    {
      weight: COMPOSITE_RISK_WEIGHTS.termWeight,
      value: input.vixVxvPctRank,
    },
    {
      weight: COMPOSITE_RISK_WEIGHTS.breadthWeight,
      value: input.equityBreadthPctRank,
    },
    {
      weight: COMPOSITE_RISK_WEIGHTS.stlfsi4Weight,
      value: input.stlfsi4PctRank,
    },
    { weight: COMPOSITE_RISK_WEIGHTS.nfciWeight, value: input.nfciPctRank },
  ];

  const [vixComponent, termComponent, breadthComponent, stlfsi4Component, nfciComponent] =
    components;
  const { value: vixValue } = vixComponent;
  const { value: termValue } = termComponent;
  const { value: breadthValue } = breadthComponent;
  const { value: stlfsi4Value } = stlfsi4Component;
  const { value: nfciValue } = nfciComponent;

  for (const component of components) {
    if (!isFiniteNumber(component.value) || component.value < 0 || component.value > 1) {
      return null;
    }
  }

  if (
    vixValue === null ||
    termValue === null ||
    breadthValue === null ||
    stlfsi4Value === null ||
    nfciValue === null
  ) {
    return null;
  }

  const score01 =
    vixValue * vixComponent.weight +
    termValue * termComponent.weight +
    breadthValue * breadthComponent.weight +
    stlfsi4Value * stlfsi4Component.weight +
    nfciValue * nfciComponent.weight;
 

  const normalized = score01 * 100;
  if (!Number.isFinite(normalized)) {
    return null;
  }

  return Math.min(100, Math.max(0, normalized));
}

export function computeFearGreedScore(input: FearGreedScoreInput): number | null {
  const components = [
    input.vixPctRank === null ? null : 1 - input.vixPctRank,
    input.putCallPctRank === null ? null : 1 - input.putCallPctRank,
    input.hyOasPctRank === null ? null : 1 - input.hyOasPctRank,
    input.breadthPctRank,
    input.momentumPctRank,
  ];

  const values: number[] = [];
  for (const component of components) {
    if (!isFiniteNumber(component) || component < 0 || component > 1) {
      return null;
    }
    values.push(component);
  }

  const score01 =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.min(100, Math.max(0, score01 * 100));
}

export function computeAveragePercentileScore(
  pctRanks: ReadonlyArray<number | null | undefined>,
  minimumComponents = pctRanks.length,
): number | null {
  const values = pctRanks.filter(isFiniteNumber);
  if (values.length < minimumComponents || values.length === 0) {
    return null;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.min(100, Math.max(0, average * 100));
}

export function computeCompositeRiskScoreFromSeries(
  vixPoints: readonly NumericSeriesPoint[],
  vixvPoints: readonly NumericSeriesPoint[],
  vxnPoints: readonly NumericSeriesPoint[],
  rvxPoints: readonly NumericSeriesPoint[],
  stlfsi4Points: readonly NumericSeriesPoint[],
  nfciPoints: readonly NumericSeriesPoint[],
): number | null {
  const vixPctRank = computePctRank1y(toValues(vixPoints));
  const vixVxvPctRank = computePctRank1y(
    toValues(computeVixTermProxySeries(vixPoints, vixvPoints)),
  );
  const equityBreadthPctRank = computePctRank1y(
    toValues(computeEquityBreadthProxySeries(vixPoints, vxnPoints, rvxPoints)),
  );
  const stlfsi4PctRank = computePctRank1y(toValues(stlfsi4Points));
  const nfciPctRank = computePctRank1y(toValues(nfciPoints));

  return computeCompositeRiskScore({
    vixPctRank,
    vixVxvPctRank,
    equityBreadthPctRank,
    stlfsi4PctRank,
    nfciPctRank,
  });
}

export const SERIES_LIMITS = {
  oneYearDaily: ONE_YEAR_DAYS,
  oneYearWeekly: ONE_YEAR_WEEKLY_BARS,
  maxLookback: TWO_YEARS_DAYS,
} as const;

export { ONE_YEAR_DAYS, TWO_YEARS_DAYS };
