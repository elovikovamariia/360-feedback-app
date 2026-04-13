"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#7c3aed", "#cbd5e1"];

type Props = {
  completed: number;
  total: number;
  className?: string;
};

export function CompletionDonut({ completed, total, className }: Props) {
  const pending = Math.max(0, total - completed);
  const data = [
    { name: "Отправлено", value: completed },
    { name: "Ожидает", value: pending },
  ];

  if (total === 0) {
    return (
      <div className={`flex h-[220px] items-center justify-center text-sm text-slate-500 ${className ?? ""}`}>
        Нет назначений
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return Number.isFinite(n) ? [`${n} анк.`, ""] : ["—", ""];
            }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
          />
          <Legend verticalAlign="bottom" height={28} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-xs font-medium text-slate-500">
        Всего назначено: <span className="text-slate-800">{total}</span>
      </p>
    </div>
  );
}
