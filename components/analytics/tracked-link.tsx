"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { type AnalyticsProps, trackPlausibleEvent } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventName: string;
  eventProps?: AnalyticsProps;
};

export function TrackedLink({
  eventName,
  eventProps,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackPlausibleEvent(eventName, eventProps);
        onClick?.(event);
      }}
    />
  );
}
