import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import { errorSchema } from "./schemas";

const AUTH_SCHEME = "bearer";

export const parseBearerToken = (
  authorizationHeader: string | null,
): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const normalized = authorizationHeader.trim();
  if (!normalized.toLowerCase().startsWith(`${AUTH_SCHEME} `)) {
    return null;
  }

  const token = normalized.slice(AUTH_SCHEME.length + 1).trim();
  return token.length > 0 ? token : null;
};

const secureSecretEqual = (left: string, right: string): boolean => {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
};

export const hasValidCronToken = (request: Request): boolean => {
  const token = parseBearerToken(request.headers.get("authorization"));
  const cronSecret = process.env.CRON_SECRET?.trim();
  return Boolean(cronSecret && token && secureSecretEqual(token, cronSecret));
};

export const unauthorizedResponse = () =>
  NextResponse.json(
    errorSchema.parse({
      error: "unauthorized",
      code: "unauthorized",
      reason: "invalid or missing cron secret",
    }),
    { status: 401 },
  );

export const badRequestResponse = (details: unknown) =>
  NextResponse.json(
    errorSchema.parse({
      error: "bad_request",
      code: "bad_request",
      reason: "request validation failed",
      details,
    }),
    { status: 400 },
  );

export const internalErrorResponse = (error: unknown, code = "internal_error") => {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as ZodError).name === "ZodError"
  ) {
    const castError = error as ZodError;
    return NextResponse.json(
      errorSchema.parse({
        error: "internal_validation_error",
        code: "internal_validation_error",
        reason: castError.message,
        details: castError.issues,
      }),
      { status: 500 },
    );
  }

  return NextResponse.json(
    errorSchema.parse({
      error: "internal_error",
      code,
      reason: error instanceof Error ? error.message : "unexpected error",
      details: { error: String(error) },
    }),
    { status: 500 },
  );
};
