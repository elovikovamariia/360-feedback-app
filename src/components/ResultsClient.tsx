"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { appFetch } from "@/lib/app-fetch";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { useRolePreview } from "@/components/RolePreviewProvider";
import { ChartTabs } from "@/components/charts/ChartTabs";
import { CompetencyBarCompare } from "@/components/charts/CompetencyBarCompare";
import { CompletionDonut } from "@/components/charts/CompletionDonut";
import { ResultsRadar, type RadarRow } from "@/components/ResultsRadar";
import { normalizeStoredAiReport, type AiReportShape } from "@/lib/ai-report";
import { EnterpriseRollupIllustration } from "@/components/EnterpriseRollupIllustration";
import { hrCycleDetailHref } from "@/lib/hr-cycle-route";

type Summary = {
  cycle: { id: string; name: string };
  reviewee: { id: string; name: string };
  completion: { completed: number; total: number; completionRate: number };
  radar: RadarRow[];
  viewerMode?: "full" | "scores_only";
  selfAvg?: number | null;
  othersAvg?: number | null;
};

type TimelineItem = {
  cycleId: string;
  cycleName: string;
  createdAt: string;
  endsAt: string | null;
  completionRate: number;
  selfAvg: number | null;
  othersAvg: number | null;
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

const riskCategoryRu: Record<AiReportShape["riskSignals"][number]["category"], string> = {
  burnout: "Выгорание / перегруз",
  trust: "Доверие в команде",
  leadership: "Лидерство",
  conflict: "Конфликтность",
  demotivation: "Демотивация",
  other: "Прочее",
};

function SentimentBadge({ s }: { s: AiReportShape["textAnalysis"]["sentiment"] }) {
  const map: Record<typeof s, { label: string; className: string }> = {
    positive: { label: "Позитивная", className: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
    mixed: { label: "Смешанная", className: "bg-slate-100 text-slate-800 ring-slate-200" },
    negative: { label: "Напряжённая", className: "bg-amber-50 text-amber-950 ring-amber-200" },
    neutral: { label: "Нейтральная", className: "bg-slate-50 text-slate-700 ring-slate-200" },
  };
  const x = map[s];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${x.className}`}>{x.label}</span>
  );
}

function HrAiReportV2({ report }: { report: AiReportShape }) {
  const ins = report.insights;
  const txt = report.textAnalysis;
  const bench = report.benchmarking;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-brand-800">1. Инсайты по оценкам</h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-800">
          <div className="rounded-xl border border-white/80 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Самооценка vs окружение</p>
            <p className="mt-2">{ins.selfVsOthers.interpretation}</p>
            <p className="mt-2 tabular-nums text-slate-700">
              Я: <strong>{ins.selfVsOthers.selfAvg ?? "—"}</strong> · Окружение:{" "}
              <strong>{ins.selfVsOthers.othersAvg ?? "—"}</strong>
              {ins.selfVsOthers.delta != null ? (
                <>
                  {" "}
                  · Δ (я − другие): <strong>{ins.selfVsOthers.delta > 0 ? "+" : ""}
                  {ins.selfVsOthers.delta}</strong>
                </>
              ) : null}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">«Слепые зоны»</p>
            <div className="mt-2">
              <ListBlock items={ins.blindSpots} variant="warning" />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5">
              <h4 className="text-sm font-bold text-emerald-900">Топ-3 сильных компетенции (по окружению)</h4>
              <ul className="mt-3 space-y-3">
                {ins.topStrengths.map((x) => (
                  <li key={x.competency} className="text-sm text-slate-800">
                    <span className="font-semibold text-emerald-950">{x.competency}</span>
                    <span className="block text-xs text-slate-600">{x.scoreContext}</span>
                    <span className="mt-1 block text-slate-700">{x.evidence}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5">
              <h4 className="text-sm font-bold text-amber-950">Топ-3 зоны развития (по окружению)</h4>
              <ul className="mt-3 space-y-3">
                {ins.topDevelopment.map((x) => (
                  <li key={x.competency} className="text-sm text-slate-800">
                    <span className="font-semibold text-amber-950">{x.competency}</span>
                    <span className="block text-xs text-slate-600">{x.scoreContext}</span>
                    <span className="mt-1 block text-slate-700">{x.evidence}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Противоречия между ролями</p>
            <div className="mt-2">
              <ListBlock items={ins.crossRoleContradictions} variant="default" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">2. Анализ текста</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-800">{txt.narrativeSummary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-500">Тональность:</span>
          <SentimentBadge s={txt.sentiment} />
          <span className="text-xs text-slate-600">{txt.sentimentRationale}</span>
        </div>
        <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs leading-relaxed text-slate-600">
          {txt.moderationNote}
        </p>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Повторяющиеся темы</p>
          <div className="mt-2">
            <ListBlock items={txt.recurringThemes} variant="default" />
          </div>
        </div>
        {txt.anonymousQuotes.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Анонимные ключевые цитаты (обобщённые)
            </p>
            <ul className="mt-3 space-y-3">
              {txt.anonymousQuotes.map((q, i) => (
                <li
                  key={i}
                  className="border-l-2 border-brand-400 pl-4 text-sm italic leading-relaxed text-slate-700"
                >
                  {q.text}
                  <span className="mt-1 block text-xs font-medium not-italic text-slate-500">Тема: {q.themeTag}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-slate-50/40 p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">3. Бенчмаркинг</h3>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">К компании (цикл)</h4>
            <p className="mt-2 text-2xl font-bold tabular-nums text-brand-800">
              {bench.vsCompany.overallDelta != null
                ? `${bench.vsCompany.overallDelta > 0 ? "+" : ""}${bench.vsCompany.overallDelta}`
                : "—"}
            </p>
            <p className="text-xs text-slate-600">Δ среднего окружения vs среднее по компании в этом цикле</p>
            <p className="mt-2 text-xs text-slate-500">{bench.vsCompany.footnote}</p>
          </div>
          <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">К когорте должности</h4>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {bench.vsJobTitle.overallDelta != null
                ? `${bench.vsJobTitle.overallDelta > 0 ? "+" : ""}${bench.vsJobTitle.overallDelta}`
                : "—"}
            </p>
            <p className="text-xs text-slate-600">N в когорте: {bench.vsJobTitle.cohortN}</p>
            <p className="mt-2 text-xs text-slate-500">{bench.vsJobTitle.footnote}</p>
          </div>
          <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">К прошлому циклу</h4>
            {bench.vsPreviousCycle ? (
              <>
                <p className="mt-1 text-xs font-medium text-slate-600">{bench.vsPreviousCycle.cycleName}</p>
                <p className="mt-2 text-sm tabular-nums text-slate-800">
                  Δ самооценки:{" "}
                  <strong>
                    {bench.vsPreviousCycle.selfDelta != null
                      ? `${bench.vsPreviousCycle.selfDelta > 0 ? "+" : ""}${bench.vsPreviousCycle.selfDelta}`
                      : "—"}
                  </strong>
                </p>
                <p className="mt-1 text-sm tabular-nums text-slate-800">
                  Δ окружения:{" "}
                  <strong>
                    {bench.vsPreviousCycle.othersDelta != null
                      ? `${bench.vsPreviousCycle.othersDelta > 0 ? "+" : ""}${bench.vsPreviousCycle.othersDelta}`
                      : "—"}
                  </strong>
                </p>
                <p className="mt-2 text-xs text-slate-500">{bench.vsPreviousCycle.footnote}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Нет предыдущего цикла в данных для сравнения.</p>
            )}
          </div>
        </div>
        {bench.vsCompany.byCompetency.length > 0 ? (
          <div className="table-scroll mt-6 rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Компетенция</th>
                  <th className="px-4 py-2">Δ vs компания</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bench.vsCompany.byCompetency.map((row) => (
                  <tr key={row.competency}>
                    <td className="px-4 py-2 font-medium text-slate-900">{row.competency}</td>
                    <td className="px-4 py-2 tabular-nums text-slate-700">
                      {row.othersDelta != null ? (
                        <span className={row.othersDelta >= 0 ? "text-emerald-800" : "text-amber-900"}>
                          {row.othersDelta > 0 ? "+" : ""}
                          {row.othersDelta}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-amber-100/80 bg-amber-50/20 p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-amber-950">4. Сигналы рисков (для HRBP)</h3>
        <p className="mt-2 text-xs leading-relaxed text-amber-950/90">
          Не являются диагнозом или дисциплинарным основанием. Используйте как повод для уточняющих разговоров и
          политики эскалации.
        </p>
        <ul className="mt-4 space-y-4">
          {report.riskSignals.map((r, i) => (
            <li
              key={i}
              className={`rounded-xl border p-4 ${
                r.level === "high"
                  ? "border-red-200 bg-red-50/60"
                  : r.level === "medium"
                    ? "border-amber-200 bg-white/80"
                    : "border-slate-200 bg-white/80"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <span>{riskCategoryRu[r.category]}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                  {r.level}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900">{r.signal}</p>
              <p className="mt-2 text-sm text-slate-700">{r.suggestedHrAction}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-brand-200/60 bg-white p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">5. Рекомендации и план на 90 дней</h3>
        <div className="mt-5 space-y-5">
          {report.recommendations.plan90Days.map((p) => (
            <div key={p.period} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-sm font-bold text-brand-900">
                {p.period}: {p.focus}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {p.milestones.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Конкретные действия</h4>
            <div className="mt-3">
              <ListBlock items={report.recommendations.concreteActions} variant="default" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Для руководителя</h4>
            <div className="mt-3">
              <ListBlock items={report.recommendations.forManager} variant="default" />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-bold text-slate-900">Обучение и коучинг</h4>
          <div className="mt-3">
            <ListBlock items={report.recommendations.learningAndCoaching} variant="success" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function ResultsClient({ revieweeId, cycleId }: { revieweeId: string; cycleId: string }) {
  const { role } = useRolePreview();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiReportShape | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [chartView, setChartView] = useState<"radar" | "bars">("radar");
  const [timeline, setTimeline] = useState<TimelineItem[] | null>(null);
  const [agentStatus, setAgentStatus] = useState<{
    agentId: string;
    mode: "llm" | "demo";
    configured: boolean;
  } | null>(null);

  const qs = useMemo(() => new URLSearchParams({ cycleId }), [cycleId]);
  const autoAiTriggeredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await appFetch("/api/ai/agent");
        const json = (await res.json()) as {
          agentId?: string;
          mode?: string;
          configured?: boolean;
        };
        if (!cancelled && res.ok && json.agentId) {
          setAgentStatus({
            agentId: json.agentId,
            mode: json.mode === "llm" ? "llm" : "demo",
            configured: Boolean(json.configured),
          });
        }
      } catch {
        if (!cancelled) setAgentStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await appFetch(`/api/reviewees/${revieweeId}/summary?${qs.toString()}`);
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
      const res = await appFetch(`/api/reviewees/${revieweeId}/ai?${qs.toString()}`);
      const json = await res.json();
      if (!cancelled) {
        setAi(json.report ? normalizeStoredAiReport(json.report) : null);
        setAiModel(json.report ? (json.model ?? null) : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revieweeId, qs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await appFetch(`/api/reviewees/${revieweeId}/timeline?limit=6`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Ошибка загрузки динамики");
        if (!cancelled) setTimeline((json.items ?? []) as TimelineItem[]);
      } catch {
        if (!cancelled) setTimeline(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revieweeId]);

  async function regenerate() {
    setLoadingAi(true);
    setError(null);
    try {
      const res = await appFetch(`/api/reviewees/${revieweeId}/ai?${qs.toString()}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка AI");
      const normalized = normalizeStoredAiReport(json.report);
      if (!normalized) throw new Error("Не удалось разобрать отчёт");
      setAi(normalized);
      setAiModel(json.model ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoadingAi(false);
    }
  }

  useEffect(() => {
    if (!summary) return;
    if (autoAiTriggeredRef.current) return;
    if (loadingAi) return;
    if (ai) return;
    if (summary.completion.completionRate !== 100) return;
    autoAiTriggeredRef.current = true;
    void regenerate();
  }, [summary, ai, loadingAi]);

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
  const selfAvg = summary.selfAvg ?? null;
  const othersAvg = summary.othersAvg ?? null;
  const gapSelfOthers =
    selfAvg != null && othersAvg != null ? Math.round((selfAvg - othersAvg) * 10) / 10 : null;
  const timelineDeltaOthers = (() => {
    if (!timeline || timeline.length < 2) return "—";
    const items = [...timeline].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const last = items.at(-1);
    const prev = items.at(-2);
    if (!last || !prev || last.othersAvg == null || prev.othersAvg == null) return "—";
    const d = Math.round((last.othersAvg - prev.othersAvg) * 10) / 10;
    return `${d > 0 ? "+" : ""}${d}`;
  })();
  const hubHref = role === "hr_admin" ? "/hr" : "/reports";
  const hubLabel = role === "hr_admin" ? "Оценка 360" : "Отчёты";
  const crumbs =
    role === "hr_admin"
      ? [
          { href: "/hr" as const, label: "Оценка 360" },
          { href: hrCycleDetailHref(summary.cycle.id), label: "Цикл" },
          { label: "Результаты" as const },
        ]
      : role === "executive"
        ? [
            { href: "/reports" as const, label: "Отчёты" },
            { href: hrCycleDetailHref(summary.cycle.id), label: "Сводка по циклу" },
            { label: "Сотрудник" as const },
          ]
        : [
            { href: "/reports" as const, label: "Отчёты" },
            { label: "Результаты" as const },
          ];

  return (
    <div className="space-y-10">
      {role === "hr_admin" && pct < 100 ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 shadow-soft sm:px-6"
          role="status"
        >
          <p className="text-sm font-semibold text-amber-950">Цикл ещё не завершён</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-950/90">
            Для корректной HR-сводки и калибровки дождитесь отправки всех анкет (сотрудник, коллега, руководитель). Ниже
            данные могут быть неполными.
          </p>
          <Link
            href={hrCycleDetailHref(summary.cycle.id)}
            className="mt-3 inline-flex text-sm font-semibold text-amber-950 underline decoration-amber-800/40 underline-offset-2 hover:decoration-amber-950"
          >
            Вернуться в панель цикла
          </Link>
        </div>
      ) : null}
      {scoresOnly ? (
        <div className="overflow-hidden rounded-2xl border border-brand-200/90 bg-gradient-to-br from-brand-50/90 via-white to-slate-50/80 shadow-soft">
          <div className="border-b border-brand-100/80 bg-brand-600/5 px-4 py-3 sm:px-5">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-900">Ваш персональный отчёт</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Что вы видите как сотрудник</p>
          </div>
          <ul className="space-y-3 px-4 py-4 text-sm leading-relaxed text-slate-700 sm:px-5 sm:py-5">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">
                ✓
              </span>
              <span>
                <strong className="font-medium text-slate-900">Общая оценка и радар</strong> — средние баллы по
                компетенциям с разбивкой «вы / руководитель / коллеги» (и подчинённые, если есть).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                AI
              </span>
              <span>
                <strong className="font-medium text-slate-900">Рекомендации по развитию</strong> — блок с ИИ на основе
                всех комментариев; формулировки обезличены, без цитат «кто именно написал».
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-300 text-xs font-bold text-slate-800">
                —
              </span>
              <span>
                <strong className="font-medium text-slate-900">Тексты коллег и руководителя</strong> на этой странице{" "}
                <strong className="text-slate-900">не показываются</strong> — так принято в корпоративных 360°, чтобы
                сохранить честность обратной связи.
              </span>
            </li>
          </ul>
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

      {(role === "hr_admin" || role === "executive") && pct === 100 ? (
        <EnterpriseRollupIllustration context="reviewee" />
      ) : null}

      {timeline && timeline.length >= 2 ? (
        <section className="card border-slate-100 bg-gradient-to-r from-white to-slate-50/60 p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Динамика оценки</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Быстрый ориентир по последним циклам (самооценка и окружение по шкале 1–5).
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatPill label="Δ окружения к прошлому циклу" value={timelineDeltaOthers} />
            </div>
          </div>
          <div className="table-scroll mt-4 rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Цикл</th>
                  <th className="px-4 py-2">Заполнение</th>
                  <th className="px-4 py-2">Самооценка</th>
                  <th className="px-4 py-2">Окружение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...timeline]
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .map((x) => (
                    <tr key={x.cycleId}>
                      <td className="px-4 py-2 font-medium text-slate-900">{x.cycleName}</td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">{x.completionRate}%</td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">{x.selfAvg ?? "—"}</td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">{x.othersAvg ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="card border-slate-200/90 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Как читать этот отчёт</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            <strong className="font-medium text-slate-800">Методология.</strong> Сначала смотрите заполнение цикла и
            радар по ролям, затем качественный слой (темы, зоны роста). Средние по компетенциям — ориентир для разговора,
            не единственный критерий решений.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Анонимность.</strong> В корпоративной практике комментарии
            респондентов не привязывают к имени в отчёте сотруднику; HR и руководитель работают с обобщёнными формулировками
            и калибровкой.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Самооценка и окружение.</strong> Сравнение средних по шкале
            1–5 помогает увидеть «слепые зоны» и завышенные ожидания — блок ниже дублирует эту линию для быстрого старта
            беседы 1:1.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Блок с ИИ.</strong> Модель агрегирует тексты на сервере и
            возвращает структурированную сводку; при отсутствии API-ключа используется локально сформированный ответ той же структуры. Итоги
            ИИ не заменяют решение руководителя и HR и требуют этической проверки перед включением в ИПР.
          </li>
        </ul>
        {role === "hr_admin" ? (
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-xs leading-relaxed text-brand-950">
            <strong className="font-semibold">Чек-лист HR после цикла:</strong> калибровка расхождений между ролями,
            фиксация тем для обучения, согласование формулировок обратной связи с руководителем, контроль доступа к сырым
            текстам по политике компании.
          </div>
        ) : null}
      </section>

      {gapSelfOthers != null && selfAvg != null && othersAvg != null ? (
        <section className="card flex flex-col gap-4 border-slate-100 bg-gradient-to-r from-slate-50/90 to-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Самооценка и оценка окружения (среднее по циклу)</h2>
            <p className="mt-1 text-xs text-slate-600">
              По всем компетенциям: «Я» против среднего по ролям руководитель, коллеги, подчинённые (если есть).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-6 sm:justify-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Самооценка</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{selfAvg}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Окружение</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-brand-800">{othersAvg}</p>
            </div>
            <div className="min-w-[8rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Разница (я − другие)</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  Math.abs(gapSelfOthers) > 0.4 ? "text-amber-800" : "text-emerald-800"
                }`}
              >
                {gapSelfOthers > 0 ? "+" : ""}
                {gapSelfOthers}
              </p>
              <p className="text-[10px] text-slate-500">
                {Math.abs(gapSelfOthers) > 0.4 ? "Имеет смысл обсудить на 1:1" : "В пределах типичного разброса"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

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
          <div className="order-2 min-h-[280px] min-w-0 transition-opacity duration-300 lg:order-1">
            {chartView === "radar" ? (
              <ResultsRadar data={summary.radar} />
            ) : (
              <CompetencyBarCompare data={summary.radar} />
            )}
          </div>
          <div className="order-1 card rounded-2xl border border-slate-100 bg-slate-50/40 p-4 ring-1 ring-slate-100/80 lg:order-2">
            <h3 className="text-center text-xs font-bold uppercase tracking-wide text-slate-600">Заполнение цикла</h3>
            <CompletionDonut completed={summary.completion.completed} total={summary.completion.total} />
          </div>
        </div>
      </section>

      <section className="card overflow-hidden shadow-soft">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-br from-brand-50/50 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">HR-отчёт с участием ИИ</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              {scoresOnly
                ? "Вы не видите исходные формулировки — только эту сводку. На сервере по-прежнему используется полный текст ответов для извлечения тем и мягких рекомендаций."
                : "Тексты от респондентов обрабатываются на сервере в обезличенном виде: из них собираются темы и формулировки без привязки к конкретному автору. Рекомендации носят развивающий характер."}{" "}
              Структура отчёта соответствует запросам CHRO: инсайты по шкале, анализ текста, бенчмаркинг, сигналы рисков и
              план на 90 дней. Ключ API задаётся только в переменных окружения на сервере (не храните секреты в репозитории).
            </p>
            {agentStatus ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                ИИ-агент{" "}
                <span className="font-mono text-slate-600">{agentStatus.agentId}</span>:{" "}
                <span className={agentStatus.mode === "llm" ? "font-semibold text-emerald-700" : "font-semibold text-amber-800"}>
                  {agentStatus.mode === "llm" ? "режим LLM (ключ в .env)" : "режим без внешнего API (ключ не задан)"}
                </span>
                . Проверка: <span className="font-mono">GET /api/ai/agent</span>
              </p>
            ) : null}
            {aiModel ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Модель отчёта: <span className="font-mono text-slate-700">{aiModel}</span>
              </p>
            ) : null}
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
                Нажмите «Сгенерировать отчёт». При настроенном API-ключе подключится языковая модель; иначе — локальный ответ
                с той же структурой.
              </p>
            </div>
          )}

          {ai && ai.version === 2 ? <HrAiReportV2 report={ai} /> : null}
          {ai && ai.version !== 2 ? (
            <p className="text-sm text-amber-800">Неизвестный формат отчёта. Перегенерируйте сводку.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
