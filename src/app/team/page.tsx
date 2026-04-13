import { cookies } from "next/headers";
import { Breadcrumbs, PageHero, StatPill } from "@/components/PageChrome";
import { RoleGuard } from "@/components/RoleGuard";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { getManagerVisiblePersonIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function TeamPage() {
  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerPersonId = await resolveViewerPersonId(cookieStore, role);

  let where: { id: { in: string[] } } | Record<string, never> = {};
  if (role === "manager" && viewerPersonId) {
    const ids = await getManagerVisiblePersonIds(viewerPersonId);
    where = { id: { in: ids } };
  }

  const people = await prisma.person.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, email: true, managerId: true },
  });

  return (
    <RoleGuard need="directory">
      <div className="space-y-10">
        <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Команда" }]} />
        <PageHero
          kicker="UC-2 · Справочник"
          title={role === "manager" ? "Моя команда" : "Участники (демо)"}
          description={
            role === "manager"
              ? "Люди в вашем поддереве оргструктуры — ориентир при разборе результатов и 1:1. В продукте список шёл бы из каталога."
              : "Список участников демо: кого можно назначать оцениваемым и респондентам при настройке цикла."
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
