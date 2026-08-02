"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@rmsm/ui";

export interface SimpleBarChartProps {
  title: string;
  data: { label: string; value: number }[];
  emptyMessage?: string;
  barColor?: string;
}

/** One shared bar-chart shell for the Market Data section's several
 * status-count charts (Provider Availability, Import Timeline, Storage
 * Usage) — the same recharts pattern `PnlChart` (Portfolio) already
 * established, generalized instead of re-implemented per chart. */
export function SimpleBarChart({ title, data, emptyMessage = "No data yet.", barColor = "hsl(var(--primary))" }: SimpleBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
