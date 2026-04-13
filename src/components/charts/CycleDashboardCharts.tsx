"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CompletionDonut } from "./CompletionDonut";

type RevieweeRow = { name: string; completionRate: number };

export function CycleDashboardCharts({
  completed,
  total,
  reviewees,
}: {
  completed: number;
  total: number;
  reviewees: RevieweeRow[];
}) {
  const gradId = `barGrad-${useId().replace(/:/g, "")}`;
  const barData = reviewees.map((r) => ({
    name: r.name.length > 14 ? `${r.name.slice(0, 12)}…` : r.name,
    full: r.name,
    Заполнение: r.completionRate,
  }));

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-12">
      <div className="card p-5 shadow-soft lg:col-span-4">
        <h3 className="text-sm font-bold text-slate-900">Статус анкет</h3>
        <p className="mt-1 text-xs text-slate-500">Кольцевая диаграмма по циклу</p>
        <CompletionDonut completed={completed} total={total} className="mt-2" />
      </div>
      <div className="card p-5 shadow-soft lg:col-span-8">
        <h3 className="text-sm font-bold text-slate-900">Прогресс по оцениваемым</h3>
        <p className="mt-1 text-xs text-slate-500">Горизонтальные столбцы, % заполнения</p>
        <div className="mt-4 h-[min(200px,40vh)] w-full min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={barData} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return Number.isFinite(n) ? [`${n}%`, "Заполнение"] : ["—", "Заполнение"];
                }}
                labelFormatter={(_, payload) => (payload?.[0]?.payload as { full?: string })?.full ?? ""}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="Заполнение" fill={`url(#${gradId})`} radius={[0, 8, 8, 0]} maxBarSize={22} />
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
