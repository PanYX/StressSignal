export type AnalyticsValue = string | number | boolean;
export type AnalyticsProps = Record<string, AnalyticsValue | null | undefined>;

type PlausibleEventOptions = {
  props?: Record<string, AnalyticsValue>;
  revenue?: {
    amount: number;
    currency: string;
  };
  callback?: () => void;
};

type PlausibleArgs = [eventName: string, options?: PlausibleEventOptions];
type PlausibleFunction = ((...args: PlausibleArgs) => void) & {
  q?: PlausibleArgs[];
};

declare global {
  interface Window {
    plausible?: PlausibleFunction;
  }
}

const maxPropLength = 120;

function isAnalyticsDisabled() {
  return (
    process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "1" ||
    process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === "true" ||
    process.env.NEXT_PUBLIC_LHCI === "1" ||
    process.env.NEXT_PUBLIC_LHCI === "true"
  );
}

function normalizeAnalyticsProps(props: AnalyticsProps = {}) {
  const normalized: Record<string, AnalyticsValue> = {};

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      normalized[key] =
        value.length > maxPropLength
          ? `${value.slice(0, maxPropLength - 3)}...`
          : value;
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function getPlausible() {
  if (typeof window === "undefined" || isAnalyticsDisabled()) {
    return null;
  }

  if (!window.plausible) {
    const queuedPlausible: PlausibleFunction = (...args) => {
      queuedPlausible.q = queuedPlausible.q || [];
      queuedPlausible.q.push(args);
    };
    window.plausible = queuedPlausible;
  }

  return window.plausible;
}

export function trackPlausibleEvent(eventName: string, props?: AnalyticsProps) {
  const plausible = getPlausible();
  if (!plausible) {
    return;
  }

  plausible(eventName, {
    props: normalizeAnalyticsProps(props),
  });
}

export function stringLengthBucket(value: string) {
  const length = value.trim().length;

  if (length === 0) {
    return "empty";
  }
  if (length < 3) {
    return "lt_3";
  }
  if (length < 10) {
    return "3_9";
  }
  if (length < 30) {
    return "10_29";
  }
  return "gte_30";
}
