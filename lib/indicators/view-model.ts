import {
  MVP_INDICATOR_CONFIGS,
  type IndicatorConfig,
} from "./configs";
import type { IndicatorSnapshotWithSources } from "../db/queries";

const configBySlug = new Map<string, IndicatorConfig>(
  MVP_INDICATOR_CONFIGS.map((config) => [config.slug, config]),
);

export const indicatorRowFromConfig = (
  config: IndicatorConfig,
): IndicatorSnapshotWithSources => ({
  id: config.slug,
  slug: config.slug,
  name: config.name,
  category: config.category,
  frequency: config.frequency,
  description: config.description,
  unit: config.unit,
  status: config.status,
  sourcePolicy: config.sourcePolicy,
  latestValue: null,
  latestDate: null,
  change1d: null,
  change5d: null,
  change20d: null,
  pctRank1y: null,
  zscore1y: null,
  stateLabel: "数据不足",
  updatedAt: null,
  sources: config.sources.map((source) => ({
    provider: source.provider,
    externalId: source.externalId,
    fetchMode: source.fetchMode,
    sourceUrl: source.sourceUrl,
    isPrimary: source.isPrimary,
    licenseNote: source.licenseNote,
    active: source.active,
  })),
});

export const getIndicatorConfigBySlug = (slug: string) => configBySlug.get(slug);

export const mergeConfiguredRows = (
  rows: readonly IndicatorSnapshotWithSources[],
  slugs: readonly string[],
): IndicatorSnapshotWithSources[] => {
  const rowBySlug = new Map(rows.map((row) => [row.slug, row]));

  return slugs
    .map((slug) => {
      const row = rowBySlug.get(slug);
      if (row) {
        return row;
      }

      const config = configBySlug.get(slug);
      return config ? indicatorRowFromConfig(config) : null;
    })
    .filter((row): row is IndicatorSnapshotWithSources => row !== null);
};
