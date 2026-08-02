import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  hasValidCronToken,
  internalErrorResponse,
  unauthorizedResponse,
} from "../../../../../lib/api/route";
import { DATA_CACHE_TAGS } from "../../../../../lib/db/cached-queries";
import { runPublicSourcesSync } from "../../../../../lib/sync/public-sources";

export const runtime = "nodejs";

const safeRevalidateTag = (tag: string) => {
  try {
    revalidateTag(tag, "default");
  } catch {
    // Cache invalidation is best-effort in direct test/runtime invocations.
  }
};

const revalidateObservationCaches = (slugs: readonly string[]) => {
  safeRevalidateTag(DATA_CACHE_TAGS.observations);
  safeRevalidateTag(DATA_CACHE_TAGS.summary);
  safeRevalidateTag(DATA_CACHE_TAGS.dataSources);

  slugs.forEach((slug) => safeRevalidateTag(`indicator:${slug}`));
};

export async function POST(request: Request) {
  if (!hasValidCronToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const response = await runPublicSourcesSync();
    if (response.changedSlugs.length > 0) {
      revalidateObservationCaches(response.changedSlugs);
    }

    return NextResponse.json(response, {
      status: response.summary.hasFailures ? 500 : 200,
    });
  } catch (error) {
    return internalErrorResponse(error, "sync_public_sources_failed");
  }
}
