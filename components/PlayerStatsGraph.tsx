"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PlayerStatsGraphProps {
  data: number[];
}

export function PlayerStatsGraph({ data }: PlayerStatsGraphProps) {
  if (!data?.length) return null;

  const chartData = data.map((points, index) => ({
    match: `P${index + 1}`,
    puntos: points,
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.06)"
          />
          <XAxis
            dataKey="match"
            stroke="rgba(255,255,255,0.3)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            formatter={(value) => [`${value} pts`, "Fantasy"]}
            contentStyle={{
              backgroundColor: "#111111",
              borderColor: "rgba(214,178,94,0.35)",
              color: "#ffffff",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#f0d58a" }}
            labelStyle={{ color: "rgba(255,255,255,0.55)" }}
          />
          <Line
            type="monotone"
            dataKey="puntos"
            stroke="#d6b25e"
            strokeWidth={2.5}
            dot={{ fill: "#111111", stroke: "#d6b25e", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#f0d58a", stroke: "#d6b25e" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
