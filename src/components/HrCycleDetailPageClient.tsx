"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CycleDashboardCharts } from "@/components/charts/CycleDashboardCharts";
import { HrCycleDeleteButton } from "@/components/HrCycleDeleteButton";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { RoleGuard } from "@/components/RoleGuard";
import { appFetch } from "@/lib/app-fetch";

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
};

export function HrCycleDetailPageClient({ id }: { id: string }) {
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
      <RoleGuard need="hr_cycles">
        <div className="card border-red-200 bg-red-50/80 p-6 text-sm text-red-900">Ошибка: {error}</div>
      </RoleGuard>
    );
  }

  if (data === false) {
    return (
      <RoleGuard need="hr_cycles">
        <div className="card p-10 text-center text-slate-600">Загрузка…</div>
      </RoleGuard>
    );
  }

  if (data === null) {
    return (
      <RoleGuard need="hr_cycles">
        <div className="card p-10 text-center">
          <p className="text-slate-600">Цикл не найден.</p>
          <Link href="/hr" className="btn-primary mt-6 inline-flex">
            К списку циклов
          </Link>
        </div>
      </RoleGuard>
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

  return (
    <RoleGuard need="hr_cycles">
      <div className="space-y-10">
        <Breadcrumbs items={[{ href: "/hr", label: "Циклы 360°" }, { label: "Текущий цикл" }]} />
        <PageHero
          kicker="Цикл · сбор и назначения"
          title={cycle.name}
          description={`${
            semesterLine ? `Период полугодия: ${semesterLine}. ` : ""
          }${collectionLine ? `Сбор оценок 360°: ${collectionLine}. ` : ""}Охват: ${scopeLine}. Назначения (самооценка, руководитель, один коллега из команды) создаются при запуске цикла по оргструктуре; ниже — ссылки на анкеты и статус заполнения.`}
        >
          <StatPill label="Анкет отправлено" value={`${completedAll}/${totalAll}`} />
          <StatPill label="Оцениваемых" value={data.reviewees.length} />
          <Link href="/hr" className="btn-secondary self-center">
            ← Все циклы
          </Link>
          <HrCycleDeleteButton
            cycleId={cycle.id}
            cycleName={cycle.name}
            redirectTo="/hr"
            className="self-center"
            onDeleted={() => void load()}
          />
        </PageHero>

        <CycleDashboardCharts completed={completedAll} total={totalAll} reviewees={revieweeChartRows} />

        <section className="card overflow-hidden shadow-soft">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-4 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">Статистика по направлениям</h2>
            <p className="mt-1 text-sm text-slate-600">
              «В штате» — сотрудники с привязкой к оргединице в этом направлении. «Анкет в цикле» — назначения по
              оцениваемым из соответствующего направления.
            </p>
          </div>
          <div className="overflow-x-auto">
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
              title="Демо: функция не активна"
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
          <section className="card border-amber-100/80 bg-amber-50/30 p-5 shadow-soft lg:col-span-1">
            <h2 className="text-sm font-semibold text-amber-950">Сигналы для внимания</h2>
            <p className="mt-2 text-xs leading-relaxed text-amber-950/90">
              Система может подсветить, например, заметное расхождение между самооценкой и мнением руководителя. В
              продукте правила настраиваются под политику компании; здесь показан пример формулировки без персональных
              данных.
            </p>
          </section>
        </div>

        <section className="card overflow-hidden shadow-soft">
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
                <Link className="btn-primary w-full shrink-0 sm:w-auto" href={`/results/${r.id}?cycleId=${cycle.id}`}>
                  Результаты и AI
                </Link>
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
            <div className="max-h-[min(70vh,32rem)] overflow-auto rounded-b-2xl">
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
    </RoleGuard>
  );
}
