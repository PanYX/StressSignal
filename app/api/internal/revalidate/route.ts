import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { MVP_INDICATOR_SLUGS } from "../../../../lib/indicators/configs";
import {
  parseRevalidateTagsSchema,
  revalidateResponseSchema,
} from "../../../../lib/api/schemas";
import {
  badRequestResponse,
  internalErrorResponse,
  parseBearerToken,
  unauthorizedResponse,
} from "../../../../lib/api/route";

const REVALIDATE_TAGS = new Set<string>([
  "summary",
  "indicators",
  "observations",
  "articles",
  "data-sources",
  "commentary",
  ...MVP_INDICATOR_SLUGS.map((slug) => `indicator:${slug}`),
]);

const normalizeTag = (input: string) => input.trim();

export async function POST(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || !token || token !== cronSecret) {
    return unauthorizedResponse();
  }

  let payload: { tags: string[] };
  try {
    payload = await request.json();
  } catch (error) {
    return badRequestResponse({
      reason: "invalid JSON body",
      details: String(error),
    });
  }

  const parsed = parseRevalidateTagsSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestResponse(parsed.error.flatten());
  }

  try {
    const requestedTags = [...new Set(parsed.data.tags.map(normalizeTag))];
    const processedTags = new Set<string>();
    const skippedTags: string[] = [];

    for (const tag of requestedTags) {
      if (REVALIDATE_TAGS.has(tag)) {
        revalidateTag(tag, "default");
        processedTags.add(tag);
        continue;
      }

      if (tag.startsWith("indicator:")) {
        const slug = tag.slice("indicator:".length);
        const validSlug = (MVP_INDICATOR_SLUGS as readonly string[]).includes(slug);
        if (validSlug) {
          revalidateTag(tag, "default");
          processedTags.add(tag);
          continue;
        }
      }

      skippedTags.push(tag);
    }

    const response = revalidateResponseSchema.parse({
      processedAt: new Date().toISOString(),
      requestedTags,
      processedTags: [...processedTags],
      skippedTags,
      totalRequested: requestedTags.length,
      totalProcessed: processedTags.size,
    });

    return NextResponse.json(response);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
