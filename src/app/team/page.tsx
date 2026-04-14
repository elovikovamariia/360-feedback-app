"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { RoleGuard } from "@/components/RoleGuard";
import { appFetch } from "@/lib/app-fetch";
import type { PreviewRoleId } from "@/lib/roles";

type PersonRow = { id: string; name: string; title: string | null; email: string | null; managerId: string | null };

export default function TeamPage() {
  const [people, setPeople] = useState<PersonRow[] | false>(false);
  const [role, setRole] = useState<PreviewRoleId>("hr_admin");

  const load = useCallback(async () => {
    const res = await appFetch("/api/team-directory");
    if (!res.ok) {
      setPeople([]);
      return;
    }
    const j = (await res.json()) as { people: PersonRow[]; role: PreviewRoleId };
    setPeople(j.people);
    setRole(j.role);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (people === false) {
    return (
      <RoleGuard need="directory">
        <div className="card p-10 text-center text-slate-600">Загрузка…</div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard need="directory">
      <div className="space-y-10">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Команда" }]} />
        <PageHero
          kicker="Справочник · Команда"
          title={role === "manager" ? "Моя команда" : "Участники"}
          description={
            role === "manager"
              ? "Люди в вашем поддереве оргструктуры — ориентир при разборе результатов и 1:1. В продукте список шёл бы из каталога."
              : "Список участников организации: ориентир при назначении оцениваемых и респондентов в цикле."
          }
        >
          <StatPill label="В списке" value={people.length} />
        </PageHero>

        <div className="card overflow-hidden shadow-soft">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-6 py-4 sm:px-7">
            <h2 className="text-sm font-bold text-slate-900">Карточки сотрудников</h2>
            <p className="mt-1 text-xs text-slate-500">{people.length} записей</p>
          </div>
          <ul className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li
                key={p.id}
                className="group rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-sm ring-1 ring-slate-100/80 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200/80 hover:shadow-md hover:ring-brand-100/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-md shadow-brand-500/20">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{p.name}</h3>
                {p.title && <p className="mt-1 text-sm text-slate-600">{p.title}</p>}
                {p.email && <p className="mt-2 truncate font-mono text-xs text-slate-400">{p.email}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RoleGuard>
  );
}
