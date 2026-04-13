"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RadarRow } from "@/components/ResultsRadar";

type Props = { data: RadarRow[]; className?: string };

export function CompetencyBarCompare({ data, className }: Props) {
  const chartData = data.map((row) => ({
    name: row.competency.length > 22 ? `${row.competency.slice(0, 20)}…` : row.competency,
    Самооценка: row.self,
    Руководитель: row.manager,
    Коллеги: row.peer,
    Подчинённые: row.subordinate,
  }));

  return (
    <div className={`h-[min(380px,55vh)] w-full min-h-[280px] ${className ?? ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 56 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-22} textAnchor="end" height={70} />
          <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 11, fill: "#94a3b8" }} width={28} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 8px 30px rgba(15,23,42,0.08)" }}
            formatter={(value) => {
              if (value == null || value === "") return "—";
              const n = typeof value === "number" ? value : Number(value);
              return Number.isFinite(n) ? n.toFixed(1) : "—";
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} iconType="circle" />
          <Bar dataKey="Самооценка" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar dataKey="Руководитель" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar dataKey="Коллеги" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar dataKey="Подчинённые" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
