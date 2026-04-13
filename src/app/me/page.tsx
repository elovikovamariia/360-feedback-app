"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs, PageHero } from "@/components/PageChrome";
import { RoleGuard } from "@/components/RoleGuard";
import { appFetch } from "@/lib/app-fetch";
import type { DemoContextPayload } from "@/lib/get-demo-context";
import type { PreviewRoleId } from "@/lib/roles";

type MePayload = {
  ctx: DemoContextPayload | null;
  viewerId: string | null;
  role: PreviewRoleId;
};

export default function MePage() {
  const [data, setData] = useState<MePayload | false>(false);

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

  if (data === false) {
    return (
      <RoleGuard need="own_results">
        <div className="card p-10 text-center text-slate-600">Загрузка…</div>
      </RoleGuard>
    );
  }

  const { ctx, viewerId, role } = data;
  const resultsHref =
    ctx && viewerId && (role === "manager" || role === "employee")
      ? `/results/${role === "manager" ? viewerId : ctx.revieweeId}?cycleId=${ctx.cycleId}`
      : null;

  return (
    <RoleGuard need="own_results">
      <div className="space-y-10">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Мои результаты" }]} />
        <PageHero
          kicker="UC-6 · Личные итоги"
          title="Мои результаты 360°"
          description={
            role === "manager"
              ? "Радар и средние по ролям по вам как по оцениваемому. Сырые формулировки респондентов скрыты; на странице результатов — AI-обобщение смысла отзывов."
              : "Радар по компетенциям и сравнение групп: вы, руководитель, коллеги. Комментарии к вам не раскрываются по отдельности — используйте AI-сводку на странице результатов."
          }
        />

        {!ctx || !resultsHref ? (
          <div className="card p-8 text-center text-slate-600">
            Нет данных. Выполните <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card p-8 shadow-soft">
              <p className="text-sm text-slate-600">
                Цикл: <span className="font-semibold text-slate-800">{ctx.cycleName}</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                На странице результатов доступны средние баллы по ролям. Исходные формулировки респондентов скрыты; блок
                «AI-отчёт» строится на сервере по полному тексту и даёт нейтральную сводку тем и рекомендаций.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/tasks"
                  className="btn-secondary inline-flex min-h-[44px] items-center justify-center px-6 text-center"
                >
                  Мои анкеты (самооценка и др.)
                </Link>
                <Link
                  href={resultsHref}
                  className="btn-primary inline-flex min-h-[44px] items-center justify-center px-6"
                >
                  Открыть радар и AI-сводку
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
