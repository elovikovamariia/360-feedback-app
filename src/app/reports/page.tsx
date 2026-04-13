"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { RoleGuard } from "@/components/RoleGuard";
import { appFetch } from "@/lib/app-fetch";
import type { PreviewRoleId } from "@/lib/roles";

type ReportsDashboardPayload = {
  role: PreviewRoleId;
  items: {
    id: string;
    name: string;
    scopeLabel: string;
    revieweeCount: number;
    completionRate: number;
    firstRevieweeId: string | undefined;
  }[];
  avg: number;
  latestCycleId: string | null;
  coverage: {
    revieweeId: string;
    revieweeName: string;
    selfSubmitted: boolean;
    pendingAssignments: { id: string; reviewerName: string; relationship: string }[];
  }[] | null;
};

function relLabel(r: string) {
  switch (r) {
    case "SELF":
      return "Самооценка";
    case "MANAGER":
      return "Руководитель";
    case "PEER":
      return "Коллега";
    case "SUBORDINATE":
      return "Подчинённый";
    default:
      return r;
  }
}

function heroDescription(role: PreviewRoleId) {
  if (role === "manager") {
    return "Статус заполнения по циклам в границах вашей команды и переход к радару по сотруднику. Сырые комментарии к вам не показываются — есть AI-сводка на странице результатов.";
  }
  if (role === "executive") {
    return "Сводные показатели по циклам без детальной HR-панели: удобно показать обзор для руководства.";
  }
  return "Для демо HR: по каждому циклу видно долю заполненных анкет. Откройте сотрудника — радар по компетенциям и сравнение самооценки с оценками руководителя и коллег.";
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsDashboardPayload | false>(false);

  const load = useCallback(async () => {
    const res = await appFetch("/api/reports-dashboard");
    if (!res.ok) {
      setData({ role: "hr_admin", items: [], avg: 0, latestCycleId: null, coverage: null });
      return;
    }
    setData((await res.json()) as ReportsDashboardPayload);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (data === false) {
    return (
      <RoleGuard need="reports">
        <div className="card p-10 text-center text-slate-600">Загрузка…</div>
      </RoleGuard>
    );
  }

  const { role, items, avg, latestCycleId, coverage } = data;

  return (
    <RoleGuard need="reports">
      <div className="space-y-10">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Отчёты" }]} />
        <PageHero kicker="UC-4 и UC-6" title="Отчёты по циклам" description={heroDescription(role)}>
          {items.length > 0 ? (
            <>
              <StatPill label="Циклов" value={items.length} />
              <StatPill label="Среднее заполнение" value={`${avg}%`} />
            </>
          ) : null}
        </PageHero>

        {role === "manager" && coverage && coverage.length > 0 ? (
          <section className="card overflow-hidden shadow-soft">
            <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50/90 to-white px-6 py-4 sm:px-7">
              <h2 className="text-sm font-bold text-slate-900">Контроль заполнения (ваша команда)</h2>
              <p className="mt-1 text-xs text-slate-600">
                Актуальный цикл: кто не завершил самооценку и у кого висят анкеты респондентов.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {coverage.map((row) => (
                <div key={row.revieweeId} className="px-5 py-4 sm:px-7">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{row.revieweeName}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Самооценка:{" "}
                        <span className={row.selfSubmitted ? "font-semibold text-emerald-700" : "font-semibold text-amber-800"}>
                          {row.selfSubmitted ? "отправлена" : "не выполнена"}
                        </span>
                        {row.pendingAssignments.length > 0 ? (
                          <>
                            {" · "}
                            не отвечают по анкетам:{" "}
                            <span className="font-semibold text-slate-800">{row.pendingAssignments.length}</span>
                          </>
                        ) : (
                          row.selfSubmitted && <span className="text-emerald-700"> · все анкеты закрыты</span>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/results/${row.revieweeId}?cycleId=${latestCycleId}`}
                      className="btn-secondary shrink-0 py-2 text-xs sm:text-sm"
                    >
                      Открыть отчёт
                    </Link>
                  </div>
                  {row.pendingAssignments.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                      {row.pendingAssignments.slice(0, 8).map((p) => (
                        <li key={p.id}>
                          <span className="font-medium text-slate-700">{p.reviewerName}</span> — {relLabel(p.relationship)}
                        </li>
                      ))}
                      {row.pendingAssignments.length > 8 ? (
                        <li className="text-slate-500">… и ещё {row.pendingAssignments.length - 8}</li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 text-sm text-slate-700 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-800">Динамика</p>
            <p className="mt-2 leading-relaxed">
              Откройте одного и того же сотрудника в разных циклах — так проще заметить стабильность или сдвиг по ролям и
              компетенциям.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100/90 bg-amber-50/40 p-5 text-sm text-amber-950 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Подсказки системы</p>
            <p className="mt-2 leading-relaxed">
              В демо роль «Руководитель» видит только прямых и косвенных подчинённых (по полю руководителя в базе) и
              собственные результаты.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card p-8 text-center text-slate-600">
            Нет циклов. Создайте данные через{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>.
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {items.map((c) => (
              <li key={c.id}>
                <div className="card-interactive flex flex-col p-6">
                  <h2 className="text-lg font-semibold leading-snug text-slate-900">{c.name}</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">Охват: {c.scopeLabel}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Оцениваемых в выборке: <span className="font-semibold text-slate-700">{c.revieweeCount}</span>
                  </p>
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                      <span>Заполнение цикла</span>
                      <span className="tabular-nums text-brand-800">{c.completionRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                        style={{ width: `${c.completionRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {role === "hr_admin" ? (
                      <Link href={`/hr/cycles/${c.id}`} className="btn-secondary py-2.5 text-xs sm:text-sm">
                        Панель цикла
                      </Link>
                    ) : null}
                    {c.firstRevieweeId && (
                      <Link
                        href={`/results/${c.firstRevieweeId}?cycleId=${c.id}`}
                        className="btn-primary py-2.5 text-xs sm:text-sm"
                      >
                        Отчёт и графики
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RoleGuard>
  );
}
