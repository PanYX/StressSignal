import { z } from "zod";

import { type HistoryWindow } from "../db/queries";

const dateOrNull = z.string().nullable();

const numberOrNull = z.number().nullable();

export const historyRangeSchema = z.enum(["3M", "1Y", "5Y", "MAX"]);
export const safeHistoryRangeSchema = historyRangeSchema;

export const errorSchema = z.object({
  error: z.string(),
  code: z.string(),
  reason: z.string(),
  details: z.unknown().optional(),
});

export const summaryCardSchema = z.object({
  slug: z.string(),
  name: z.string(),
  latestValue: numberOrNull,
  latestDate: dateOrNull,
  change1d: numberOrNull,
  pctRank1y: numberOrNull,
  stateLabel: z.string(),
});

export const summaryResponseSchema = z.object({
  asOf: dateOrNull,
  riskScore: numberOrNull,
  riskStateLabel: z.string(),
  topDrivers: z.array(z.string()),
  cards: z.array(summaryCardSchema),
  headline: z.string(),
});

const sourceMetadataSchema = z.object({
  provider: z.string(),
  externalId: z.string(),
  fetchMode: z.string(),
  sourceUrl: z.string(),
  isPrimary: z.boolean(),
  licenseNote: z.string().nullable(),
  active: z.boolean(),
});

export const indicatorItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  frequency: z.string(),
  description: z.string(),
  unit: z.string(),
  status: z.string(),
  sourcePolicy: z.string(),
  latestValue: numberOrNull,
  latestDate: dateOrNull,
  change1d: numberOrNull,
  change5d: numberOrNull,
  change20d: numberOrNull,
  pctRank1y: numberOrNull,
  zscore1y: numberOrNull,
  stateLabel: z.string(),
  updatedAt: dateOrNull,
  sources: z.array(sourceMetadataSchema),
});

export const indicatorsListResponseSchema = z.object({
  asOf: dateOrNull,
  indicators: z.array(indicatorItemSchema),
});

export const indicatorDetailResponseSchema = z.object({
  asOf: dateOrNull,
  indicator: indicatorItemSchema,
});

export const observationSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export const observationsResponseSchema = z.object({
  asOf: dateOrNull,
  slug: z.string(),
  range: historyRangeSchema,
  observations: z.array(observationSchema),
  sourceCount: z.number().int().nonnegative(),
});

export const commentaryResponseSchema = z.object({
  asOf: dateOrNull,
  scope: z.string(),
  headline: z.string(),
  summary: z.string(),
  details: z.array(z.string()),
  branches: z.array(z.string()),
  missing: z.array(z.string()),
  metrics: z.object({
    vix: z
      .object({ latestValue: numberOrNull, pctRank1y: numberOrNull })
      .nullable(),
    vxn: z
      .object({ latestValue: numberOrNull, pctRank1y: numberOrNull })
      .nullable(),
    rvx: z
      .object({ latestValue: numberOrNull, pctRank1y: numberOrNull })
      .nullable(),
    stlfsi4: z
      .object({ latestValue: numberOrNull, pctRank1y: numberOrNull })
      .nullable(),
    nfci: z
      .object({ latestValue: numberOrNull, pctRank1y: numberOrNull })
      .nullable(),
    vixTermProxy: z
      .object({ latestValue: numberOrNull, pctRank1y: numberOrNull })
      .nullable(),
  }),
});

export const computeSnapshotsResponseSchema = z.object({
  computedAt: z.string(),
  rowsWritten: z.number().int(),
  rowsComputed: z.number().int(),
  compositeRiskScore: numberOrNull,
});

export const revalidateRequestSchema = z.object({
  tags: z.array(z.string().min(1)).min(1),
});

export const revalidateResponseSchema = z.object({
  processedAt: z.string(),
  requestedTags: z.array(z.string()),
  processedTags: z.array(z.string()),
  skippedTags: z.array(z.string()),
  totalRequested: z.number().int(),
  totalProcessed: z.number().int(),
});

export const allowedRevalidateTagSchema = z.string().min(1);

export const parseRevalidateTagsSchema = z.object({
  tags: z.array(allowedRevalidateTagSchema).min(1),
});

export const parseHistoryRange = (
  input: string | null,
  fallback: HistoryWindow = "1Y",
): HistoryWindow => {
  if (input === null || input.trim() === "") {
    return fallback;
  }

  const normalized = input.trim().toUpperCase();
  const parsed = historyRangeSchema.safeParse(normalized);
  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(`Invalid history range: ${input}`);
};

export type ApiHistoryRange = z.infer<typeof historyRangeSchema>;
