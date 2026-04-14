"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { appFetch } from "@/lib/app-fetch";
import {
  buildSemesterOptions,
  defaultPeriodForSemester,
  formatCycleNameFromSemester,
  parseSemesterKey,
  pickDefaultSemesterKey,
} from "@/lib/cycle-semester";
import { isoToRuDots, maxISODate, todayLocalISODate } from "@/lib/date-only";

type Props = { existingCycleNames: string[]; onCreated?: () => void };

export function LaunchCycleForm({ existingCycleNames, onCreated }: Props) {
  const router = useRouter();
  const todayStr = useMemo(() => todayLocalISODate(), []);

  const { fromYear, toYear } = useMemo(() => {
    const y = new Date().getFullYear();
    return { fromYear: y - 1, toYear: y + 3 };
  }, []);

  const options = useMemo(() => buildSemesterOptions(fromYear, toYear), [fromYear, toYear]);

  const [semesterKey, setSemesterKey] = useState(() =>
    pickDefaultSemesterKey(existingCycleNames, fromYear, toYear),
  );
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [collectionStart, setCollectionStart] = useState(todayStr);
  const [collectionEnd, setCollectionEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = parseSemesterKey(semesterKey);
    if (!p) return;
    const { startsAt: ps, endsAt: pe } = defaultPeriodForSemester(p.year, p.half);
    setPeriodStart(ps);
    setPeriodEnd(pe);
    const t = todayLocalISODate();
    setCollectionStart(t);
    setCollectionEnd("");
  }, [semesterKey]);

  const parsed = parseSemesterKey(semesterKey);
  const name = parsed ? formatCycleNameFromSemester(parsed.year, parsed.half) : "";
  const nameTaken = existingCycleNames.some((n) => n.trim() === name);

  const collectionEndMin = maxISODate(todayStr, collectionStart || todayStr);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name) {
      setErr("Выберите полугодие");
      return;
    }
    if (nameTaken) {
      setErr("Цикл с таким названием уже есть — выберите другое полугодие или удалите существующий цикл.");
      return;
    }
    if (!periodStart || !periodEnd) {
      setErr("Не удалось определить период полугодия");
      return;
    }
    if (!collectionStart || !collectionEnd) {
      setErr("Укажите даты начала и окончания сбора оценок");
      return;
    }
    if (collectionStart < todayStr) {
      setErr("Дата начала сбора не может быть раньше сегодняшнего дня");
      return;
    }
    if (collectionEnd < todayStr) {
      setErr("Дата окончания сбора не может быть раньше сегодняшнего дня");
      return;
    }
    if (collectionEnd < collectionStart) {
      setErr("Окончание сбора не может быть раньше начала");
      return;
    }
    setLoading(true);
    try {
      const res = await appFetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startsAt: collectionStart,
          endsAt: collectionEnd,
          semesterPeriodStartsAt: periodStart,
          semesterPeriodEndsAt: periodEnd,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка");
      onCreated?.();
      router.push(`/hr/cycles/${json.id}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card overflow-hidden shadow-soft">
      <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50/80 to-white px-6 py-4 sm:px-7">
        <h2 className="text-lg font-semibold text-slate-900">Запустить новый цикл</h2>
        <p className="mt-1 text-sm text-slate-600">
          Полугодие задаёт календарный период (I или II полугодие года) и название цикла. Границы периода подставляются
          автоматически (ДД.ММ.ГГГГ). Сбор оценок 360° — отдельные даты: начало сбора по умолчанию — сегодня, дату
          окончания выберите в календаре; прошедшие даты недоступны. После создания система создаст анкеты: самооценка,
          руководитель и один коллега из команды.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-5 p-6 sm:p-7">
        <div>
          <label htmlFor="cycle-semester" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Полугодие
          </label>
          <select
            id="cycle-semester"
            className="input-text mt-1.5 w-full"
            value={semesterKey}
            onChange={(e) => setSemesterKey(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-slate-600">
            Название цикла: <span className="font-semibold text-slate-900">{name || "—"}</span>
          </p>
          {nameTaken ? (
            <p className="mt-1 text-sm text-amber-800">Такой цикл уже есть в списке ниже.</p>
          ) : null}
        </div>

        <fieldset className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Период выбранного полугодия
          </legend>
          <p className="mt-2 text-sm text-slate-600">
            Границы календарного полугодия подставляются автоматически (только для отображения и отчётов).
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Начало периода</span>
              <p className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
                {periodStart ? isoToRuDots(periodStart) : "—"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Окончание периода</span>
              <p className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
                {periodEnd ? isoToRuDots(periodEnd) : "—"}
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-brand-100/80 bg-brand-50/20 p-4 sm:p-5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
            Сбор оценок 360°
          </legend>
          <p className="mt-2 text-sm text-slate-600">
            Выберите даты встроенным календарём браузера. Рядом — тот же день в формате ДД.ММ.ГГГГ для сверки.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="collection-start" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Начало сбора
              </label>
              <input
                id="collection-start"
                className="input-text mt-1.5 min-h-[44px] w-full"
                type="date"
                value={collectionStart}
                min={todayStr}
                required
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setCollectionStart(todayStr);
                    setCollectionEnd((prev) => (prev ? maxISODate(prev, todayStr) : ""));
                    return;
                  }
                  const s = v < todayStr ? todayStr : v;
                  setCollectionStart(s);
                  setCollectionEnd((prev) => (prev ? maxISODate(prev, s) : ""));
                }}
              />
              {collectionStart ? (
                <p className="mt-1.5 text-xs text-slate-500">ДД.ММ.ГГГГ: {isoToRuDots(collectionStart)}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="collection-end" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Окончание сбора
              </label>
              <input
                id="collection-end"
                className="input-text mt-1.5 min-h-[44px] w-full"
                type="date"
                value={collectionEnd}
                min={collectionEndMin}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setCollectionEnd("");
                    return;
                  }
                  if (v < collectionEndMin) setCollectionEnd(collectionEndMin);
                  else setCollectionEnd(v);
                }}
              />
              {collectionEnd ? (
                <p className="mt-1.5 text-xs text-slate-500">ДД.ММ.ГГГГ: {isoToRuDots(collectionEnd)}</p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">По умолчанию пусто — выберите дату окончания сбора.</p>
              )}
            </div>
          </div>
        </fieldset>

        {err ? <p className="text-sm text-red-700">{err}</p> : null}

        <button
          type="submit"
          disabled={loading || nameTaken || !name || !periodStart || !periodEnd}
          className="btn-primary min-h-[44px] px-8"
        >
          {loading ? "Создание…" : "Создать цикл"}
        </button>
      </form>
    </section>
  );
}
