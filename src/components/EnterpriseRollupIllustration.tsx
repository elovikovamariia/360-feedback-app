"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatPill } from "@/components/PageChrome";
import {
  ENTERPRISE_ILLUSTRATION_HEADLINE,
  enterpriseCompetencyCompanyRollup,
  enterpriseIllustrationStats,
  enterpriseOthersAvgHistogram,
  enterpriseRiskRollup,
  enterpriseSegmentRollup,
  enterpriseTextThemes,
} from "@/lib/enterprise-scale-illustration";

const barFill = "#6366f1";
const barFillMuted = "#a5b4fc";

export function EnterpriseRollupIllustration({ context }: { context: "cycle" | "reviewee" }) {
  const compGrad = `entComp-${useId().replace(/:/g, "")}`;

  const intro =
    context === "cycle"
      ? "Ниже — учебный макет сводки по компании при полном цикле и крупной выборке. Цифры и распределения придуманы для демонстрации экрана; текущий цикл в системе остаётся своим набором данных."
      : "Учебный макет: как может выглядеть сводка для CHRO и топ-менеджмента, если в том же цикле участвовали бы порядка двух тысяч оцениваемых. Блок не подменяет радар и ИИ-отчёт по выбранному сотруднику ниже.";

  return (
    <section
      className="overflow-hidden rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-slate-50/80 shadow-soft"
      aria-labelledby="enterprise-rollup-heading"
    >
      <div className="border-b border-violet-100/80 bg-violet-600/[0.06] px-5 py-4 sm:px-7">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-900">Иллюстрация масштаба</p>
        <h2 id="enterprise-rollup-heading" className="mt-1 text-lg font-semibold text-slate-900">
          Сводка по компании · {ENTERPRISE_ILLUSTRATION_HEADLINE}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{intro}</p>
      </div>

      <div className="px-5 py-6 sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ключевые показатели (макет)</p>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Ориентир для презентации руководству: заполнение, распределение средних, срезы по блокам и темы из текстовых
            ответов после обезличивания.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatPill label="Оцениваемых" value={enterpriseIllustrationStats.revieweeCount.toLocaleString("ru-RU")} />
            <StatPill label="Анкет (всего)" value={enterpriseIllustrationStats.assignmentTotal.toLocaleString("ru-RU")} />
            <StatPill label="Заполнение" value={`${enterpriseIllustrationStats.completionPct}%`} />
            <StatPill label="Ср. окружение" value={String(enterpriseIllustrationStats.companyOthersAvg)} />
            <StatPill label="Ср. самооценка" value={String(enterpriseIllustrationStats.companySelfAvg)} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Расхождение self vs others</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-violet-900">
              {enterpriseIllustrationStats.strongGapSharePct}%
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Оцениваемых с заметным разрывом (|я − окружение| ≥ 0,5) — повод для калибровки и 1:1.
            </p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Сигналы эвристик HR</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              <span className="text-red-700">Внимание: {enterpriseIllustrationStats.heuristicAlerts}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-amber-800">Проверить: {enterpriseIllustrationStats.heuristicWatch}</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Условные флаги по шкале и ролям — в продукте настраиваются пороги и маршрутизация к People Partner.
            </p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Текстовый слой</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {Math.round(enterpriseIllustrationStats.assignmentCompleted * 0.85).toLocaleString("ru-RU")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Условное число развёрнутых комментариев, ушедших в конвейер обезличивания и тематического тегирования.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Распределение средних «окружение» по людям</h3>
            <p className="mt-1 text-xs text-slate-500">Гистограмма по оцениваемым (шкала 1–5, агрегат по ролям).</p>
            <div className="mt-4 h-[260px] w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enterpriseOthersAvgHistogram} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-18} dy={8} height={48} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [`${v} чел.`, "Оцениваемых"]}
                    labelFormatter={(l) => `Среднее окружения ${l}`}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {enterpriseOthersAvgHistogram.map((row, i) => (
                      <Cell key={row.range} fill={i >= 3 ? barFill : barFillMuted} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Средние по компетенциям (окружение)</h3>
            <p className="mt-1 text-xs text-slate-500">Столбцы — среднее по компании; подпись — типичный разброс (p25–p75).</p>
            <div className="mt-4 h-[260px] w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={enterpriseCompetencyCompanyRollup}
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[2.8, 4.2]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={108}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(t) => (t.length > 16 ? `${t.slice(0, 14)}…` : t)}
                  />
                  <Tooltip
                    formatter={(_value, _name, item) => {
                      const p = item?.payload as { p25?: number; p75?: number; mean?: number };
                      return [`${p.mean?.toFixed(2)} (p25–p75: ${p.p25}–${p.p75})`, "По компании"];
                    }}
                    labelFormatter={(_l, payload) => (payload?.[0]?.payload as { title?: string })?.title ?? ""}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="mean" fill={`url(#${compGrad})`} radius={[0, 8, 8, 0]} maxBarSize={22} />
                  <defs>
                    <linearGradient id={compGrad} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Срезы по блокам</h3>
            <p className="mt-1 text-xs text-slate-500">Условная оргструктура: люди в выборке, заполнение, среднее окружения.</p>
            <div className="table-scroll mt-4 rounded-xl border border-slate-100">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Блок</th>
                    <th className="px-4 py-2">Оцениваемых</th>
                    <th className="px-4 py-2">Заполнение</th>
                    <th className="px-4 py-2">Ср. окр.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enterpriseSegmentRollup.map((row) => (
                    <tr key={row.name} className="bg-white/80">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">{row.reviewees.toLocaleString("ru-RU")}</td>
                      <td className="px-4 py-2.5 tabular-nums text-brand-800">{row.completionPct}%</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-800">{row.othersAvg.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900">Темы из текстов (после обезличивания)</h3>
            <p className="mt-1 text-xs text-slate-500">Частота упоминаний в макете — не из вашей базы.</p>
            <ul className="mt-4 space-y-3">
              {enterpriseTextThemes.map((t) => (
                <li
                  key={t.theme}
                  className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900">{t.theme}</span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-violet-800">
                      ≈ {t.mentions.toLocaleString("ru-RU")}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{t.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-amber-100/90 bg-amber-50/40 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-amber-950">Сигналы рисков (агрегат по людям в макете)</h3>
          <p className="mt-1 text-xs text-amber-900/90">
            Пример того, как HR видит счётчики по категориям после скоринга текстов и шкалы — без персональных данных в
            этом блоке.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {enterpriseRiskRollup.map((r) => (
              <li
                key={r.category}
                className="rounded-xl border border-amber-200/60 bg-white/80 px-3 py-3 text-sm text-amber-950 shadow-sm"
              >
                <p className="font-semibold leading-snug">{r.category}</p>
                <p className="mt-2 text-xs text-amber-900/90">
                  Высокий: <strong>{r.levelHigh}</strong>
                  <br />
                  Средний: <strong>{r.levelMed}</strong>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
