"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { appFetch } from "@/lib/app-fetch";
import { DEMO_PERSON_LABEL } from "@/lib/demo-personas";

const REVIEWER_KEY = "360_feedback_reviewer_id";

const relLabel: Record<string, string> = {
  SELF: "Самооценка",
  MANAGER: "Руководитель",
  PEER: "Коллега",
  SUBORDINATE: "Подчинённый",
};

const relOrder: Record<string, number> = {
  SELF: 0,
  MANAGER: 1,
  PEER: 2,
  SUBORDINATE: 3,
};

type Item = {
  token: string;
  cycleId: string;
  cycleName: string;
  collectionStartsAt: string | null;
  collectionEndsAt: string | null;
  revieweeId: string;
  revieweeName: string;
  relationship: string;
  submittedAt: string | null;
};

type ListTab = "active" | "archive";

function formatRuLongDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function sortByRelationship<T extends { relationship: string; token: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => (relOrder[a.relationship] ?? 99) - (relOrder[b.relationship] ?? 99) || a.token.localeCompare(b.token),
  );
}

function MiniTabs({
  value,
  onChange,
  archiveCount,
}: {
  value: ListTab;
  onChange: (v: ListTab) => void;
  archiveCount: number;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100/90 p-1 shadow-inner ring-1 ring-slate-200/70">
      <button
        type="button"
        onClick={() => onChange("active")}
        className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
          value === "active" ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:bg-white/70"
        }`}
      >
        К заполнению
      </button>
      <button
        type="button"
        onClick={() => onChange("archive")}
        className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
          value === "archive" ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:bg-white/70"
        }`}
      >
        Архив ({archiveCount})
      </button>
    </div>
  );
}

function AssignmentRow({ a, mode }: { a: Item; mode: "active" | "archive" }) {
  const isSelf = a.relationship === "SELF";
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {mode === "active" ? (isSelf ? "Оцениваемый" : "Кого оцениваете") : "Отправлено"}
        </p>
        <p className="font-semibold text-slate-900">{isSelf ? `${a.revieweeName} (вы)` : a.revieweeName}</p>
        <p className="mt-1 text-sm text-slate-600">
          {a.cycleName} · {relLabel[a.relationship] ?? a.relationship}
        </p>
        {a.collectionStartsAt || a.collectionEndsAt ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Сбор оценок:</span>
            <span>
              {formatRuLongDate(a.collectionStartsAt) ?? "…"} — {formatRuLongDate(a.collectionEndsAt) ?? "…"}
            </span>
          </p>
        ) : null}
        {mode === "archive" && a.submittedAt ? (
          <p className="mt-1 text-xs text-slate-500">
            {new Date(a.submittedAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        ) : null}
      </div>
      <Link
        href={`/survey/${a.token}`}
        className={`shrink-0 text-center text-sm sm:min-w-[10rem] ${mode === "active" ? "btn-primary" : "btn-secondary"}`}
      >
        {mode === "active" ? "Заполнить" : "Посмотреть ответы"}
      </Link>
    </div>
  );
}

export function RespondentTasksClient() {
  const [selfTab, setSelfTab] = useState<ListTab>("active");
  const [othersTab, setOthersTab] = useState<ListTab>("active");
  const [pending, setPending] = useState<Item[]>([]);
  const [archive, setArchive] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [mp, ma] = await Promise.all([
        appFetch("/api/my-assignments?status=pending").then((r) => r.json()),
        appFetch("/api/my-assignments?status=archive").then((r) => r.json()),
      ]);
      if (mp.error) throw new Error(mp.error);
      if (ma.error) throw new Error(ma.error);

      let pend: Item[] = mp.items ?? [];
      let arch: Item[] = ma.items ?? [];
      const serverRid = (mp.reviewerId ?? ma.reviewerId) as string | null | undefined;
      if (serverRid) {
        try {
          localStorage.setItem(REVIEWER_KEY, serverRid);
        } catch {
          /* ignore */
        }
      }

      if (pend.length === 0 && arch.length === 0) {
        let ls: string | null = null;
        try {
          ls = localStorage.getItem(REVIEWER_KEY);
        } catch {
          /* ignore */
        }
        if (ls) {
          const [p2, a2] = await Promise.all([
            appFetch(`/api/respondent?reviewerId=${encodeURIComponent(ls)}&status=pending`).then((r) => r.json()),
            appFetch(`/api/respondent?reviewerId=${encodeURIComponent(ls)}&status=archive`).then((r) => r.json()),
          ]);
          if (!p2.error && p2.items?.length) pend = p2.items;
          if (!a2.error && a2.items?.length) arch = a2.items;
        }
      }

      setPending(sortByRelationship(pend));
      setArchive(arch);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selfPending = useMemo(() => pending.filter((a) => a.relationship === "SELF"), [pending]);
  const selfArchive = useMemo(() => archive.filter((a) => a.relationship === "SELF"), [archive]);
  const othersPending = useMemo(() => pending.filter((a) => a.relationship !== "SELF"), [pending]);
  const othersArchive = useMemo(() => archive.filter((a) => a.relationship !== "SELF"), [archive]);

  const latestSelfArchive = useMemo(() => {
    if (selfArchive.length === 0) return undefined;
    return [...selfArchive].sort((a, b) => {
      const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return tb - ta;
    })[0];
  }, [selfArchive]);

  const hasSelfIncomplete = selfPending.length > 0;

  if (!loading && pending.length === 0 && archive.length === 0) {
    return (
      <div className="card p-6 text-sm leading-relaxed text-slate-700 shadow-soft">
        <p className="font-medium text-slate-900">Список анкет пуст</p>
        <p className="mt-2">
          Задания зависят от роли «Просмотр как…»: <strong className="font-medium text-slate-900">Сотрудник</strong> —{" "}
          {DEMO_PERSON_LABEL.employee}; <strong className="font-medium text-slate-900">Респондент</strong> —{" "}
          {DEMO_PERSON_LABEL.respondent} (анкета на коллегу, в т.ч. на {DEMO_PERSON_LABEL.employee});{" "}
          <strong className="font-medium text-slate-900">Руководитель</strong> — {DEMO_PERSON_LABEL.manager}. Для роли HR откройте
          ссылку из карточки цикла или переключите роль предпросмотра.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          После запуска цикла у участника две зоны: <strong className="font-medium text-slate-800">самооценка</strong> и{" "}
          <strong className="font-medium text-slate-800">оценка других</strong> — они вынесены отдельно на этой странице.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {err ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : (
        <>
          {/* 1. Самооценка */}
          <section className="rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50/90 via-white to-slate-50/40 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Шаг 1 · Обязательно по циклу</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Самооценка</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
                  При запуске цикла 360° каждый участник сначала проходит самооценку по тем же компетенциям. Это отдельный блок
                  от анкет, где вы оцениваете коллег или подчинённых — для сотрудника, руководителя и любого респондента.
                </p>
              </div>
              <MiniTabs value={selfTab} onChange={setSelfTab} archiveCount={selfArchive.length} />
            </div>

            <div className="mt-5">
              {selfTab === "active" ? (
                selfPending.length > 0 ? (
                  <ul className="space-y-3">
                    {selfPending.map((a) => (
                      <li key={a.token}>
                        <AssignmentRow a={a} mode="active" />
                      </li>
                    ))}
                  </ul>
                ) : latestSelfArchive ? (
                  <div className="rounded-xl border border-emerald-200/80 bg-white/90 p-4 sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Самооценка уже отправлена</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{latestSelfArchive.cycleName}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Ниже в блоке «Оценка других» пройдите назначенные анкеты по коллегам или команде. Итоговая картина по ролям
                      появится в отчёте после сбора ответов.
                    </p>
                    {(latestSelfArchive.collectionStartsAt || latestSelfArchive.collectionEndsAt) && (
                      <p className="mt-2 text-xs text-slate-600">
                        {formatRuLongDate(latestSelfArchive.collectionStartsAt) &&
                        formatRuLongDate(latestSelfArchive.collectionEndsAt) ? (
                          <>
                            Окно сбора: {formatRuLongDate(latestSelfArchive.collectionStartsAt)} —{" "}
                            {formatRuLongDate(latestSelfArchive.collectionEndsAt)}
                          </>
                        ) : formatRuLongDate(latestSelfArchive.collectionEndsAt) ? (
                          <>Сбор до {formatRuLongDate(latestSelfArchive.collectionEndsAt)}</>
                        ) : null}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/survey/${latestSelfArchive.token}`} className="btn-secondary inline-flex text-sm">
                        Открыть копию самооценки
                      </Link>
                      <Link
                        href={`/results/${latestSelfArchive.revieweeId}?cycleId=${encodeURIComponent(latestSelfArchive.cycleId)}`}
                        className="btn-primary inline-flex text-sm"
                      >
                        Сводка по циклу
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600">
                    Самооценка по активным циклам не назначена. Когда HR включит вас в цикл, здесь появится отдельная строка
                    «Самооценка».
                  </p>
                )
              ) : selfArchive.length > 0 ? (
                <ul className="space-y-3">
                  {selfArchive.map((a) => (
                    <li key={a.token}>
                      <AssignmentRow a={a} mode="archive" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">В архиве пока нет отправленных самооценок.</p>
              )}
            </div>
          </section>

          {/* 2. Оценка других */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Шаг 2 · Респондент</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Оценка других</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Анкеты, где вы выступаете как коллега, руководитель или другой тип респондента — не про себя. Они вынесены
                  отдельно от самооценки для всех ролей (сотрудник, руководитель, респондент).
                </p>
                {hasSelfIncomplete ? (
                  <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                    Рекомендуем сначала завершить блок <strong className="font-semibold">«Самооценка»</strong> выше — так обычно
                    запускают цикл: сначала фиксируем вашу позицию по себе, затем оцениваем других.
                  </p>
                ) : null}
              </div>
              <MiniTabs value={othersTab} onChange={setOthersTab} archiveCount={othersArchive.length} />
            </div>

            <div className="mt-5">
              {othersTab === "active" ? (
                othersPending.length > 0 ? (
                  <ul className="space-y-3">
                    {sortByRelationship(othersPending).map((a) => (
                      <li key={a.token}>
                        <AssignmentRow a={a} mode="active" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                    Нет анкет по оценке других в статусе «к заполнению». Если цикл только начался, назначения появятся после
                    настройки HR; самооценка при этом остаётся в блоке выше.
                  </p>
                )
              ) : othersArchive.length > 0 ? (
                <ul className="space-y-3">
                  {othersArchive.map((a) => (
                    <li key={a.token}>
                      <AssignmentRow a={a} mode="archive" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">В архиве пока нет отправленных анкет по оценке других.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
