"use client";

import { useEffect, useRef, useState } from "react";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

type ChartPoint = {
  date: string;
  [key: string]: number | null | string;
};

type LineDescriptor = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
};

type TimeSeriesChartProps = {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  lines: LineDescriptor[];
  height?: number;
  emptyMessage?: string;
};

type ChartTooltipPayload = {
  name: string;
  value?: ValueType;
  color?: string;
  dataKey?: NameType;
  payload?: ChartPoint;
};

type TooltipProps = {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
};

function formatTooltipValue(value: ValueType): string {
  if (value === null || value === undefined) {
    return "--";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(2) : "--";
  }

  return String(value);
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="max-w-xs rounded-md border border-slate-200 bg-white p-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const value = entry.value;
          if (value === null || value === undefined) {
            return null;
          }

          return (
            <p
              key={`${entry.name}-${String(entry.dataKey)}`}
              style={{ color: entry.color }}
            >
              {entry.name}: {formatTooltipValue(value)}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export function TimeSeriesChart({
  title,
  subtitle,
  points,
  lines,
  height = 240,
  emptyMessage = "No chart data yet. It will update after the next data sync.",
}: TimeSeriesChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const node = chartContainerRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      setChartWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(node);
    window.addEventListener("resize", updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  if (points.length === 0) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <p className="text-sm text-slate-500">{emptyMessage}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </section>
    );
  }

  const yDomain = (() => {
    const values = points.flatMap((point) =>
      lines
        .map((line) => {
          const maybe = point[line.key];
          return typeof maybe === "number" && Number.isFinite(maybe) ? maybe : null;
        })
        .filter((value): value is number => value !== null),
    );

    if (values.length === 0) {
      return ["auto", "auto"] as const;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.08, 1);
    return [Number((min - pad).toFixed(4)), Number((max + pad).toFixed(4))] as const;
  })();

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <header className="space-y-1">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </header>
      <div
        ref={chartContainerRef}
        style={{ width: "100%", minWidth: 0, height, minHeight: height }}
      >
        {chartWidth > 0 ? (
          <LineChart
            width={chartWidth}
            height={height}
            data={points}
            margin={{ left: 8, right: 8, top: 12, bottom: 8 }}
          >
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#64748b" }}
              interval="preserveStartEnd"
              minTickGap={24}
              tickFormatter={(value) => value.slice(5)}
              axisLine={{ stroke: "#dbe4e0" }}
              tickLine={{ stroke: "#dbe4e0" }}
            />
            <CartesianGrid stroke="#e7eeeb" strokeDasharray="3 3" vertical={false} />
            <YAxis
              domain={yDomain}
              width={40}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#dbe4e0" }}
              tickLine={{ stroke: "#dbe4e0" }}
              tickFormatter={(value) =>
                typeof value === "number" ? value.toFixed(value % 1 === 0 ? 0 : 2) : `${value}`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                dot={false}
                strokeWidth={2}
                stroke={line.color}
                strokeDasharray={line.dashed ? "4 3" : undefined}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
