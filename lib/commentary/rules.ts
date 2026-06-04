export const COMMENTARY_BRANCH_ORDER = [
  "equity_only_warming",
  "broad_equity_warming",
  "system_pressure_warming",
  "term_structure_inversion",
] as const;

export type CommentaryBranch = (typeof COMMENTARY_BRANCH_ORDER)[number];

export type CommentaryInputMetric = {
  latestValue: number | null;
  pctRank1y: number | null;
};

export type CommentaryInput = {
  vix?: CommentaryInputMetric | null;
  vxn?: CommentaryInputMetric | null;
  rvx?: CommentaryInputMetric | null;
  stlfsi4?: CommentaryInputMetric | null;
  nfci?: CommentaryInputMetric | null;
  vixTermProxy?: CommentaryInputMetric | null;
};

const isWarm = (value: number | null | undefined, threshold: number): boolean =>
  Number.isFinite(value ?? NaN) && (value as number) >= threshold;

const isBelowZero = (value: number | null | undefined): boolean =>
  Number.isFinite(value ?? NaN) && (value as number) < 0;

const describeMissing = (metric?: CommentaryInputMetric | null): boolean =>
  !(metric && Number.isFinite(metric.latestValue) && Number.isFinite(metric.pctRank1y));

export interface CommentaryDecision {
  branches: CommentaryBranch[];
  missing: string[];
}

export function evaluateCommentaryBranches(
  input: CommentaryInput,
): CommentaryDecision {
  const branches: CommentaryBranch[] = [];
  const missing: string[] = [];

  if (describeMissing(input.vix)) {
    missing.push("vix");
  }
  if (describeMissing(input.vxn)) {
    missing.push("vxn");
  }
  if (describeMissing(input.rvx)) {
    missing.push("rvx");
  }
  if (describeMissing(input.stlfsi4)) {
    missing.push("stlfsi4");
  }
  if (describeMissing(input.nfci)) {
    missing.push("nfci");
  }

  const vixHot = isWarm(input.vix?.pctRank1y, 0.8);
  const systemPressureIndicatorsCold = isBelowZero(input.stlfsi4?.latestValue) && isBelowZero(input.nfci?.latestValue);

  const broadEquityHot =
    isWarm(input.vix?.pctRank1y, 0.75) &&
    isWarm(input.vxn?.pctRank1y, 0.75) &&
    isWarm(input.rvx?.pctRank1y, 0.75);
  const systemPressureHot =
    isWarm(input.stlfsi4?.pctRank1y, 0.55) &&
    isWarm(input.nfci?.pctRank1y, 0.55);
  const termShortEndHot = isWarm(input.vixTermProxy?.latestValue, 1);

  if (vixHot && systemPressureIndicatorsCold && !systemPressureHot) {
    branches.push("equity_only_warming");
  }

  if (broadEquityHot) {
    branches.push("broad_equity_warming");
  }

  if (systemPressureHot) {
    branches.push("system_pressure_warming");
  }

  if (termShortEndHot) {
    branches.push("term_structure_inversion");
  }

  return {
    branches,
    missing: missing.filter((metric, index, list) => list.indexOf(metric) === index),
  };
}
