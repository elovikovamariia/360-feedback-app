/**
 * Учебный макет агрегатов «как при крупной выборке» (~2000 оцениваемых).
 * Не привязан к реальным ответам в БД — только для визуального ориентира в UI.
 */

export const ENTERPRISE_ILLUSTRATION_HEADLINE = "~2 000 оцениваемых";

export const enterpriseIllustrationStats = {
  revieweeCount: 2004,
  assignmentTotal: 8018,
  assignmentCompleted: 7964,
  completionPct: 99.3,
  /** Среднее «окружение» по всем оцениваемым (все роли кроме self), шкала 1–5 */
  companyOthersAvg: 3.62,
  companySelfAvg: 3.78,
  /** Доля оцениваемых с |self − others| ≥ 0.5 */
  strongGapSharePct: 18,
  /** Сколько оцениваемых попало в «внимание» по эвристикам (агрегат) */
  heuristicAlerts: 127,
  heuristicWatch: 384,
};

/** Гистограмма: сколько оцениваемых с данным средним баллом окружения (интервалы по оси X) */
export const enterpriseOthersAvgHistogram = [
  { range: "2,0–2,5", count: 42 },
  { range: "2,5–3,0", count: 186 },
  { range: "3,0–3,5", count: 612 },
  { range: "3,5–4,0", count: 798 },
  { range: "4,0–4,5", count: 312 },
  { range: "4,5–5,0", count: 54 },
];

/** Средние по компании по компетенциям (окружение), плюс межквартильный разброс оцениваемых */
export const enterpriseCompetencyCompanyRollup = [
  { title: "Patient first", mean: 3.71, p25: 3.4, p75: 4.0 },
  { title: "Play to win", mean: 3.58, p25: 3.2, p75: 3.9 },
  { title: "Unite efforts", mean: 3.82, p25: 3.5, p75: 4.1 },
  { title: "Embrace change", mean: 3.49, p25: 3.1, p75: 3.8 },
  { title: "Less is more", mean: 3.51, p25: 3.2, p75: 3.85 },
];

export type EnterpriseSegmentRow = {
  name: string;
  reviewees: number;
  completionPct: number;
  othersAvg: number;
};

export const enterpriseSegmentRollup: EnterpriseSegmentRow[] = [
  { name: "Клиентский успех и сервис", reviewees: 612, completionPct: 99.5, othersAvg: 3.74 },
  { name: "Продукт и инженерия", reviewees: 884, completionPct: 99.1, othersAvg: 3.58 },
  { name: "Корпоративные функции", reviewees: 308, completionPct: 98.7, othersAvg: 3.61 },
  { name: "Региональные офисы", reviewees: 200, completionPct: 99.5, othersAvg: 3.55 },
];

export const enterpriseTextThemes = [
  { theme: "Перегруз и приоритизация", mentions: 1840, note: "Часто в связке с «Less is more»" },
  { theme: "Скорость изменений и коммуникация", mentions: 1210, note: "Embrace change / Unite efforts" },
  { theme: "Ожидания клиента vs внутренние процессы", mentions: 962, note: "Patient first" },
  { theme: "Ответственность за результат в кросс-функциях", mentions: 756, note: "Play to win" },
  { theme: "Обратная связь руководителю", mentions: 520, note: "Разные роли респондентов" },
];

export const enterpriseRiskRollup = [
  { category: "Выгорание / перегруз", levelHigh: 412, levelMed: 891 },
  { category: "Доверие и прозрачность", levelHigh: 289, levelMed: 640 },
  { category: "Лидерство и делегирование", levelHigh: 356, levelMed: 702 },
];
