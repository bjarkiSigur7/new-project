"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { shortDate } from "@/lib/format";

type SeatPoint = {
  capturedAt: number;
  totalSeats: number;
  assignedSeats: number;
};

type TipProps = {
  active?: boolean;
  label?: number;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number | string;
    stroke?: string;
    color?: string;
  }>;
};

function ChartTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
      <div className="money mb-1 text-muted-foreground">{shortDate(label)}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: p.stroke ?? p.color }}
            aria-hidden
          />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="money ml-auto pl-4 font-medium">
            {Number(p.value).toLocaleString("en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

function LegendKey({
  color,
  dashed,
  label,
}: {
  color: string;
  dashed?: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="18" height="6" aria-hidden>
        <line
          x1="0"
          y1="3"
          x2="18"
          y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "4 3" : undefined}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}

/**
 * Licensed vs assigned seats over the nightly snapshots.
 * Renders only with >= 2 points; one snapshot isn't a trend.
 */
export function SeatHistoryChart({ history }: { history: SeatPoint[] }) {
  if (history.length < 2) {
    return (
      <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        History builds up after a few nightly syncs.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
        <LegendKey color="var(--chart-1)" label="Licensed seats" />
        <LegendKey color="var(--chart-2)" dashed label="Assigned seats" />
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart
          data={history}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeWidth={1}
            vertical={false}
          />
          <XAxis
            dataKey="capturedAt"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => shortDate(ts)}
            tick={{
              fontSize: 11,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
            tickLine={false}
            axisLine={false}
            minTickGap={48}
          />
          <YAxis
            width={40}
            allowDecimals={false}
            tickFormatter={(n: number) => n.toLocaleString("en-US")}
            tick={{
              fontSize: 11,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ChartTip />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="totalSeats"
            name="Licensed seats"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="var(--chart-1)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          />
          <Area
            type="monotone"
            dataKey="assignedSeats"
            name="Assigned seats"
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="transparent"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
