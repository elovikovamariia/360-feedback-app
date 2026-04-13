"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HrCycleDeleteButton } from "@/components/HrCycleDeleteButton";
import { LaunchCycleForm } from "@/components/LaunchCycleForm";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { RoleGuard } from "@/components/RoleGuard";
import { appFetch } from "@/lib/app-fetch";

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });

function formatPeriod(startsAt: string | Date | null | undefined, endsAt: string | Date | null | undefined) {
  if (!startsAt || !endsAt) return null;
  const s = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const e = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return `${dateFmt.format(s)} — ${dateFmt.format(e)}`;
}

function cycleBadge(completionRate: number, endsAt: string | Date | null | undefined) {
  const now = Date.now();
  const endMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const ended = !Number.isNaN(endMs) && endMs < now;
  if (ended && completionRate >= 100) {
    return { label: "Завершён", className: "bg-emerald-50 text-emerald-900 ring-emerald-100" };
  }
  if (ended) {
    return { label: "Закрыт", className: "bg-slate-100 text-slate-700 ring-slate-200" };
  }
  return { label: "В процессе", className: "bg-amber-50 text-amber-950 ring-amber-100" };
}

type ApiCycle = {
  id: string;
  name: string;
  startsAt?: string | null;
  endsAt?: string | null;
  semesterPeriodStartsAt?: string | null;
  semesterPeriodEndsAt?: string | null;
  scopeLabel: string;
  revieweeCount: number;
  completionRate: number;
  completed: number;
  total: number;
};

export function HrCyclesPageClient() {
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [cycles, setCycles] = useState<ApiCycle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await appFetch("/api/cycles");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { cycles: ApiCycle[]; headcount?: number };
      setCycles(data.cycles);
      setHeadcount(typeof data.headcount === "number" ? data.headcount : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setCycles([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  if (cycles === null) {
    return (
      <RoleGuard need="hr_cycles">
        <div className="card p-10 text-center text-slate-600">Загрузка циклов…</div>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard need="hr_cycles">
        <div className="card border-red-200 bg-red-50/80 p-6 text-sm text-red-900">Ошибка: {error}</div>
      </RoleGuard>
    );
  }

  const avgCompletion =
    cycles.length === 0 ? 0 : Math.round(cycles.reduce((a, c) => a + c.completionRate, 0) / cycles.length);
  const closed2025 = cycles.filter((c) => c.name.includes("2025")).length;
  const hc = headcount ?? "—";

  return (
    <RoleGuard need="hr_cycles">
      <div className="space-y-10">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Циклы 360°" }]} />
        <PageHero
          kicker="HR · UC-1 и UC-4"
          title="Циклы оценки 360°"
          description="Цикл только на всю компанию. При запуске задаются даты сбора оценок; для каждого из сотрудников автоматически создаются анкеты: самооценка, руководитель из оргструктуры и один коллега из прямой команды. Ссылки и статус — в карточке цикла и в отчётах."
        >
          <StatPill label="Сотрудников (демо)" value={hc} />
          {cycles.length > 0 ? (
            <>
              <StatPill label="Циклов в ленте" value={cycles.length} />
              <StatPill label="Среднее заполнение" value={`${avgCompletion}%`} />
              {closed2025 > 0 ? <StatPill label="Завершено в 2025" value={`${closed2025} полугодия`} /> : null}
            </>
          ) : null}
        </PageHero>

        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-4 text-sm text-slate-700 sm:px-5">
          <p className="font-semibold text-slate-900">В этом разделе для демо</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 leading-relaxed text-slate-600">
            <li>Создать цикл: период полугодия подставляется из выбора; даты сбора 360° (начало не раньше сегодня), название по полугодию.</li>
            <li>Сразу после запуска — автоматические назначения по оргструктуре (сам, руководитель, один коллега из команды) и ссылки на анкеты.</li>
            <li>Смотреть прогресс в карточке цикла и в отчётах; при необходимости удалить тестовый цикл целиком.</li>
          </ul>
        </div>

        <LaunchCycleForm existingCycleNames={cycles.map((c) => c.name)} onCreated={() => void load()} />

        <section className="space-y-4" aria-labelledby="hr-cycles-list-title">
          <h2 id="hr-cycles-list-title" className="text-base font-semibold text-slate-900">
            Предыдущие и текущие циклы оценивания
          </h2>
          {cycles.length === 0 ? (
            <div className="card border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 p-8">
              <h3 className="text-lg font-semibold text-amber-950">Данных пока нет</h3>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
                Выполните в папке проекта:{" "}
                <code className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-xs shadow-sm">npx prisma db push</code>{" "}
                и <code className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-xs shadow-sm">npm run db:seed</code>,
                затем обновите страницу.
              </p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {cycles.map((c) => {
                const badge = cycleBadge(c.completionRate, c.endsAt);
                return (
                  <li
                    key={c.id}
                    className="card flex flex-col overflow-hidden p-0 shadow-card transition hover:border-brand-200/60 hover:shadow-glow"
                  >
                    <Link href={`/hr/cycles/${c.id}`} className="group relative flex flex-1 flex-col p-6">
                      <div
                        className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-brand-400/10 blur-2xl transition group-hover:bg-brand-400/15"
                        aria-hidden
                      />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold leading-snug text-slate-900 transition group-hover:text-brand-800">
                              {c.name}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          {formatPeriod(c.semesterPeriodStartsAt, c.semesterPeriodEndsAt) ? (
                            <p className="mt-1.5 text-xs font-medium text-slate-500">
                              Полугодие: {formatPeriod(c.semesterPeriodStartsAt, c.semesterPeriodEndsAt)}
                            </p>
                          ) : null}
                          {formatPeriod(c.startsAt, c.endsAt) ? (
                            <p className="mt-1.5 text-xs font-medium text-slate-500">
                              Сбор оценок: {formatPeriod(c.startsAt, c.endsAt)}
                            </p>
                          ) : (
                            <p className="mt-1.5 text-xs font-medium text-amber-700">Сбор оценок: даты не заданы</p>
                          )}
                          <p className="mt-1.5 text-xs font-medium text-slate-500">Охват: {c.scopeLabel}</p>
                          <p className="mt-2 text-sm text-slate-500">
                            Оцениваемых: <span className="font-semibold text-slate-700">{c.revieweeCount}</span>
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-gradient-to-br from-brand-600 to-brand-700 px-3.5 py-1.5 text-sm font-bold tabular-nums text-white shadow-md shadow-brand-600/25">
                          {c.completionRate}%
                        </span>
                      </div>
                      <div className="relative mt-6">
                        <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                          <span>Заполнение анкет</span>
                          <span className="tabular-nums text-slate-600">
                            {c.completed}/{c.total}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-brand-600 transition-all duration-500"
                            style={{ width: `${c.completionRate}%` }}
                          />
                        </div>
                      </div>
                      <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                        Открыть цикл
                        <span
                          aria-hidden
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-800 ring-1 ring-brand-100 transition group-hover:translate-x-0.5 group-hover:bg-brand-100"
                        >
                          →
                        </span>
                      </span>
                    </Link>
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-6">
                      <HrCycleDeleteButton cycleId={c.id} cycleName={c.name} onDeleted={() => void load()} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}
