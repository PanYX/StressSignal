import { NextResponse } from "next/server";

import {
  DATA_CACHE_REVALIDATE_SECONDS,
  getCachedHomepageSummary,
} from "../../../../lib/db/cached-queries";
import { summaryResponseSchema } from "../../../../lib/api/schemas";
import { internalErrorResponse } from "../../../../lib/api/route";

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${DATA_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=900`,
};

export async function GET() {
  try {
    const summary = await getCachedHomepageSummary();
    const response = summaryResponseSchema.parse(summary);

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
