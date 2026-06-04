import { NextResponse } from "next/server";

import {
  DATA_CACHE_REVALIDATE_SECONDS,
  getCachedIndicatorSnapshotsWithSources,
} from "../../../../lib/db/cached-queries";
import { indicatorsListResponseSchema } from "../../../../lib/api/schemas";
import { internalErrorResponse } from "../../../../lib/api/route";

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${DATA_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=900`,
};

export async function GET() {
  try {
    const indicators = await getCachedIndicatorSnapshotsWithSources();
    const asOf = indicators
      .map((item) => item.updatedAt ?? item.latestDate)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

    const response = indicatorsListResponseSchema.parse({ asOf, indicators });

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
