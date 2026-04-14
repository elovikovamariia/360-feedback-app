"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CycleDashboardCharts } from "@/components/charts/CycleDashboardCharts";
import { HrCycleDeleteButton } from "@/components/HrCycleDeleteButton";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { RoleGuardAny } from "@/components/RoleGuard";
import { EnterpriseRollupIllustration } from "@/components/EnterpriseRollupIllustration";
import { useRolePreview } from "@/components/RolePreviewProvider";
import { appFetch } from "@/lib/app-fetch";
import type { Hr360ReportPayload, HrAnomalySeverity } from "@/lib/cycle-hr-insights";

const relLabel: Record<string, string> = {
  SELF: "Самооценка",
  MANAGER: "Руководитель",
  PEER: "Коллега",
  SUBORDINATE: "Подчинённый",
};

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });

function formatPeriod(startsAt: string | Date | null | undefined, endsAt: string | Date | null | undefined) {
  if (!startsAt || !endsAt) return null;
  const s = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const e = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return `${dateFmt.format(s)} — ${dateFmt.format(e)}`;
}

type ApiPayload = {
  cycle: {
    id: string;
    name: string;
    startsAt: string | null;
    endsAt: string | null;
    semesterPeriodStartsAt?: string | null;
    semesterPeriodEndsAt?: string | null;
    scopeType: string;
    scopedDirections: { direction: { id: string; num: number; name: string } }[];
  };
  reviewees: { id: string; name: string; completed: number; total: number; completionRate: number }[];
  directionBreakdown: {
    directionId: string;
    directionNum: number;
    directionName: string;
    employeesInOrg: number;
    assignmentsInCycle: number;
    assignmentsDone: number;
    completionRate: number;
  }[];
  otherCycles: { id: string; name: string }[];
  allCycles?: { id: string; name: string }[];
  assignments: {
    id: string;
    revieweeId: string;
    revieweeName: string;
    reviewerId: string;
    reviewerName: string;
    relationship: string;
    submittedAt: string | null;
    inviteToken: string;
  }[];
  hr360Report?: Hr360ReportPayload;
};

export function HrCycleDetailPageClient({ id }: { id: string }) {
  const { role } = useRolePreview();
  const router = useRouter();
  /** false = загрузка, null = 404 */
  const [data, setData] = useState<ApiPayload | false | null>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setData(false);
    try {
      const res = await appFetch(`/api/cycles/${id}`);
      if (res.status === 404) {
        setData(null);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as ApiPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setData(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <RoleGuardAny anyOf={["hr_cycles", "company_rollups"]}>
        <div className="card border-red-200 bg-red-50/80 p-6 text-sm text-red-900">Ошибка: {error}</div>
      </RoleGuardAny>
    );
  }

  if (data === false) {
    return (
      <RoleGuardAny anyOf={["hr_cycles", "company_rollups"]}>
        <div className="card p-10 text-center text-slate-600">Загрузка…</div>
      </RoleGuardAny>
    );
  }

  if (data === null) {
    return (
      <RoleGuardAny anyOf={["hr_cycles", "company_rollups"]}>
        <div className="card p-10 text-center">
          <p className="text-slate-600">Цикл не найден.</p>
          <Link
            href={role === "executive" ? "/reports" : "/hr"}
            className="btn-primary mt-6 inline-flex"
          >
            {role === "executive" ? "К отчётам" : "К списку циклов"}
          </Link>
        </div>
      </RoleGuardAny>
    );
  }

  const { cycle } = data;
  const completedAll = data.assignments.filter((a) => a.submittedAt).length;
  const totalAll = data.assignments.length;
  const revieweeChartRows = data.reviewees.map((r) => ({ name: r.name, completionRate: r.completionRate }));
  const collectionLine = formatPeriod(cycle.startsAt, cycle.endsAt);
  const semesterLine = formatPeriod(cycle.semesterPeriodStartsAt, cycle.semesterPeriodEndsAt);
  const dirs = [...cycle.scopedDirections].map((s) => s.direction).sort((a, b) => a.num - b.num);
  const scopeLine =
    cycle.scopeType !== "DIRECTIONS" || cycle.scopedDirections.length === 0
      ? "Вся компания"
      : `Направления: ${dirs.map((d) => d.num).join(", ")}`;

  const cycleFullyDone = totalAll > 0 && completedAll === totalAll;
  const revieweesAll100 = data.reviewees.length > 0 && data.reviewees.every((r) => r.completionRate === 100);
  const pctAll = totalAll ? Math.round((completedAll / totalAll) * 100) : 0;
  const pendingCount = totalAll - completedAll;
  const hrReport = data.hr360Report ?? {
    ready: false,
    completedAssignments: completedAll,
    totalAssignments: totalAll,
    reviewees: [],
  };
  const aggregatedSignals =
    hrReport?.ready && hrReport.reviewees.length > 0
      ? hrReport.reviewees.flatMap((r) =>
          r.anomalies.map((a) => ({
            ...a,
            revieweeName: r.revieweeName,
          })),
        )
      : [];
  const severityOrder: Record<HrAnomalySeverity, number> = { alert: 0, watch: 1, info: 2 };
  aggregatedSignals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const cycleOptions = data.allCycles?.length ? data.allCycles : [{ id: cycle.id, name: cycle.name }];
  const hubHref = role === "executive" ? "/reports" : "/hr";
  const hubLabel = role === "executive" ? "Отчёты" : "Оценка 360";
  const withSelf = hrReport.ready ? hrReport.reviewees.filter((r) => r.selfAvg != null) : [];
  const withOthers = hrReport.ready ? hrReport.reviewees.filter((r) => r.othersAvg != null) : [];
  const companySelfAvg =
    withSelf.length > 0
      ? Math.round((withSelf.reduce((s, r) => s + r.selfAvg!, 0) / withSelf.length) * 10) / 10
      : null;
  const companyOthersAvg =
    withOthers.length > 0
      ? Math.round((withOthers.reduce((s, r) => s + r.othersAvg!, 0) / withOthers.length) * 10) / 10
      : null;
  const companyGap =
    companySelfAvg != null && companyOthersAvg != null
      ? Math.round((companySelfAvg - companyOthersAvg) * 10) / 10
      : null;

  function severityBadgeClass(s: HrAnomalySeverity) {
    if (s === "alert") return "bg-red-50 text-red-900 ring-red-200";
    if (s === "watch") return "bg-amber-50 text-amber-950 ring-amber-200";
    return "bg-slate-50 text-slate-700 ring-slate-200";
  }

  return (
    <RoleGuardAny anyOf={["hr_cycles", "company_rollups"]}>
      <div className="space-y-10">
        <Breadcrumbs
          items={[
            { href: "/", label: "Главная" },
            { href: hubHref, label: hubLabel },
            { label: cycle.name },
          ]}
        />
        <PageHero
          kicker={role === "executive" ? "Цикл · сводка для руководства" : "Цикл · сбор и назначения"}
          title={cycle.name}
          description={`${
            semesterLine ? `Период полугодия: ${semesterLine}. ` : ""
          }${collectionLine ? `Сбор оценок 360°: ${collectionLine}. ` : ""}Охват: ${scopeLine}. ${
            role === "executive"
              ? "Ниже — обобщённые показатели по компании в рамках этого цикла и переход к сводке по каждому оцениваемому."
              : "Назначения (самооценка, руководитель, один коллега из команды) создаются при запуске цикла по оргструктуре; ниже — ссылки на анкеты и статус заполнения."
          }`}
        >
          <StatPill label="Анкет отправлено" value={`${completedAll}/${totalAll}`} />
          <StatPill label="Оцениваемых" value={data.reviewees.length} />
          <Link href={hubHref} className="btn-secondary self-center">
            ← {hubLabel}
          </Link>
          {role === "hr_admin" ? (
            <HrCycleDeleteButton
              cycleId={cycle.id}
              cycleName={cycle.name}
              redirectTo="/hr"
              className="self-center"
              onDeleted={() => void load()}
            />
          ) : null}
        </PageHero>

        <section
          className="rounded-2xl border border-brand-100/90 bg-gradient-to-r from-brand-50/50 to-white p-4 shadow-soft sm:p-5"
          aria-label="Выбор цикла"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <label htmlFor="cycle-switcher" className="text-xs font-bold uppercase tracking-wide text-brand-900">
                Какой цикл смотреть
              </label>
              <select
                id="cycle-switcher"
                className="mt-2 block min-h-[var(--touch-min,44px)] w-full max-w-xl rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm ring-brand-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={cycle.id}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next && next !== cycle.id) router.push(`/hr/cycles/${next}`);
                }}
              >
                {cycleOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Список всех циклов в системе. Можно переключаться без возврата в общий список.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="#company-cycle-summary"
                className="inline-flex items-center justify-center rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 shadow-sm transition hover:bg-brand-50"
              >
                Сводка по компании
              </a>
              <a
                href="#hr-reviewees-results"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                По каждому сотруднику
              </a>
              {cycleFullyDone && hrReport?.ready ? (
                <a
                  href="#hr-360-report"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-100"
                >
                  {role === "executive" ? "Таблица по сотрудникам" : "Таблица по людям (HR)"}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section
          id="company-cycle-summary"
          className="card scroll-mt-24 border-slate-200/90 bg-white p-5 shadow-soft sm:p-6"
          aria-labelledby="company-cycle-summary-heading"
        >
          <h2 id="company-cycle-summary-heading" className="text-lg font-semibold text-slate-900">
            Обобщённая оценка по компании
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Агрегаты по всем оцениваемым в этом цикле: заполнение анкет, средние по самооценке и по окружению (после того
            как все назначенные анкеты отправлены — по фактическим ответам). Детальный радар и ИИ по конкретному человеку
            открываются из блока «По каждому сотруднику» ниже.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <StatPill label="Оцениваемых в цикле" value={data.reviewees.length} />
            <StatPill label="Заполнение анкет" value={`${pctAll}%`} />
            {companySelfAvg != null ? <StatPill label="Ср. самооценка (компания)" value={String(companySelfAvg)} /> : null}
            {companyOthersAvg != null ? (
              <StatPill label="Ср. окружение (компания)" value={String(companyOthersAvg)} />
            ) : null}
            {companyGap != null ? (
              <StatPill
                label="Разница я − окр. (ср. по людям)"
                value={`${companyGap > 0 ? "+" : ""}${companyGap}`}
              />
            ) : null}
          </div>
          {!cycleFullyDone ? (
            <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
              Цикл ещё не закрыт по анкетам — средние по компании станут репрезентативными после 100% отправки всех
              назначений.
            </p>
          ) : !hrReport.ready ? (
            <p className="mt-4 text-sm text-slate-600">Недостаточно данных для сводных средних по людям.</p>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              По таблице расхождений и сигналам — якорь{" "}
              <a href="#hr-360-report" className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2">
                «Таблица по людям (HR)»
              </a>
              .
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft sm:p-5" aria-label="Этапы цикла">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {role === "executive" ? "Этапы цикла" : "Процесс для HR"}
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            <li
              className={`flex flex-col rounded-xl border px-3 py-3 text-sm ${
                pctAll > 0 ? "border-brand-200 bg-brand-50/40 text-brand-950" : "border-slate-100 bg-slate-50/50 text-slate-600"
              }`}
            >
              <span className="text-[11px] font-bold uppercase text-slate-500">1</span>
              <span className="mt-1 font-semibold">Сбор</span>
              <span className="mt-1 text-xs leading-snug opacity-90">Анкеты у сотрудника, коллеги и руководителя по персональным ссылкам</span>
            </li>
            <li
              className={`flex flex-col rounded-xl border px-3 py-3 text-sm ${
                cycleFullyDone ? "border-emerald-200 bg-emerald-50/50 text-emerald-950" : "border-slate-100 bg-slate-50/50 text-slate-600"
              }`}
            >
              <span className="text-[11px] font-bold uppercase text-slate-500">2</span>
              <span className="mt-1 font-semibold">Завершение</span>
              <span className="mt-1 text-xs leading-snug opacity-90">
                {cycleFullyDone ? "Все анкеты отправлены" : `Сейчас ${completedAll}/${totalAll} (${pctAll}%)`}
              </span>
            </li>
            <li
              className={`flex flex-col rounded-xl border px-3 py-3 text-sm ${
                cycleFullyDone ? "border-violet-200 bg-violet-50/40 text-violet-950" : "border-slate-100 bg-slate-50/50 text-slate-600"
              }`}
            >
              <span className="text-[11px] font-bold uppercase text-slate-500">3</span>
              <span className="mt-1 font-semibold">Отчёты и ИИ</span>
              <span className="mt-1 text-xs leading-snug opacity-90">
                {cycleFullyDone
                  ? "Сводка по циклу, проверка расхождений и полный отчёт по каждому оцениваемому"
                  : "Станет доступно после 100% отправки анкет (сотрудник, коллега, руководитель)"}
              </span>
            </li>
          </ol>
        </section>

        {!cycleFullyDone ? (
          <section
            className="rounded-2xl border border-amber-200/90 bg-amber-50/50 px-5 py-4 shadow-soft sm:px-6"
            aria-labelledby="hr-report-locked-heading"
          >
            <h2 id="hr-report-locked-heading" className="text-sm font-semibold text-amber-950">
              {role === "executive"
                ? "Полная сводка по циклу пока недоступна"
                : "Отчёт по оценке 360° для HR пока недоступен"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-950/90">
              Чтобы открыть сводку цикла, радар и AI по каждому оцениваемому, нужно завершить все назначенные анкеты:
              самооценка, коллега и руководитель. Сейчас не отправлено{" "}
              <strong className="font-semibold">{pendingCount}</strong> из {totalAll} ({100 - pctAll}% осталось).
            </p>
            <a
              href="#hr-reviewees-results"
              className="mt-4 inline-flex text-sm font-semibold text-amber-950 underline decoration-amber-700/50 underline-offset-2 hover:decoration-amber-950"
            >
              Перейти к статусам анкет
            </a>
          </section>
        ) : null}

        {cycleFullyDone ? (
          <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 to-white px-5 py-4 shadow-soft sm:px-6">
            <p className="text-sm font-semibold text-emerald-950">Цикл завершён: собраны все анкеты (100%)</p>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900/90">
              По циклу отправлено {completedAll} из {totalAll} назначенных анкет. Ниже — отчёт по циклу с проверкой
              аномалий и ссылки на полные материалы (радар, бенчмарки, ИИ) по каждому оцениваемому.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#hr-360-report"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                Отчёт по циклу 360°
              </a>
              <a
                href="#hr-reviewees-results"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-800/30 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
              >
                К списку оцениваемых
              </a>
              <Link href="/reports" className="btn-secondary inline-flex text-sm">
                Сводка «Отчёты»
              </Link>
            </div>
          </div>
        ) : null}

        {cycleFullyDone && (role === "hr_admin" || role === "executive") ? (
          <EnterpriseRollupIllustration context="cycle" />
        ) : null}

        {cycleFullyDone && hrReport?.ready ? (
          <section
            id="hr-360-report"
            className="card scroll-mt-24 overflow-hidden border-slate-200/90 shadow-soft"
            aria-labelledby="hr-360-report-heading"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-5 sm:px-7">
              <h2 id="hr-360-report-heading" className="text-lg font-semibold text-slate-900">
                Отчёт по оценке 360° (текущий завершённый цикл)
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Та же структура, что и после прошлого завершённого цикла: сводные средние по человеку, переход к детальному
                радару и HR-отчёту с ИИ. Ниже дополнительно подсвечены типовые аномалии по шкале 1–5 (расхождение ролей и
                самооценки) — используйте как повод к калибровке, а не как решение «автоматом».
              </p>
            </div>

            <div className="table-scroll">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Оцениваемый</th>
                    <th className="px-6 py-3">Самооценка</th>
                    <th className="px-6 py-3">Окружение</th>
                    <th className="px-6 py-3">Δ (я − др.)</th>
                    <th className="px-6 py-3">Сигналы</th>
                    <th className="px-6 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hrReport.reviewees.map((r) => {
                    const alerts = r.anomalies.filter((x) => x.severity === "alert").length;
                    const watches = r.anomalies.filter((x) => x.severity === "watch").length;
                    const infos = r.anomalies.filter((x) => x.severity === "info").length;
                    const gapLabel =
                      r.gapSelfOthers == null ? "—" : `${r.gapSelfOthers > 0 ? "+" : ""}${r.gapSelfOthers}`;
                    return (
                      <tr key={r.revieweeId} className="bg-white/80">
                        <td className="px-6 py-4 font-medium text-slate-900">{r.revieweeName}</td>
                        <td className="px-6 py-4 tabular-nums text-slate-800">{r.selfAvg ?? "—"}</td>
                        <td className="px-6 py-4 tabular-nums text-brand-800">{r.othersAvg ?? "—"}</td>
                        <td className="px-6 py-4 tabular-nums text-slate-800">{gapLabel}</td>
                        <td className="px-6 py-4 text-xs text-slate-700">
                          {r.anomalies.length === 0 ? (
                            <span className="text-emerald-800">Нет заметных отклонений</span>
                          ) : (
                            <span>
                              {alerts > 0 ? (
                                <span className="mr-2 inline-flex rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-900 ring-1 ring-red-200">
                                  Внимание: {alerts}
                                </span>
                              ) : null}
                              {watches > 0 ? (
                                <span className="mr-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-950 ring-1 ring-amber-200">
                                  Проверить: {watches}
                                </span>
                              ) : null}
                              {infos > 0 ? (
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-slate-200">
                                  Инфо: {infos}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            className="btn-primary inline-flex py-2 text-xs sm:text-sm"
                            href={`/results/${r.revieweeId}?cycleId=${cycle.id}`}
                          >
                            Радар и AI
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-4 sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Проверка аномалий по циклу</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Пороги ориентировочные. «Внимание» — сильные расхождения; «Проверить» — умеренные; «Инфо» —
                полезный контекст без срочности.
              </p>
            </div>
          </section>
        ) : null}

        <section className="card border-slate-100 bg-slate-50/40 p-5 shadow-soft sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            {role === "executive" ? "Краткая сводка по циклу" : "Сводка для HR по этому циклу"}
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
            <li>
              <span className="font-medium text-slate-900">Охват:</span> {data.reviewees.length} оцениваемых,{" "}
              {totalAll} назначений анкет, заполнено {completedAll} ({totalAll ? Math.round((completedAll / totalAll) * 100) : 0}
              %).
            </li>
            <li>
              <span className="font-medium text-slate-900">Прогресс по людям:</span>{" "}
              {revieweesAll100
                ? "у всех оцениваемых 100% по назначенным анкетам — готово к калибровке и 1:1."
                : "есть оцениваемые с неполным набором анкет — проверьте список респондентов и напоминания."}
            </li>
            <li>
              <span className="font-medium text-slate-900">Отчёты:</span>{" "}
              {cycleFullyDone
                ? "сводка по циклу и ссылки на радар, бенчмарки и ИИ по каждому оцениваемому доступны ниже."
                : "станут доступны после 100% отправки всех анкет по циклу (самооценка, коллега, руководитель)."}
            </li>
          </ul>
        </section>

        <CycleDashboardCharts completed={completedAll} total={totalAll} reviewees={revieweeChartRows} />

        <section className="card overflow-hidden shadow-soft">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-4 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">Статистика по направлениям</h2>
            <p className="mt-1 text-sm text-slate-600">
              «В штате» — сотрудники с привязкой к оргединице в этом направлении. «Анкет в цикле» — назначения по
              оцениваемым из соответствующего направления.
            </p>
          </div>
          <div className="table-scroll">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">№</th>
                  <th className="px-6 py-3">Направление</th>
                  <th className="px-6 py-3">В штате</th>
                  <th className="px-6 py-3">Анкет в цикле</th>
                  <th className="px-6 py-3">Отправлено</th>
                  <th className="px-6 py-3">Заполнение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.directionBreakdown.map((row) => (
                  <tr key={row.directionId} className="bg-white/80">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{row.directionNum}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{row.directionName}</td>
                    <td className="px-6 py-3 tabular-nums text-slate-700">{row.employeesInOrg}</td>
                    <td className="px-6 py-3 tabular-nums text-slate-700">{row.assignmentsInCycle}</td>
                    <td className="px-6 py-3 tabular-nums text-slate-700">
                      {row.assignmentsDone}/{row.assignmentsInCycle}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-semibold text-brand-800">{row.completionRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="card p-5 shadow-soft lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-900">Напоминания</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              В рабочей версии отсюда можно отправить деликатное напоминание тем, кто ещё не ответил: выбор шаблона,
              канала и времени отправки.
            </p>
            <button
              type="button"
              disabled
              className="btn-primary mt-4 w-full cursor-not-allowed opacity-50"
              title="Функция в разработке"
            >
              Напомнить неотвечившим
            </button>
          </section>
          <section className="card p-5 shadow-soft lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-900">Динамика между циклами</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Сравнивайте полугодия между собой: общая картина по заполнению здесь, детальные средние по компетенциям и
              ролям — в карточке сотрудника (радар и столбцы).
            </p>
            {data.otherCycles.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-xs">
                {data.otherCycles.map((oc) => (
                  <li key={oc.id}>
                    <Link href={`/hr/cycles/${oc.id}`} className="font-medium text-brand-700 hover:text-brand-900 hover:underline">
                      {oc.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          <section
            className="card border-amber-100/80 bg-amber-50/30 p-5 shadow-soft lg:col-span-1"
            aria-labelledby="hr-signals-heading"
          >
            <h2 id="hr-signals-heading" className="text-sm font-semibold text-amber-950">
              Сигналы по расхождениям
            </h2>
            {!cycleFullyDone ? (
              <p className="mt-2 text-xs leading-relaxed text-amber-950/90">
                После завершения всех анкет здесь появится список эвристик по шкале 1–5 (самооценка vs окружение,
                разброс между ролями по компетенциям).
              </p>
            ) : aggregatedSignals.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-emerald-900">
                По текущим данным заметных аномалий не выявлено — всё же просмотрите полный отчёт и комментарии перед
                калибровкой.
              </p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed text-amber-950/95">
                {aggregatedSignals.slice(0, 8).map((sig) => (
                  <li key={sig.id} className="rounded-lg border border-amber-200/60 bg-white/70 p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${severityBadgeClass(sig.severity)}`}
                      >
                        {sig.severity === "alert" ? "Внимание" : sig.severity === "watch" ? "Проверить" : "Инфо"}
                      </span>
                      <span className="font-medium text-slate-800">{sig.revieweeName}</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-900">{sig.title}</p>
                    <p className="mt-0.5 text-slate-700">{sig.detail}</p>
                    {sig.competencyTitle ? (
                      <p className="mt-1 text-[10px] text-slate-500">Компетенция: {sig.competencyTitle}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section id="hr-reviewees-results" className="card scroll-mt-24 overflow-hidden shadow-soft">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-4 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">Оцениваемые</h2>
            <p className="mt-1 text-sm text-slate-600">Прогресс по анкетам и переход к радару и AI-отчёту.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.reviewees.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{r.name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-600">
                      {r.completed} из {r.total} анкет
                    </span>
                    <div className="h-1.5 w-28 max-w-full overflow-hidden rounded-full bg-slate-100 sm:w-40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                        style={{ width: `${r.completionRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-brand-800">{r.completionRate}%</span>
                  </div>
                </div>
                {cycleFullyDone ? (
                  <Link className="btn-primary w-full shrink-0 sm:w-auto" href={`/results/${r.id}?cycleId=${cycle.id}`}>
                    Результаты и AI
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full shrink-0 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 sm:w-auto"
                    title="Дождитесь отправки всех анкет по этому оцениваемому"
                  >
                    Результаты (после 100%)
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-hidden shadow-soft">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-4 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">Респонденты</h2>
            <p className="mt-1 text-sm text-slate-600">
              Статус «Отправлено» — анкета сохранена. Тексты здесь не показываются (анонимность в отчёте).
            </p>
          </div>

          <div className="hidden md:block">
            <div className="table-scroll max-h-[min(70vh,32rem)] overflow-y-auto rounded-b-2xl">
              <table className="table-sticky-head w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Оцениваемый</th>
                    <th className="px-6 py-3">Респондент</th>
                    <th className="px-6 py-3">Роль</th>
                    <th className="px-6 py-3">Статус</th>
                    <th className="px-6 py-3">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.assignments.map((a) => (
                    <tr key={a.id} className="bg-white/80 transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{a.revieweeName}</td>
                      <td className="px-6 py-4 text-slate-700">{a.reviewerName}</td>
                      <td className="px-6 py-4 text-slate-600">{relLabel[a.relationship] ?? a.relationship}</td>
                      <td className="px-6 py-4">
                        {a.submittedAt ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                            Отправлено
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
                            Ожидает
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          className="font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                          href={`/survey/${a.inviteToken}`}
                        >
                          Открыть анкету
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {data.assignments.map((a) => (
              <li key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Оцениваемый</p>
                    <p className="font-semibold text-slate-900">{a.revieweeName}</p>
                  </div>
                  {a.submittedAt ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Готово
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      Ждём
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  <span className="text-slate-400">Респондент:</span> {a.reviewerName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="text-slate-400">Роль:</span> {relLabel[a.relationship] ?? a.relationship}
                </p>
                <Link
                  href={`/survey/${a.inviteToken}`}
                  className="btn-primary mt-4 flex w-full justify-center py-2.5 text-sm"
                >
                  Открыть анкету
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </RoleGuardAny>
  );
}
