/** Ключ полугодия: «2026-1» = I полугодие 2026, «2026-2» = II полугодие 2026 */

export function formatCycleNameFromSemester(year: number, half: 1 | 2): string {
  const roman = half === 1 ? "I" : "II";
  return `360° · ${roman} полугодие ${year}`;
}

export function semesterKey(year: number, half: 1 | 2): string {
  return `${year}-${half}`;
}

export function parseSemesterKey(key: string): { year: number; half: 1 | 2 } | null {
  const m = /^(\d{4})-(1|2)$/.exec(key.trim());
  if (!m) return null;
  return { year: Number(m[1]), half: m[2] === "2" ? 2 : 1 };
}

export function defaultPeriodForSemester(year: number, half: 1 | 2): { startsAt: string; endsAt: string } {
  if (half === 1) {
    return { startsAt: `${year}-01-01`, endsAt: `${year}-06-30` };
  }
  return { startsAt: `${year}-07-01`, endsAt: `${year}-12-31` };
}

export type SemesterOption = { key: string; year: number; half: 1 | 2; label: string; name: string };

export function buildSemesterOptions(fromYear: number, toYear: number): SemesterOption[] {
  const out: SemesterOption[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    for (const half of [1, 2] as const) {
      const key = semesterKey(y, half);
      out.push({
        key,
        year: y,
        half,
        label: `${half === 1 ? "I" : "II"} полугодие ${y}`,
        name: formatCycleNameFromSemester(y, half),
      });
    }
  }
  return out;
}

/** Первое полугодие в диапазоне [fromYear,toYear], название которого ещё не занято */
export function pickDefaultSemesterKey(existingNames: string[], fromYear: number, toYear: number): string {
  const used = new Set(existingNames.map((n) => n.trim()));
  const options = buildSemesterOptions(fromYear, toYear);
  const firstFree = options.find((o) => !used.has(o.name));
  return firstFree?.key ?? options[options.length - 1]!.key;
}
