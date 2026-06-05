"use client";

import type { AnchorHTMLAttributes } from "react";

import { type AnalyticsProps, trackPlausibleEvent } from "@/lib/analytics";

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  eventProps?: AnalyticsProps;
};

export function TrackedExternalLink({
  eventName,
  eventProps,
  onClick,
  ...props
}: TrackedExternalLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackPlausibleEvent(eventName, eventProps);
        onClick?.(event);
      }}
    />
  );
}
