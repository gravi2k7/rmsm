"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@rmsm/ui";
import type { CumulativePnlPoint } from "../lib/performance";

export function PnlChart({ data }: { data: CumulativePnlPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cumulative Realized P&amp;L</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No closed trades yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Cumulative P&L"]} />
              <Line type="monotone" dataKey="cumulativePnl" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
