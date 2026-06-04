import { strict as assert } from "node:assert";
import { describe, it } from "vitest";

import {
  computeChange1dFromPoints,
  computeChange20dFromPoints,
  computeChange5dFromPoints,
  computeCompositeRiskScore,
  computeDifferenceSeries,
  computeEquityBreadthProxyLatest,
  computeEquityBreadthProxySeries,
  computeFearGreedScore,
  computeMomentumReturnSeries,
  computeMovingAverageSeries,
  computePctRank1yFromPoints,
  computeRatioSeries,
  computeVixTermProxyLatest,
  computeVixTermProxySeries,
  computeZscore1yFromPoints,
  type NumericSeriesPoint,
} from "../../lib/indicators/compute";

const makeSeries = (values: number[]): NumericSeriesPoint[] =>
  values.map((value, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    value,
  }));

describe("change computation", () => {
  it("computes 1d/5d/20d changes with sparse windows", () => {
    const points = makeSeries([11, 13, 16, 18, 20, 19, 22, 25]);
    assert.strictEqual(computeChange1dFromPoints(points), 3);
    assert.strictEqual(computeChange5dFromPoints(points), 9);
    assert.strictEqual(computeChange20dFromPoints(points), null);
  });

  it("keeps change logic stable when data is unsorted", () => {
    const points: NumericSeriesPoint[] = [
      { date: "2026-01-03", value: 20 },
      { date: "2026-01-01", value: 10 },
      { date: "2026-01-02", value: 15 },
      { date: "2026-01-04", value: 30 },
      { date: "2026-01-05", value: 40 },
      { date: "2026-01-06", value: 45 },
    ];

    assert.strictEqual(computeChange1dFromPoints(points), 5);
    assert.strictEqual(computeChange5dFromPoints(points), 35);
  });
});

describe("percentile and z-score", () => {
  it("computes 1y percentile rank with deterministic tie handling", () => {
    const points = makeSeries([10, 8, 8, 12, 16, 16, 20]);
    assert.ok(Math.abs((computePctRank1yFromPoints(points) ?? 0) - 1) < 1e-9);

    const repeated = makeSeries([1, 2, 2, 2, 2]);
    assert.ok(
      Math.abs((computePctRank1yFromPoints(repeated) ?? 0) - 0.625) < 1e-9,
    );
  });

  it("computes zscore deterministically and guards short sample sizes", () => {
    assert.strictEqual(computeZscore1yFromPoints(makeSeries([1])), null);
    assert.ok(
      Math.abs((computeZscore1yFromPoints(makeSeries([10, 12, 14, 16])) ?? 0) - 1.3416) < 1e-3,
    );
  });
});

describe("proxy and breadth series helpers", () => {
  it("computes VIX/VXV term proxy from aligned daily observations", () => {
    const vix = makeSeries([24, 26, 28, 30]);
    const vixv = makeSeries([20, 21, 21, 22]);
    const proxy = computeVixTermProxySeries(vix, vixv);
    assert.ok(Math.abs((proxy.at(-1)?.value ?? 0) - (30 / 22)) < 1e-9);
    assert.ok(
      Math.abs((computeVixTermProxyLatest(vix, vixv) ?? 0) - (30 / 22)) < 1e-9,
    );
  });

  it("computes equity breadth proxy from aligned vix/vxn/rvx observations", () => {
    const vix = makeSeries([20, 21, 22]);
    const vxn = makeSeries([30, 33, 36]);
    const rvx = makeSeries([25, 35, 34]);
    const breadth = computeEquityBreadthProxySeries(vix, vxn, rvx);
    assert.deepStrictEqual(breadth.map((point) => point.value), [10, 14, 14]);
    assert.strictEqual(computeEquityBreadthProxyLatest(vix, vxn, rvx), 14);
  });

  it("computes generic ratio, spread, moving average, and momentum series", () => {
    const left = makeSeries([10, 20, 30, 40, 50]);
    const right = makeSeries([2, 4, 5, 8, 10]);

    assert.deepStrictEqual(computeRatioSeries(left, right).map((point) => point.value), [5, 5, 6, 5, 5]);
    assert.deepStrictEqual(computeDifferenceSeries(left, right).map((point) => point.value), [8, 16, 25, 32, 40]);
    assert.deepStrictEqual(computeMovingAverageSeries(left, 3).map((point) => point.value), [20, 30, 40]);
    const momentum = computeMomentumReturnSeries(left, 2).map((point) => point.value);
    assert.deepStrictEqual(momentum.slice(0, 2), [200, 100]);
    assert.ok(Math.abs(momentum[2]! - 66.6667) < 1e-3);
  });
});

describe("risk score", () => {
  it("computes the composite score with deterministic D-005 weights", () => {
    const score = computeCompositeRiskScore({
      vixPctRank: 0.8,
      vixVxvPctRank: 0.9,
      equityBreadthPctRank: 0.4,
      stlfsi4PctRank: 0.6,
      nfciPctRank: 0.7,
    });

    assert.ok(Math.abs((score ?? 0) - 69.5) < 1e-9);
  });

  it("returns null when component ranks are unavailable", () => {
    const score = computeCompositeRiskScore({
      vixPctRank: null,
      vixVxvPctRank: 0.5,
      equityBreadthPctRank: 0.4,
      stlfsi4PctRank: 0.6,
      nfciPctRank: 0.7,
    });

    assert.strictEqual(score, null);
  });

  it("computes fear and greed score with defensive factors inverted", () => {
    const score = computeFearGreedScore({
      vixPctRank: 0.2,
      putCallPctRank: 0.3,
      hyOasPctRank: 0.4,
      breadthPctRank: 0.7,
      momentumPctRank: 0.8,
    });

    assert.ok(Math.abs((score ?? 0) - 72) < 1e-9);
  });
});
