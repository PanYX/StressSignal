"use client";

import type { FormHTMLAttributes } from "react";

import {
  type AnalyticsProps,
  stringLengthBucket,
  trackPlausibleEvent,
} from "@/lib/analytics";

type TrackedFormProps = FormHTMLAttributes<HTMLFormElement> & {
  eventName: string;
  eventProps?: AnalyticsProps;
  trackedFields?: string[];
};

export function TrackedForm({
  eventName,
  eventProps,
  trackedFields = [],
  onSubmit,
  ...props
}: TrackedFormProps) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const query = String(formData.get("q") ?? "");
        const fieldProps = Object.fromEntries(
          trackedFields
            .map((field) => [field, String(formData.get(field) ?? "")])
            .filter(([, value]) => value.length > 0),
        );

        trackPlausibleEvent(eventName, {
          ...eventProps,
          ...fieldProps,
          has_query: query.trim().length > 0,
          query_length: stringLengthBucket(query),
        });
        onSubmit?.(event);
      }}
    />
  );
}
