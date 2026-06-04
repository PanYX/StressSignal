"use client";

import type { Metadata } from "next";
import { useEffect } from "react";

export const metadata: Metadata = {
  title: "Error | Market Risk Dashboard",
};

export default function Error({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f5f7f6] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-slate-600">
          This page failed while rendering. Try refreshing to recover.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
