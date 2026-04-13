"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { useRolePreview } from "@/components/RolePreviewProvider";
import { ChartTabs } from "@/components/charts/ChartTabs";
import { CompetencyBarCompare } from "@/components/charts/CompetencyBarCompare";
import { CompletionDonut } from "@/components/charts/CompletionDonut";
import { ResultsRadar, type RadarRow } from "@/components/ResultsRadar";

type Summary = {
  cycle: { id: string; name: string };
  reviewee: { id: string; name: string };
  completion: { completed: number; total: number; completionRate: number };
  radar: RadarRow[];
  viewerMode?: "full" | "scores_only";
};

type AiReport = {
  summary: string;
  themes: string[];
  patterns: string[];
  strengths: string[];
  growth: string[];
  contradictions: string[];
  recommendations: string[];
};

function SkeletonBlock() {
  return (
    <div className="card space-y-4 p-8">
      <div className="h-6 w-1/3 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

function ListBlock({ items, variant }: { items: string[]; variant: "default" | "success" | "warning" }) {
  const border =
    variant === "success"
      ? "border-l-emerald-500"
      : variant === "warning"
        ? "border-l-amber-500"
        : "border-l-brand-500";
  return (
    <ul className={`space-y-3 border-l-2 ${border} pl-4`}>
      {items.map((t) => (
        <li key={t} className="text-sm leading-relaxed text-slate-700">
          {t}
        </li>
      ))}
    </ul>
  );
}

export function ResultsClient({ revieweeId, cycleId }: { revieweeId: string; cycleId: string }) {
  const { role } = useRolePreview();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiReport | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [chartView, setChartView] = useState<"radar" | "bars">("radar");

  const qs = useMemo(() => new URLSearchParams({ cycleId }), [cycleId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reviewees/${revieweeId}/summary?${qs.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Ошибка загрузки");
        if (!cancelled) setSummary(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revieweeId, qs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/reviewees/${revieweeId}/ai?${qs.toString()}`);
      const json = await res.json();
      if (!cancelled && json.report) {
        setAi(json.report);
        setAiModel(json.model ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revieweeId, qs]);

  async function regenerate() {
    setLoadingAi(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviewees/${revieweeId}/ai?${qs.toString()}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка AI");
      setAi(json.report);
      setAiModel(json.model ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingAi(false);
    }
  }

  if (error && !summary) {
    return (
      <div className="card border-red-200/80 bg-red-50/50 p-8 text-center">
        <p className="font-semibold text-red-900">{error}</p>
        <Link href={role === "hr_admin" ? "/hr" : "/reports"} className="btn-secondary mt-6 inline-flex">
          {role === "hr_admin" ? "В HR-панель" : "К отчётам"}
        </Link>
      </div>
    );
  }
  if (!summary) {
    return <SkeletonBlock />;
  }

  const pct = summary.completion.completionRate;
  const scoresOnly = summary.viewerMode === "scores_only";
  const hubHref = role === "hr_admin" ? "/hr" : "/reports";
  const hubLabel = role === "hr_admin" ? "Циклы 360°" : "Отчёты";
  const crumbs =
    role === "hr_admin"
      ? [
          { href: "/hr" as const, label: "Циклы 360°" },
          { href: `/hr/cycles/${summary.cycle.id}` as const, label: "Цикл" },
          { label: "Результаты" as const },
        ]
      : [
          { href: "/reports" as const, label: "Отчёты" },
          { label: "Результаты" as const },
        ];

  return (
    <div className="space-y-10">
      {scoresOnly ? (
        <div className="rounded-2xl border border-brand-200/80 bg-brand-50/60 px-4 py-3 text-sm text-brand-950 sm:px-5">
          <strong className="font-semibold">Просмотр о вас.</strong> Сырые текстовые комментарии респондентов на
          странице не показываются. Ниже в блоке «AI-отчёт» модель обрабатывает полный текст на сервере и выдаёт
          обезличенную сводку тем и рекомендаций — так обычно делают в корпоративных сервисах 360°.
        </div>
      ) : null}
      <Breadcrumbs items={crumbs} />

      <PageHero
        kicker="360° · результаты"
        title={summary.reviewee.name}
        description={summary.cycle.name}
      >
        <StatPill label="Заполнение анкет" value={`${pct}%`} />
        <StatPill
          label="Отправлено"
          value={`${summary.completion.completed}/${summary.completion.total}`}
        />
        <Link href={hubHref} className="btn-secondary self-center">
          ← {hubLabel}
        </Link>
      </PageHero>

      <section className="card overflow-hidden shadow-soft">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Визуализация компетенций</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Радар или столбцы — средние по группам. Переключатель ниже.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:flex-col lg:items-end">
              <ChartTabs
                tabs={[
                  { id: "radar", label: "Радар" },
                  { id: "bars", label: "Столбцы" },
                ]}
                active={chartView}
                onChange={(id) => setChartView(id as "radar" | "bars")}
              />
              <div className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-slate-200/80 sm:px-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Анкеты</span>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200 sm:w-36">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums text-brand-900">
                  {pct}%
                  <span className="ml-1 text-xs font-medium text-slate-500">
                    ({summary.completion.completed}/{summary.completion.total})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_min(260px,100%)] lg:items-start">
          <div className="min-h-[320px] min-w-0 transition-opacity duration-300">
            {chartView === "radar" ? (
              <ResultsRadar data={summary.radar} />
            ) : (
              <CompetencyBarCompare data={summary.radar} />
            )}
          </div>
          <div className="card rounded-2xl border border-slate-100 bg-slate-50/40 p-4 ring-1 ring-slate-100/80">
            <h3 className="text-center text-xs font-bold uppercase tracking-wide text-slate-600">Заполнение цикла</h3>
            <CompletionDonut completed={summary.completion.completed} total={summary.completion.total} />
          </div>
        </div>
      </section>

      <section className="card overflow-hidden shadow-soft">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-br from-brand-50/50 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI-отчёт</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              {scoresOnly
                ? "Вы не видите исходные формулировки — только эту сводку. На сервере по-прежнему используется полный текст ответов для извлечения тем и мягких рекомендаций."
                : "Тексты от респондентов обрабатываются на сервере в обезличенном виде: из них собираются темы и формулировки без привязки к конкретному автору. Рекомендации носят развивающий характер."}
            </p>
            {aiModel && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Модель: <span className="font-mono text-slate-700">{aiModel}</span>
              </p>
            )}
          </div>
          <button type="button" onClick={regenerate} disabled={loadingAi} className="btn-primary min-h-[44px] px-6">
            {loadingAi ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Генерация…
              </span>
            ) : ai ? (
              "Перегенерировать"
            ) : (
              "Сгенерировать отчёт"
            )}
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          {!ai && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
              <p className="font-medium text-slate-800">Отчёт ещё не сформирован</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Нажмите «Сгенерировать отчёт». При настроенном API-ключе подключится языковая модель; иначе — демо-текст
                с той же структурой.
              </p>
            </div>
          )}

          {ai && (
            <div className="space-y-8">
              <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-6">
                <h3 className="text-xs font-bold uppercase tracking-wide text-brand-800">Резюме</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-800">{ai.summary}</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
                  <h3 className="text-sm font-bold text-slate-900">Темы</h3>
                  <div className="mt-4">
                    <ListBlock items={ai.themes} variant="default" />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
                  <h3 className="text-sm font-bold text-slate-900">Повторяющиеся паттерны</h3>
                  <div className="mt-4">
                    <ListBlock items={ai.patterns} variant="default" />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-6">
                  <h3 className="text-sm font-bold text-emerald-900">Сильные стороны</h3>
                  <div className="mt-4">
                    <ListBlock items={ai.strengths} variant="success" />
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-6">
                  <h3 className="text-sm font-bold text-amber-950">Зоны роста</h3>
                  <div className="mt-4">
                    <ListBlock items={ai.growth} variant="warning" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                <h3 className="text-sm font-bold text-slate-900">Противоречия и расхождения</h3>
                <div className="mt-4">
                  <ListBlock items={ai.contradictions} variant="default" />
                </div>
              </div>

              <div className="rounded-2xl border border-brand-200/60 bg-white p-6">
                <h3 className="text-sm font-bold text-slate-900">Рекомендации</h3>
                <ol className="mt-4 space-y-3">
                  {ai.recommendations.map((t, i) => (
                    <li
                      key={t}
                      className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed text-slate-800"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
