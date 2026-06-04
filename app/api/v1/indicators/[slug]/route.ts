import { NextResponse } from "next/server";

import {
  DATA_CACHE_REVALIDATE_SECONDS,
  getCachedIndicatorSnapshotWithSourcesBySlug,
} from "../../../../../lib/db/cached-queries";
import {
  errorSchema,
  indicatorDetailResponseSchema,
} from "../../../../../lib/api/schemas";
import { internalErrorResponse } from "../../../../../lib/api/route";

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${DATA_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=900`,
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const indicator = await getCachedIndicatorSnapshotWithSourcesBySlug(slug);

    if (!indicator) {
      return NextResponse.json(
        errorSchema.parse({
          error: "not_found",
          code: "indicator_not_found",
          reason: `indicator slug not found: ${slug}`,
        }),
        { status: 404 },
      );
    }

    const asOf = indicator.updatedAt ?? indicator.latestDate ?? null;
    const response = indicatorDetailResponseSchema.parse({ asOf, indicator });

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
