import { strict as assert } from "node:assert";
import { describe, it } from "vitest";

import { evaluateCommentaryBranches } from "../../lib/commentary/rules";
import { renderCommentary } from "../../lib/commentary/templates";

const metric = (pctRank: number | null, latestValue: number | null) => ({
  latestValue,
  pctRank1y: pctRank,
});

describe("commentary rule evaluation", () => {
  it("detects equity-only warming when only VIX warms", () => {
    const decision = evaluateCommentaryBranches({
      vix: metric(0.82, 16.2),
      stlfsi4: metric(0.2, -0.1),
      nfci: metric(0.3, -0.05),
    });

    assert.deepStrictEqual(decision.branches, ["equity_only_warming"]);
  });

  it("detects broad equity warming when vix/vxn/rvx all warm", () => {
    const decision = evaluateCommentaryBranches({
      vix: metric(0.9, 17.3),
      vxn: metric(0.8, 24.1),
      rvx: metric(0.8, 21.2),
      stlfsi4: metric(0.1, -0.08),
      nfci: metric(0.2, -0.11),
    });

    assert.deepStrictEqual(decision.branches, [
      "equity_only_warming",
      "broad_equity_warming",
    ]);
  });

  it("detects system pressure warming when STLFSI4 and NFCI are high", () => {
    const decision = evaluateCommentaryBranches({
      vix: metric(0.2, 15),
      stlfsi4: metric(0.8, 0.7),
      nfci: metric(0.9, 1.1),
    });

    assert.deepStrictEqual(decision.branches, ["system_pressure_warming"]);
  });

  it("detects term structure inversion to short-end", () => {
    const decision = evaluateCommentaryBranches({
      vix: metric(0.2, 15),
      vixTermProxy: metric(0.4, 1.25),
    });

    assert.deepStrictEqual(decision.branches, ["term_structure_inversion"]);
  });
});

describe("commentary templates", () => {
  it("renders deterministic commentary for the same input", () => {
    const input = {
      vix: metric(0.84, 17),
      vxn: metric(0.86, 25),
      rvx: metric(0.85, 22),
      stlfsi4: metric(0.7, 0.4),
      nfci: metric(0.7, 0.3),
      vixTermProxy: metric(0.58, 1.08),
    };

    const first = renderCommentary(evaluateCommentaryBranches(input));
    const second = renderCommentary(evaluateCommentaryBranches(input));
    assert.deepStrictEqual(first, second);
  });

  it("adds data-missing guidance in deterministic summary text", () => {
    const input = {
      vix: metric(0.2, 11),
      vxn: metric(null, null),
      rvx: metric(null, null),
      stlfsi4: metric(0.1, 0),
      nfci: metric(null, null),
    };

    const rendered = renderCommentary(evaluateCommentaryBranches(input));
    assert.deepStrictEqual(rendered.branches, []);
    assert.ok(rendered.summary.includes("以下序列样本不完整"));
    assert.ok(rendered.missing.includes("vxn"));
  });
});
