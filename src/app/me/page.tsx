"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { RoleGuard } from "@/components/RoleGuard";
import { appFetch } from "@/lib/app-fetch";
import { buildEmployeePastSemesterArchive } from "@/lib/employee-past-semesters";
import { DEMO_PERSON_LABEL } from "@/lib/demo-personas";
import type { DemoContextPayload } from "@/lib/get-demo-context";
import type { PreviewRoleId } from "@/lib/roles";
import { resultsDetailHref } from "@/lib/results-route";

type MePayload = {
  ctx: DemoContextPayload | null;
  viewerId: string | null;
  role: PreviewRoleId;
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

function TrendMicroBars({
  points,
}: {
  points: { label: string; value: number; emphasis?: boolean }[];
}) {
  const max = 5;
  return (
    <ul className="space-y-3" aria-label="Динамика средней оценки окружения по шкале 1–5">
      {points.map((p) => (
        <li key={p.label} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span
            className={`shrink-0 text-xs font-medium sm:w-40 ${p.emphasis ? "text-brand-800" : "text-slate-600"}`}
          >
            {p.label}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${p.emphasis ? "bg-brand-600" : "bg-slate-500"}`}
                style={{ width: `${Math.min(100, Math.round((p.value / max) * 100))}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-800">{p.value}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function MePage() {
  const [data, setData] = useState<MePayload | false>(false);
  const [timeline, setTimeline] = useState<TimelineItem[] | null>(null);

  const load = useCallback(async () => {
    const res = await appFetch("/api/me-context");
    if (!res.ok) {
      setData({ ctx: null, viewerId: null, role: "hr_admin" });
      return;
    }
    setData((await res.json()) as MePayload);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ctx = data === false ? null : data.ctx;
  const viewerId = data === false ? null : data.viewerId;
  const role = data === false ? ("employee" as const) : data.role;
  const revieweeId =
    ctx && viewerId && (role === "manager" || role === "employee") ? (role === "manager" ? viewerId : ctx.revieweeId) : null;
  const resultsHref =
    ctx && viewerId && revieweeId && (role === "manager" || role === "employee")
      ? resultsDetailHref(revieweeId, ctx.cycleId)
      : null;

  const showAnnaArchive = role === "employee" && Boolean(ctx?.isDemoAnnaEmployee);

  useEffect(() => {
    if (!revieweeId) return;
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

  const { lastCycleName, lastOthersAvg, lastSelfAvg, deltaOthers } = useMemo(() => {
    if (!timeline || timeline.length === 0) {
      return { lastCycleName: null, lastOthersAvg: null, lastSelfAvg: null, deltaOthers: null };
    }
    const items = [...timeline].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const last = items.at(-1);
    const prev = items.at(-2);
    const d =
      last?.othersAvg != null && prev?.othersAvg != null ? Math.round((last.othersAvg - prev.othersAvg) * 10) / 10 : null;
    return {
      lastCycleName: last?.cycleName ?? null,
      lastOthersAvg: last?.othersAvg ?? null,
      lastSelfAvg: last?.selfAvg ?? null,
      deltaOthers: d,
    };
  }, [timeline]);

  const pastSemesterArchive = useMemo(() => {
    if (!showAnnaArchive || !ctx) return [];
    return buildEmployeePastSemesterArchive(ctx.semesterPeriodStartsAt, ctx.semesterPeriodEndsAt, {
      pastHalfYears: 4,
    });
  }, [showAnnaArchive, ctx]);

  const archiveTrendPoints = useMemo(() => {
    if (!showAnnaArchive || pastSemesterArchive.length === 0) return [];
    const chrono = [...pastSemesterArchive].sort(
      (a, b) => new Date(a.semesterPeriodStartsAt).getTime() - new Date(b.semesterPeriodStartsAt).getTime(),
    );
    const base = chrono.map((row) => ({ label: row.title, value: row.othersAvg, emphasis: false }));
    if (lastOthersAvg != null) {
      base.push({ label: "Текущий цикл (приложение)", value: lastOthersAvg, emphasis: true });
    }
    return base;
  }, [showAnnaArchive, pastSemesterArchive, lastOthersAvg]);

  if (data === false) {
    return (
      <RoleGuard need="own_results">
        <div className="card p-10 text-center text-slate-600">Загрузка…</div>
      </RoleGuard>
    );
  }

  const heroTitle = showAnnaArchive ? `Итоги 360° · ${DEMO_PERSON_LABEL.employee}` : "Мои результаты 360°";
  const heroDescription =
    role === "manager"
      ? "Радар и средние по ролям по вам как по оцениваемому. Сырые формулировки респондентов скрыты; на странице результатов — AI-обобщение смысла отзывов."
      : showAnnaArchive
        ? "Сводка по текущему циклу и архив прошлых полугодий: четыре периода подряд до полугодия, заданного HR (около двух лет истории). Баллы 1–5; радар и AI-отчёт — по кнопке ниже."
        : "Радар по компетенциям и сравнение групп: вы, руководитель, коллеги. Комментарии к вам не раскрываются по отдельности — используйте AI-сводку на странице результатов.";

  return (
    <RoleGuard need="own_results">
      <div className="space-y-10">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Мои результаты" }]} />
        <PageHero kicker="Личные итоги" title={heroTitle} description={heroDescription} />

        {!ctx || !resultsHref ? (
          <div className="card p-8 text-center text-slate-600">
            Нет данных для отображения. Обратитесь к администратору или загрузите данные в систему.
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <div className="space-y-8">
              <section
                className="card overflow-hidden border-slate-200/90 shadow-soft"
                aria-labelledby="me-current-heading"
              >
                <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50/50 to-white px-5 py-4 sm:px-6">
                  <h2 id="me-current-heading" className="text-base font-semibold text-slate-900">
                    Текущий цикл
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{ctx.cycleName}</p>
                  {ctx.evaluationSemesterLabel ? (
                    <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-700">Полугодие оценки (HR):</span>{" "}
                      {ctx.evaluationSemesterLabel}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-6 p-5 sm:p-6">
                  {timeline && timeline.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ключевые цифры</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <StatPill label="Окружение (последнее)" value={lastOthersAvg ?? "—"} />
                        <StatPill label="Самооценка (последнее)" value={lastSelfAvg ?? "—"} />
                        <StatPill
                          label="Δ окружения к прошлому циклу"
                          value={deltaOthers == null ? "—" : `${deltaOthers > 0 ? "+" : ""}${deltaOthers}`}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Последний расчёт по циклу: <span className="font-medium text-slate-700">{lastCycleName}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Оценки по циклу появятся после появления назначений. Откройте полный отчёт — там радар и блок ИИ.
                    </p>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href={resultsHref}
                      className="btn-primary inline-flex min-h-[44px] flex-1 items-center justify-center px-6 sm:flex-none"
                    >
                      Радар, динамика и AI-отчёт
                    </Link>
                    <Link
                      href="/tasks"
                      className="btn-secondary inline-flex min-h-[44px] flex-1 items-center justify-center px-6 text-center sm:flex-none"
                    >
                      Мои анкеты
                    </Link>
                  </div>
                </div>
              </section>

              {showAnnaArchive ? (
                <>
                  <section
                    className="card overflow-hidden border-slate-200/90 shadow-soft"
                    aria-labelledby="me-anna-trend-heading"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                      <h2 id="me-anna-trend-heading" className="text-base font-semibold text-slate-900">
                        Как менялась оценка окружения
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Четыре полугодия подряд до периода, заданного HR в текущем цикле (без «дыр» между ними), плюс
                        текущий цикл из приложения, если уже есть расчёт.
                      </p>
                    </div>
                    <div className="p-5 sm:p-6">
                      {archiveTrendPoints.length > 0 ? (
                        <TrendMicroBars points={archiveTrendPoints} />
                      ) : (
                        <p className="text-sm text-slate-600">Нет точек для графика.</p>
                      )}
                    </div>
                  </section>

                  <section
                    className="card overflow-hidden border-slate-200/90 shadow-soft"
                    aria-labelledby="me-anna-archive-heading"
                  >
                    <div className="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
                      <h2 id="me-anna-archive-heading" className="text-base font-semibold text-slate-900">
                        Архив 360° за прошлые полугодия
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        Периоды строятся от{" "}
                        <strong className="font-medium text-slate-800">
                          полугодия, которое HR указал в текущем цикле
                        </strong>
                        : каждое предыдущее полугодие — на шесть месяцев раньше, без пропусков (около двух лет
                        истории в компании). Оценки и формулировки в архиве носят справочный характер; актуальные данные
                        текущего цикла — в блоке выше и в полном отчёте.
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {pastSemesterArchive.map((row) => (
                        <article key={row.id} className="px-5 py-5 sm:px-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">{row.title}</h3>
                              <p className="text-xs text-slate-500">{row.periodLabel}</p>
                            </div>
                            <dl className="flex shrink-0 gap-4 text-sm tabular-nums">
                              <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Окружение</dt>
                                <dd className="font-bold text-brand-800">{row.othersAvg}</dd>
                              </div>
                              <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Самооценка</dt>
                                <dd className="font-bold text-slate-800">{row.selfAvg}</dd>
                              </div>
                            </dl>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-slate-700">{row.summary}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}

              {timeline && timeline.length > 1 ? (
                <section
                  className="card overflow-hidden border-slate-200/90 shadow-soft"
                  aria-labelledby="me-db-cycles-heading"
                >
                  <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                    <h2 id="me-db-cycles-heading" className="text-base font-semibold text-slate-900">
                      Циклы в приложении
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">Сохранённые в базе циклы, где вы — оцениваемый.</p>
                  </div>
                  <div className="table-scroll">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3 sm:px-6">Цикл</th>
                          <th className="px-5 py-3 sm:px-6">Заполнение</th>
                          <th className="px-5 py-3 sm:px-6">Самооценка</th>
                          <th className="px-5 py-3 sm:px-6">Окружение</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...timeline]
                          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                          .map((x) => (
                            <tr key={x.cycleId}>
                              <td className="px-5 py-3 font-medium text-slate-900 sm:px-6">{x.cycleName}</td>
                              <td className="px-5 py-3 tabular-nums text-slate-700 sm:px-6">{x.completionRate}%</td>
                              <td className="px-5 py-3 tabular-nums text-slate-700 sm:px-6">{x.selfAvg ?? "—"}</td>
                              <td className="px-5 py-3 tabular-nums text-slate-700 sm:px-6">{x.othersAvg ?? "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-24" aria-label="Подсказки и быстрые ссылки">
              <div className="card border-slate-200/90 p-5 shadow-soft sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Подсказка</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  На странице результатов — радар по ролям и AI-сводка по смыслу комментариев без привязки к авторам.
                </p>
                <Link href={resultsHref} className="btn-primary mt-4 inline-flex min-h-[44px] w-full items-center justify-center px-4">
                  Открыть отчёт
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
