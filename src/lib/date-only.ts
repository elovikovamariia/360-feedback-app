/** Парсинг YYYY-MM-DD в Date в полдень локального времени (избегаем сдвига UTC). */
export function parseLocalDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Сегодняшняя дата (локальный календарь) YYYY-MM-DD — клиент или сервер */
export function todayLocalISODate(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function maxISODate(a: string, b: string): string {
  return a >= b ? a : b;
}
