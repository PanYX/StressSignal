import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { recomputeIndicatorSnapshots } from "../../../../lib/api/compute-snapshots";
import {
  computeSnapshotsResponseSchema,
} from "../../../../lib/api/schemas";
import {
  internalErrorResponse,
  parseBearerToken,
  unauthorizedResponse,
} from "../../../../lib/api/route";
import { DATA_CACHE_TAGS } from "../../../../lib/db/cached-queries";

const safeRevalidateTag = (tag: string) => {
  try {
    revalidateTag(tag, "default");
  } catch {
    // Cache invalidation is best-effort in direct test/runtime invocations.
  }
};

const revalidateSnapshotCaches = (slugs: readonly string[]) => {
  [
    DATA_CACHE_TAGS.summary,
    DATA_CACHE_TAGS.indicators,
    DATA_CACHE_TAGS.dataSources,
    DATA_CACHE_TAGS.commentary,
  ].forEach(safeRevalidateTag);

  slugs.forEach((slug) => safeRevalidateTag(`indicator:${slug}`));
};

export async function POST(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || !token || token !== cronSecret) {
    return unauthorizedResponse();
  }

  try {
    const result = await recomputeIndicatorSnapshots({ persist: true });
    revalidateSnapshotCaches(result.rows.map((row) => row.slug));
    const response = computeSnapshotsResponseSchema.parse({
      computedAt: result.computedAt,
      rowsWritten: result.rows.length,
      rowsComputed: result.rows.length,
      compositeRiskScore: result.compositeRiskScore,
    });

    return NextResponse.json(response);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
