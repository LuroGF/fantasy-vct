"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface PlayerStatsGraphProps {
  data: number[];
}

export function PlayerStatsGraph({ data }: PlayerStatsGraphProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-v-white/20 italic text-xs">
        Sin datos suficientes
      </div>
    );
  }

  // Transform array of numbers to array of objects for Recharts
  const chartData = data.map((points, index) => ({
    match: `P${index + 1}`,
    puntos: points
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
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
            width={30}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f1923', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px' }}
            itemStyle={{ color: '#ff4655' }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
          />
          <Line 
            type="monotone" 
            dataKey="puntos" 
            stroke="#ff4655" 
            strokeWidth={2} 
            dot={{ fill: '#0f1923', stroke: '#ff4655', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#ff4655' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
