/**
 * Архив прошлых полугодий для экрана «Мои результаты».
 * Полугодия строятся без разрывов: каждое окно — на 6 месяцев раньше периода,
 * заданного HR в текущем цикле (semesterPeriod*).
 */

export type EmployeePastSemesterRow = {
  id: string;
  title: string;
  periodLabel: string;
  semesterPeriodStartsAt: string;
  semesterPeriodEndsAt: string;
  selfAvg: number;
  othersAvg: number;
  summary: string;
};

const monthDayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  const day = out.getDate();
  out.setMonth(out.getMonth() + months);
  if (out.getDate() !== day) out.setDate(0);
  return out;
}

function halfYearTitleRu(start: Date): string {
  const m = start.getMonth() + 1;
  const y = start.getFullYear();
  return m <= 6 ? `1 полугодие ${y}` : `2 полугодие ${y}`;
}

function formatRangeRu(start: Date, end: Date): string {
  return `${monthDayFmt.format(start)} — ${monthDayFmt.format(end)}`;
}

/** Если HR не задал даты — берём календарное полугодие от текущей даты. */
export function fallbackSemesterWindowFromNow(now = new Date()): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m < 6) {
    return { start: new Date(y, 0, 1), end: new Date(y, 5, 30, 23, 59, 59, 999) };
  }
  return { start: new Date(y, 6, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) };
}

export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso || !iso.trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param pastHalfYears сколько полных полугодий **до** текущего HR-окна (по умолчанию 4 ≈ два года назад).
 */
export function buildContiguousPastSemesters(
  hrSemesterStart: Date,
  hrSemesterEnd: Date,
  pastHalfYears = 4,
): EmployeePastSemesterRow[] {
  const rows: EmployeePastSemesterRow[] = [];
  for (let i = 1; i <= pastHalfYears; i++) {
    const start = addMonths(hrSemesterStart, -6 * i);
    const end = addMonths(hrSemesterEnd, -6 * i);
    const title = halfYearTitleRu(start);
    const periodLabel = formatRangeRu(start, end);
    const selfAvg = Math.round((4.35 - i * 0.09 + (i === 1 ? 0.05 : 0)) * 10) / 10;
    const othersAvg = Math.round((3.45 + i * 0.18) * 10) / 10;
    const summary = summaryForPastSlot(i);
    rows.push({
      id: `past-${start.toISOString().slice(0, 10)}`,
      title,
      periodLabel,
      semesterPeriodStartsAt: start.toISOString(),
      semesterPeriodEndsAt: end.toISOString(),
      selfAvg,
      othersAvg,
      summary,
    });
  }
  return rows;
}

function summaryForPastSlot(distanceFromCurrentHrHalf: number): string {
  const k = Math.min(4, Math.max(1, distanceFromCurrentHrHalf));
  const stories: Record<number, string> = {
    1: "Недавний закрытый период: выровняли ожидания с руководителем по приоритетам; окружение чуть подтянуло оценку коммуникации.",
    2: "Середина «второго года» в компании: рост предсказуемости сроков; в комментариях чаще звучали «надёжность» и «инициатива».",
    3: "Период адаптации к продуктовым ритмам; заметен разрыв самооценки и коллег по влиянию на результат — отработано на 1:1.",
    4: "Старт в роли: фокус на вовлечённости и базовых компетенциях; HR зафиксировал договорённости по обратной связи после встреч.",
  };
  return stories[k]!;
}

export function formatHrSemesterSummary(
  semesterPeriodStartsAt: string | null | undefined,
  semesterPeriodEndsAt: string | null | undefined,
): string | null {
  const s = parseIsoDate(semesterPeriodStartsAt ?? null);
  const e = parseIsoDate(semesterPeriodEndsAt ?? null);
  if (!s || !e) return null;
  return `${halfYearTitleRu(s)} · ${formatRangeRu(s, e)}`;
}

export function buildEmployeePastSemesterArchive(
  semesterPeriodStartsAt: string | null | undefined,
  semesterPeriodEndsAt: string | null | undefined,
  options?: { pastHalfYears?: number },
): EmployeePastSemesterRow[] {
  const s = parseIsoDate(semesterPeriodStartsAt ?? null);
  const e = parseIsoDate(semesterPeriodEndsAt ?? null);
  const anchor = s && e ? { start: s, end: e } : fallbackSemesterWindowFromNow();
  return buildContiguousPastSemesters(anchor.start, anchor.end, options?.pastHalfYears ?? 4);
}
