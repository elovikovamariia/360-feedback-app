"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type RadarRow = {
  competency: string;
  self?: number;
  manager?: number;
  peer?: number;
  subordinate?: number;
};

export function ResultsRadar({ data }: { data: RadarRow[] }) {
  return (
    <div className="h-[min(400px,78vw)] w-full min-h-[260px] min-w-0 sm:min-h-[300px] md:h-[min(440px,70vw)] md:min-h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%" margin={{ top: 8, right: 14, bottom: 8, left: 14 }}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="competency"
            tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
          />
          <Radar name="Самооценка" dataKey="self" stroke="#7c3aed" strokeWidth={2} fill="#7c3aed" fillOpacity={0.12} />
          <Radar name="Руководитель" dataKey="manager" stroke="#2563eb" strokeWidth={2} fill="#2563eb" fillOpacity={0.1} />
          <Radar name="Коллеги" dataKey="peer" stroke="#059669" strokeWidth={2} fill="#059669" fillOpacity={0.1} />
          <Radar name="Подчинённые" dataKey="subordinate" stroke="#ea580c" strokeWidth={2} fill="#ea580c" fillOpacity={0.1} />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} iconType="circle" />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 40px rgba(15,23,42,0.08)",
            }}
            formatter={(v) => (typeof v === "number" ? `${v.toFixed(1)} / 5` : "—")}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
