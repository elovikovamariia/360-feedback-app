"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { appFetch } from "@/lib/app-fetch";

type Competency = { id: string; title: string; description: string };

const REVIEWER_STORAGE_KEY = "360_feedback_reviewer_id";

/** Подписи к шкале — полный текст в подсказке при наведении (как в типичных HR-опросах). */
const SCALE_HINTS: Record<number, string> = {
  1: "Почти не проявляется или проявляется с редкими исключениями",
  2: "Проявляется реже, чем ожидается для роли",
  3: "Соответствует ожиданиям для роли и ситуации",
  4: "Заметно чаще и сильнее, чем ожидается",
  5: "Ярко выраженный сильный паттерн поведения",
};

function SurveySkeleton() {
  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

function formatRuLongDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** После самооценки: ожидание анкет коллег/руководителя и закрытия окна сбора (HR-практики: статус, сроки, ожидания). */
function SelfAssessmentNextSteps({
  cycleName,
  collectionStartsAt,
  collectionEndsAt,
  revieweeId,
  cycleId,
}: {
  cycleName: string;
  collectionStartsAt: string | null;
  collectionEndsAt: string | null;
  revieweeId: string;
  cycleId: string;
}) {
  const endMs = collectionEndsAt ? new Date(collectionEndsAt).getTime() : NaN;
  const hasEnd = Number.isFinite(endMs);
  const collectionStillOpen = hasEnd ? Date.now() <= endMs : null;
  const startLabel = formatRuLongDate(collectionStartsAt);
  const endLabel = formatRuLongDate(collectionEndsAt);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Что дальше</p>
      <h3 className="mt-1 text-base font-bold text-slate-900">Ожидание обратной связи коллег и руководителя</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Самооценка зафиксирована. Дальше по тому же циклу проходят анкеты приглашённых респондентов. Итоговую картину по
        ролям (вы / руководитель / коллеги) вы увидите в сводном отчёте: отдельные формулировки не привязываются к
        конкретному человеку — это снижает переживания и поддерживает честность ответов.
      </p>

      {(startLabel || endLabel) && (
        <div className="mt-4 rounded-xl border border-slate-200/80 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Окно сбора оценок</p>
          <p className="mt-1 text-sm text-slate-800">
            {cycleName}
            {startLabel && endLabel ? (
              <>
                : с <span className="font-medium">{startLabel}</span> по{" "}
                <span className="font-medium">{endLabel}</span>
              </>
            ) : endLabel ? (
              <>
                : активно до <span className="font-medium">{endLabel}</span>
              </>
            ) : startLabel ? (
              <>
                : с <span className="font-medium">{startLabel}</span>
              </>
            ) : null}
          </p>
          {collectionStillOpen === true ? (
            <p className="mt-2 text-sm text-slate-600">
              Пока окно открыто, коллеги и руководитель могут дополнять оценки. Обычно полную сводку имеет смысл
              смотреть после даты окончания — так меньше «полупустых» графиков и спокойнее восприятие.
            </p>
          ) : collectionStillOpen === false ? (
            <p className="mt-2 text-sm text-slate-600">
              Окно сбора по датам закрыто — HR может публиковать или обновлять отчёт. Если графики ещё дозаполняются,
              цифры могут слегка меняться до финальной выгрузки.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Точные даты окна сбора уточняйте у HR — в карточке цикла они задаются при запуске.
            </p>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-2 border-t border-slate-200/80 pt-4 text-sm text-slate-700">
        <li className="flex gap-2">
          <span className="font-bold text-brand-700">1.</span>
          <span>Ниже остаётся копия ваших ответов — при желании сверьтесь с формулировками до разбора с HR.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-brand-700">2.</span>
          <span>
            Не сравнивайте «на глаз» свои баллы с чужими до готовности отчёта: у коллег другой контекст наблюдения.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-brand-700">3.</span>
          <span>
            В демо сводку по циклу откройте в роли «Сотрудник» — раздел «Мои результаты» или{" "}
            <Link
              href={`/results/${revieweeId}?cycleId=${encodeURIComponent(cycleId)}`}
              className="font-medium text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
            >
              прямая ссылка на отчёт
            </Link>
            .
          </span>
        </li>
      </ul>
    </div>
  );
}

function SubmittedSummary({
  competencies,
  scores,
  competencyComments,
  generalText,
}: {
  competencies: Competency[];
  scores: Record<string, number>;
  competencyComments: Record<string, string>;
  generalText: string;
}) {
  return (
    <div className="card space-y-5 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900">Ваши ответы</h2>
      <ul className="space-y-4">
        {competencies.map((c) => (
          <li key={c.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-slate-900">{c.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              Оценка: <span className="font-semibold tabular-nums text-brand-800">{scores[c.id] ?? "—"}</span> из 5
            </p>
            {competencyComments[c.id]?.trim() ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
                {competencyComments[c.id]}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Комментарий к компетенции не добавлялся</p>
            )}
          </li>
        ))}
      </ul>
      <div>
        <p className="text-sm font-medium text-slate-900">Общий комментарий</p>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
          {generalText}
        </p>
      </div>
    </div>
  );
}

export default function SurveyPage() {
  const params = useParams();
  const raw = params?.token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [meta, setMeta] = useState<{
    cycleId: string;
    cycleName: string;
    relationship: string;
    revieweeId: string;
    revieweeName: string;
    reviewerName: string;
    collectionStartsAt: string | null;
    collectionEndsAt: string | null;
  } | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [competencyComments, setCompetencyComments] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await appFetch(`/api/survey/${token}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Ошибка загрузки");
        if (cancelled) return;
        if (json.reviewerId) {
          try {
            localStorage.setItem(REVIEWER_STORAGE_KEY, json.reviewerId as string);
          } catch {
            /* ignore */
          }
        }
        setMeta({
          cycleId: json.cycleId as string,
          cycleName: json.cycleName,
          relationship: json.relationship,
          revieweeId: json.revieweeId as string,
          revieweeName: json.revieweeName,
          reviewerName: json.reviewerName,
          collectionStartsAt: (json.collectionStartsAt as string | null) ?? null,
          collectionEndsAt: (json.collectionEndsAt as string | null) ?? null,
        });
        setCompetencies(json.competencies);
        setSubmitted(Boolean(json.submitted));
        setScores(json.existingScores ?? {});
        setCompetencyComments(json.existingCompetencyComments ?? {});
        setText(json.existingText ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filledCount = useMemo(() => {
    return competencies.filter((c) => scores[c.id] >= 1 && scores[c.id] <= 5).length;
  }, [competencies, scores]);

  const progress = competencies.length ? Math.round((filledCount / competencies.length) * 100) : 0;

  const canSubmit = useMemo(() => {
    if (submitted) return false;
    if (competencies.length === 0) return false;
    for (const c of competencies) {
      const s = scores[c.id];
      if (!s || s < 1 || s > 5) return false;
    }
    return text.trim().length >= 20;
  }, [competencies, scores, text, submitted]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await appFetch(`/api/survey/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores, text, competencyComments }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Не удалось отправить");
      return;
    }
    setSubmitted(true);
    setJustSent(true);
  }

  const roleLabel =
    meta?.relationship === "SELF"
      ? "Самооценка"
      : meta?.relationship === "MANAGER"
        ? "Руководитель"
        : meta?.relationship === "PEER"
          ? "Коллега"
          : meta?.relationship === "SUBORDINATE"
            ? "Подчинённый"
            : meta?.relationship;

  if (!token) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="text-slate-700">Некорректная ссылка на анкету.</p>
      </div>
    );
  }

  if (loading) return <SurveySkeleton />;
  if (error && !meta)
    return (
      <div className="card mx-auto max-w-md border-red-200/80 bg-red-50/50 p-6 text-center">
        <p className="font-medium text-red-900">{error}</p>
      </div>
    );
  if (!meta) return null;

  const showReadOnly = submitted;

  return (
    <div className="w-full max-w-3xl space-y-5 pb-24 sm:space-y-6 sm:pb-8">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Оценка 360°</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {meta.relationship === "SELF" ? "Самооценка по компетенциям" : "Обратная связь о коллеге"}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80">
            {meta.cycleName}
          </span>
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900 ring-1 ring-brand-100">
            Ваша роль в оценке: {roleLabel}
          </span>
        </div>
        <p className="mt-4 text-base font-semibold text-slate-900">
          Оцениваете: <span className="text-brand-800">{meta.revieweeName}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Оценки по компетенциям и комментарии используются только в обобщённом виде: сотрудник не увидит, кто именно
          что написал. Пожалуйста, опирайтесь на наблюдаемое поведение и факты.
        </p>
      </div>

      {showReadOnly ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-xl text-white shadow-md">
              ✓
            </div>
            <h2 className="mt-3 text-lg font-bold text-emerald-950">
              {meta.relationship === "SELF" ? "Самооценка сохранена" : "Анкета отправлена"}
            </h2>
            <p className="mt-2 text-sm text-emerald-900/90">
              {meta.relationship === "SELF"
                ? justSent
                  ? "Спасибо. Ниже — копия ответов; дальнейшие шаги и сроки — в блоке «Что дальше»."
                  : "Вы уже отправляли самооценку. Ниже — сохранённые ответы и напоминание о следующих шагах."
                : justSent
                  ? "Спасибо! Ниже можно проверить, что ушло на сервер. Копия также доступна в разделе «Мои анкеты» → архив."
                  : "Вы уже отправляли эту анкету. Ниже — сохранённые ответы."}
            </p>
            <Link href="/tasks" className="btn-secondary mt-4 inline-flex text-sm">
              Мои анкеты и архив
            </Link>
          </div>
          {meta.relationship === "SELF" ? (
            <SelfAssessmentNextSteps
              cycleName={meta.cycleName}
              collectionStartsAt={meta.collectionStartsAt}
              collectionEndsAt={meta.collectionEndsAt}
              revieweeId={meta.revieweeId}
              cycleId={meta.cycleId}
            />
          ) : null}
          <SubmittedSummary
            competencies={competencies}
            scores={scores}
            competencyComments={competencyComments}
            generalText={text}
          />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-slate-800">Прогресс</span>
              <span className="tabular-nums text-slate-500">
                {filledCount}/{competencies.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card sm:p-5">
            <section className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Компетенции</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Сначала выберите балл по шкале 1–5. Подсказка к каждому баллу — наведите курсор на цифру. После выбора
                  можно кратко пояснить оценку (по желанию).
                </p>
              </div>

              {competencies.map((c, idx) => {
                const selected = scores[c.id];
                const hasScore = selected >= 1 && selected <= 5;
                return (
                  <fieldset key={c.id} className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4">
                    <legend className="sr-only">
                      {c.title}, блок {idx + 1} из {competencies.length}
                    </legend>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Вопрос {idx + 1} из {competencies.length}
                        </span>
                        <h3 className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">{c.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{c.description}</p>
                      </div>
                      {hasScore ? (
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-800 ring-1 ring-brand-100">
                          {selected}/5
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Шкала</p>
                      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label
                            key={n}
                            title={SCALE_HINTS[n]}
                            className={`flex min-h-[48px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-1 py-2 text-center transition sm:min-h-[52px] ${
                              scores[c.id] === n
                                ? "border-brand-600 bg-white text-brand-950 shadow-md ring-1 ring-brand-200/60"
                                : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              className="sr-only"
                              type="radio"
                              name={`score-${c.id}`}
                              checked={scores[c.id] === n}
                              onChange={() => setScores((s) => ({ ...s, [c.id]: n }))}
                            />
                            <span className="text-lg font-bold tabular-nums">{n}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-center text-[10px] text-slate-400 sm:text-xs">
                        На мобильном полные подписи — при нажатии и удержании на цифре (всплывающая подсказка)
                      </p>
                      {hasScore && selected ? (
                        <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-snug text-slate-700 ring-1 ring-slate-200/80 sm:text-sm">
                          <span className="font-medium text-slate-900">Балл {selected}:</span> {SCALE_HINTS[selected]}
                        </p>
                      ) : null}
                    </div>

                    {hasScore ? (
                      <div className="mt-3 border-t border-slate-200/80 pt-3">
                        <label className="text-sm font-medium text-slate-800" htmlFor={`cc-${c.id}`}>
                          Комментарий к этой компетенции{" "}
                          <span className="font-normal text-slate-500">— по желанию, 1–2 предложения</span>
                        </label>
                        <textarea
                          id={`cc-${c.id}`}
                          value={competencyComments[c.id] ?? ""}
                          onChange={(e) =>
                            setCompetencyComments((prev) => ({
                              ...prev,
                              [c.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="input-text mt-1.5 text-sm leading-relaxed"
                          placeholder="Например: на встречах по проекту X заметно, что…"
                        />
                      </div>
                    ) : null}
                  </fieldset>
                );
              })}
            </section>

            <section className="mt-6 border-t border-slate-100 pt-5">
              <label className="text-base font-semibold text-slate-900" htmlFor="fb">
                Общий комментарий
              </label>
              <p className="mt-1 text-sm text-slate-600">
                Обязательное поле (от 20 символов). Лучше всего работают конкретные ситуации и поведение, а не общие
                слова.
              </p>
              <textarea
                id="fb"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                className="input-text mt-2 resize-y text-sm leading-relaxed"
                placeholder="Например: в последнем квартале при совместной работе над задачей…"
              />
              <div className="mt-1.5 flex justify-between text-xs">
                <span className={text.trim().length >= 20 ? "font-medium text-emerald-700" : "text-amber-700"}>
                  {text.trim().length >= 20 ? "Можно отправить" : `Минимум ещё ${Math.max(0, 20 - text.trim().length)} символов`}
                </span>
                <span className="tabular-nums text-slate-400">{text.length}</span>
              </div>
            </section>

            {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}

            <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200/80 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <button type="submit" disabled={!canSubmit} className="btn-primary h-11 w-full text-sm sm:h-auto sm:min-w-[200px]">
                Отправить анкету
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
