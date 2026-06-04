import { NextResponse } from "next/server";

import {
  DATA_CACHE_REVALIDATE_SECONDS,
  getCachedIndicatorSnapshots,
} from "../../../../lib/db/cached-queries";
import {
  commentaryResponseSchema,
  errorSchema,
} from "../../../../lib/api/schemas";
import { evaluateCommentaryBranches } from "../../../../lib/commentary/rules";
import { renderCommentary } from "../../../../lib/commentary/templates";
import { internalErrorResponse } from "../../../../lib/api/route";

const CACHE_HEADERS = {
  "Cache-Control": `public, s-maxage=${DATA_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=900`,
};

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const scope = searchParams.get("scope") ?? "daily";

    if (scope !== "daily") {
      return NextResponse.json(
        errorSchema.parse({
          error: "bad_request",
          code: "invalid_scope",
          reason: "scope must be 'daily'",
          details: { scope },
        }),
        { status: 400 },
      );
    }

    const snapshots = await getCachedIndicatorSnapshots();
    const snapshotBySlug = new Map(
      snapshots.map((snapshot) => [snapshot.slug, snapshot]),
    );

    const metric = (slug: string) => {
      const row = snapshotBySlug.get(slug);
      return row
        ? {
            latestValue: row.latestValue,
            pctRank1y: row.pctRank1y,
          }
        : null;
    };

    const input = {
      vix: metric("vix"),
      vxn: metric("vxn"),
      rvx: metric("rvx"),
      stlfsi4: metric("stlfsi4"),
      nfci: metric("nfci"),
      vixTermProxy: metric("vix-term-proxy"),
    };

    const rendered = renderCommentary(evaluateCommentaryBranches(input));
    const asOf = snapshots
      .map((snapshot) => snapshot.updatedAt ?? snapshot.latestDate)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

    const response = commentaryResponseSchema.parse({
      asOf,
      scope,
      headline: rendered.headline,
      summary: rendered.summary,
      details: rendered.details,
      branches: rendered.branches,
      missing: rendered.missing,
      metrics: {
        vix: metric("vix"),
        vxn: metric("vxn"),
        rvx: metric("rvx"),
        stlfsi4: metric("stlfsi4"),
        nfci: metric("nfci"),
        vixTermProxy: metric("vix-term-proxy"),
      },
    });

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
