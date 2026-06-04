import { NextResponse } from "next/server";

import {
  DATA_CACHE_REVALIDATE_SECONDS,
  getCachedActiveIndicatorBySlug,
  getCachedIndicatorHistory,
  getCachedIndicatorSnapshotWithSourcesBySlug,
} from "../../../../../../lib/db/cached-queries";
import {
  badRequestResponse,
  internalErrorResponse,
} from "../../../../../../lib/api/route";
import {
  errorSchema,
  observationsResponseSchema,
  parseHistoryRange,
} from "../../../../../../lib/api/schemas";

type HistoryRange = "3M" | "1Y" | "5Y" | "MAX";

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${DATA_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=900`,
};

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const requestUrl = new URL(request.url);
    const rawRange = requestUrl.searchParams.get("range");
    let range: HistoryRange = "1Y";

    try {
      range = parseHistoryRange(rawRange, "1Y");
    } catch (error) {
      return badRequestResponse({
        range: rawRange,
        reason: error instanceof Error ? error.message : "invalid range",
      });
    }

    const activeIndicator = await getCachedActiveIndicatorBySlug(slug);
    if (!activeIndicator) {
      return NextResponse.json(
        errorSchema.parse({
          error: "not_found",
          code: "indicator_not_found",
          reason: `indicator slug not found: ${slug}`,
        }),
        { status: 404 },
      );
    }

    const snapshot = await getCachedIndicatorSnapshotWithSourcesBySlug(activeIndicator.slug);
    const observations = await getCachedIndicatorHistory(activeIndicator.slug, range);
    const asOf = observations.at(-1)?.date ?? null;
    const response = observationsResponseSchema.parse({
      asOf,
      slug: activeIndicator.slug,
      range,
      observations,
      sourceCount: snapshot?.sources.length ?? 0,
    });

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
