import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import {
  internalErrorResponse,
  parseBearerToken,
  unauthorizedResponse,
} from "../../../../../lib/api/route";
import { DATA_CACHE_TAGS } from "../../../../../lib/db/cached-queries";
import { runFredSync } from "../../../../../lib/sync/fred";

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
  const token = parseBearerToken(request.headers.get("authorization"));
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || !token || token !== cronSecret) {
    return unauthorizedResponse();
  }

  try {
    const response = await runFredSync();
    if (response.changedSlugs.length > 0) {
      revalidateObservationCaches(response.changedSlugs);
    }

    return NextResponse.json(response, {
      status: response.summary.hasFailures ? 500 : 200,
    });
  } catch (error) {
    return internalErrorResponse(error, "sync_fred_failed");
  }
}
