export const RISK_SCORE_BANDS = [
  {
    key: "calm",
    minInclusive: 0,
    maxExclusive: 30,
    label: "平静",
    description:
      "Risk posture appears stable with low cross-market stress readings.",
  },
  {
    key: "watch",
    minInclusive: 30,
    maxExclusive: 50,
    label: "观察",
    description: "Conditions are mixed; monitor whether stress remains isolated.",
  },
  {
    key: "warming",
    minInclusive: 50,
    maxExclusive: 70,
    label: "风险升温",
    description: "Risk is starting to rise and breadth should be monitored.",
  },
  {
    key: "pressure",
    minInclusive: 70,
    maxExclusive: 85,
    label: "明显承压",
    description:
      "Broader and more persistent risk pressure is present across series.",
  },
  {
    key: "resonance",
    minInclusive: 85,
    maxExclusive: 101,
    label: "风险共振",
    description:
      "Risk appears synchronized with stronger probability of spillover.",
  },
] as const;

export type RiskBandKey = (typeof RISK_SCORE_BANDS)[number]["key"];
export type RiskBandLabel = (typeof RISK_SCORE_BANDS)[number]["label"];

export const SNAPSHOT_STATE_BANDS = [
  {
    key: "calm",
    minInclusive: 0,
    maxExclusive: 0.3,
    label: "平静",
    description: "风险未显示明显扩散，观察波动。",
  },
  {
    key: "watch",
    minInclusive: 0.3,
    maxExclusive: 0.5,
    label: "观察",
    description: "局部变化增温，先看联动是否同步。",
  },
  {
    key: "warming",
    minInclusive: 0.5,
    maxExclusive: 0.7,
    label: "风险升温",
    description: "权益端压力上移，继续关注是否向系统端扩散。",
  },
  {
    key: "pressure",
    minInclusive: 0.7,
    maxExclusive: 0.85,
    label: "明显承压",
    description: "多个市场面出现一致的承压迹象。",
  },
  {
    key: "resonance",
    minInclusive: 0.85,
    maxExclusive: 1.0000001,
    label: "风险共振",
    description: "风险信号在主要渠道均同步抬升。",
  },
] as const;

export const SNAPSHOT_STATE_UNKNOWN_LABEL = "数据不足";
export type SnapshotStateLabel =
  (typeof SNAPSHOT_STATE_BANDS)[number]["label"] | typeof SNAPSHOT_STATE_UNKNOWN_LABEL;

export function getRiskBandLabel(score: number): RiskBandLabel {
  const normalized = Number.isFinite(score) ? score : 0;
  const found = RISK_SCORE_BANDS.find(
    (band) =>
      normalized >= band.minInclusive && normalized < band.maxExclusive,
  );
  return found?.label ?? RISK_SCORE_BANDS[0].label;
}

export function getSnapshotStateLabel(rank: number | null | undefined): SnapshotStateLabel {
  if (!Number.isFinite(rank ?? NaN)) {
    return SNAPSHOT_STATE_UNKNOWN_LABEL;
  }

  const normalized = Math.min(Math.max(rank ?? 0, 0), 1);
  const found = SNAPSHOT_STATE_BANDS.find(
    (band) =>
      normalized >= band.minInclusive && normalized < band.maxExclusive,
  );
  return found?.label ?? SNAPSHOT_STATE_BANDS[0].label;
}
