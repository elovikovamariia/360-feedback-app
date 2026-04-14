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

/** YYYY-MM-DD → ДД.ММ.ГГГГ (для отображения и ввода в формах). */
export function isoToRuDots(iso: string): string {
  const dt = parseLocalDateOnly(iso.trim());
  if (!dt) return "";
  const d = dt.getDate();
  const mo = dt.getMonth() + 1;
  const y = dt.getFullYear();
  return `${String(d).padStart(2, "0")}.${String(mo).padStart(2, "0")}.${y}`;
}

/** ДД.ММ.ГГГГ → YYYY-MM-DD или null, если строка неполная/некорректная. */
export function ruDotsToISODate(ru: string): string | null {
  const t = ru.trim().replace(/\s/g, "");
  if (!t) return null;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Оставляет только цифры и точки, не длиннее ДД.ММ.ГГГГ. */
export function filterRuDateTyping(next: string): string {
  return next.replace(/[^\d.]/g, "").slice(0, 10);
}

