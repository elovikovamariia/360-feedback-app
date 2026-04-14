import type { Competency } from "@prisma/client";

export type AiBenchmarkBundle = {
  company: {
    overallOthersAvg: number | null;
    byCompetencyTitle: Record<string, number>;
    nReviewees: number;
  };
  jobTitle: {
    jobTitle: string | null;
    overallOthersAvg: number | null;
    nRevieweesInCohort: number;
  };
  previous: {
    cycleName: string;
    selfAvg: number | null;
    othersAvg: number | null;
  } | null;
};

export type AiReportShape = {
  version: 2;
  insights: {
    selfVsOthers: {
      selfAvg: number | null;
      othersAvg: number | null;
      delta: number | null;
      interpretation: string;
    };
    blindSpots: string[];
    topStrengths: { competency: string; scoreContext: string; evidence: string }[];
    topDevelopment: { competency: string; scoreContext: string; evidence: string }[];
    crossRoleContradictions: string[];
  };
  textAnalysis: {
    narrativeSummary: string;
    recurringThemes: string[];
    sentiment: "positive" | "mixed" | "negative" | "neutral";
    sentimentRationale: string;
    moderationNote: string;
    anonymousQuotes: { text: string; themeTag: string }[];
  };
  benchmarking: {
    vsCompany: {
      overallDelta: number | null;
      byCompetency: { competency: string; othersDelta: number | null }[];
      footnote: string;
    };
    vsJobTitle: { cohortN: number; overallDelta: number | null; footnote: string };
    vsPreviousCycle: null | {
      cycleName: string;
      selfDelta: number | null;
      othersDelta: number | null;
      footnote: string;
    };
  };
  riskSignals: {
    category: "burnout" | "trust" | "leadership" | "conflict" | "demotivation" | "other";
    level: "low" | "medium" | "high";
    signal: string;
    suggestedHrAction: string;
  }[];
  recommendations: {
    plan90Days: { period: string; focus: string; milestones: string[] }[];
    concreteActions: string[];
    forManager: string[];
    learningAndCoaching: string[];
  };
};

type LegacyFlatReport = {
  summary: string;
  themes: string[];
  patterns: string[];
  strengths: string[];
  growth: string[];
  contradictions: string[];
  recommendations: string[];
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function othersOnlyAvg(row: {
  SELF?: number;
  MANAGER?: number;
  PEER?: number;
  SUBORDINATE?: number;
}): number | null {
  const parts: number[] = [];
  if (row.MANAGER != null) parts.push(row.MANAGER);
  if (row.PEER != null) parts.push(row.PEER);
  if (row.SUBORDINATE != null) parts.push(row.SUBORDINATE);
  if (parts.length === 0) return null;
  return round1(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function selfAvgRow(row: { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }) {
  return row.SELF != null ? row.SELF : null;
}

/** Вычисления топов и «слепых зон» из средних по компетенциям (эвристика и подсказка модели). */
export function deriveCompetencyAnalytics(
  roleAverages: Record<string, { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }>,
) {
  const rows: {
    competency: string;
    self: number | null;
    others: number | null;
    gap: number | null;
    manager: number | null;
    peer: number | null;
  }[] = [];
  for (const [competency, row] of Object.entries(roleAverages)) {
    const self = selfAvgRow(row);
    const others = othersOnlyAvg(row);
    const gap = self != null && others != null ? round1(self - others) : null;
    rows.push({
      competency,
      self,
      others,
      gap,
      manager: row.MANAGER ?? null,
      peer: row.PEER ?? null,
    });
  }
  const withOthers = rows.filter((r) => r.others != null) as (typeof rows[number] & { others: number })[];
  const sortedStrength = [...withOthers].sort((a, b) => b.others - a.others);
  const sortedDev = [...withOthers].sort((a, b) => a.others - b.others);
  const blindSpots = rows
    .filter((r) => r.gap != null && r.gap > 0.45)
    .map(
      (r) =>
        `По «${r.competency}» самооценка выше мнения окружения примерно на ${r.gap} балла — стоит сверить ожидания и наблюдаемое поведение.`,
    );
  const contradictions: string[] = [];
  for (const r of rows) {
    if (r.manager != null && r.peer != null && Math.abs(r.manager - r.peer) >= 1.0) {
      contradictions.push(
        `По «${r.competency}» заметный разрыв между оценкой руководителя (${r.manager}) и коллег (${r.peer}) — полезно выяснить контекст задач и наблюдений.`,
      );
    }
  }
  return {
    topStrengths: sortedStrength.slice(0, 3).map((r) => ({
      competency: r.competency,
      scoreContext: `Средняя оценка окружения: ${r.others} (шкала 1–5)`,
      evidence: `Наиболее стабильно высокие оценки окружения по «${r.competency}» — опора для похвалы и делегирования.`,
    })),
    topDevelopment: sortedDev.slice(0, 3).map((r) => ({
      competency: r.competency,
      scoreContext: `Средняя оценка окружения: ${r.others} (шкала 1–5)`,
      evidence: `По «${r.competency}» среднее окружения ниже остальных компетенций — приоритетная зона для практик и обратной связи.`,
    })),
    blindSpots,
    crossRoleContradictions: contradictions.slice(0, 5),
  };
}

function heuristicSentiment(text: string): { sentiment: AiReportShape["textAnalysis"]["sentiment"]; rationale: string } {
  const t = text.toLowerCase();
  const neg =
    (t.match(/не хватает|перегруз|выгор|устал|конфликт|страх|токсич|груб|игнор|бессильн|демотив/gi) ?? []).length;
  const pos =
    (t.match(/ценю|спасибо|отличн|надёжн|профессионал|конструктив|поддерж|сильн|довер/gi) ?? []).length;
  if (neg >= 4 && neg > pos + 2)
    return { sentiment: "negative", rationale: "В обезличенных фрагментах часто встречаются маркеры напряжения и усталости." };
  if (pos >= 5 && pos > neg + 2)
    return { sentiment: "positive", rationale: "Преобладают конструктивные и поддерживающие формулировки." };
  if (neg === 0 && pos === 0)
    return { sentiment: "neutral", rationale: "Недостаточно эмоционально окрашенной лексики для уверенной классификации." };
  return { sentiment: "mixed", rationale: "Сочетание позитивных отзывов и точечных запросов на изменения." };
}

function demoRisks(args: {
  selfAvg: number | null;
  othersAvg: number | null;
  text: string;
}): AiReportShape["riskSignals"] {
  const out: AiReportShape["riskSignals"] = [];
  const gap =
    args.selfAvg != null && args.othersAvg != null ? round1(args.selfAvg - args.othersAvg) : null;
  if (gap != null && gap > 0.5) {
    out.push({
      category: "demotivation",
      level: "medium",
      signal: "Разрыв «самооценка выше окружения» может указывать на несовпадение ожиданий или недополучение обратной связи.",
      suggestedHrAction: "Калибровочная сессия с руководителем; разговор 1:1 по фактическим кейсам, без ярлыков.",
    });
  }
  if (/перегруз|аврал|не успеваю|выгор|устал/i.test(args.text)) {
    out.push({
      category: "burnout",
      level: "medium",
      signal: "В текстах звучит тема высокой нагрузки и нехватки ресурса.",
      suggestedHrAction: "Проверить портфель задач и политику overtime; при необходимости — опрос eNPS/Well-being.",
    });
  }
  if (/не довер|боюсь говор|молчат|скрывают/i.test(args.text)) {
    out.push({
      category: "trust",
      level: "high",
      signal: "Единичные маркеры сниженного психологического доверия — требуют аккуратной эскалации к HRBP.",
      suggestedHrAction: "Не использовать 360 как расследование; отдельный канал 1:1 с HR и политика безопасности.",
    });
  }
  if (/руковод|лидер|директ|не объясня|неясн/i.test(args.text) && /ожидан|прозрачн|решени/i.test(args.text)) {
    out.push({
      category: "leadership",
      level: "low",
      signal: "Точечные запросы к ясности ожиданий со стороны руководства — не обязательно системная проблема.",
      suggestedHrAction: "Уточнить у команды критерии успеха и ритуалы статуса; при повторении — программа для руководителей.",
    });
  }
  if (out.length === 0) {
    out.push({
      category: "other",
      level: "low",
      signal: "Явных критических паттернов по объёму текста не выявлено; мониторинг в следующем цикле.",
      suggestedHrAction: "Стандартный разбор 1:1 и фиксация 1–2 целей развития.",
    });
  }
  return out.slice(0, 6);
}

function demoQuotes(text: string): AiReportShape["textAnalysis"]["anonymousQuotes"] {
  const lines = text
    .split(/\n+/)
    .map((s) => s.replace(/^Фрагмент \d+:\s*/i, "").trim())
    .filter((s) => s.length > 40 && s.length < 320);
  const pick = lines.slice(0, 3);
  return pick.map((text, i) => ({
    text: `«${text.slice(0, 220)}${text.length > 220 ? "…" : ""}»`,
    themeTag: ["Unite efforts", "Patient first", "Less is more"][i] ?? "Общее",
  }));
}

export function migrateLegacyFlatToV2(old: LegacyFlatReport): AiReportShape {
  return {
    version: 2,
    insights: {
      selfVsOthers: {
        selfAvg: null,
        othersAvg: null,
        delta: null,
        interpretation: old.summary,
      },
      blindSpots: [],
      topStrengths: old.strengths.slice(0, 3).map((evidence) => ({
        competency: "—",
        scoreContext: "Архивный отчёт",
        evidence,
      })),
      topDevelopment: old.growth.slice(0, 3).map((evidence) => ({
        competency: "—",
        scoreContext: "Архивный отчёт",
        evidence,
      })),
      crossRoleContradictions: [...old.contradictions, ...old.patterns].slice(0, 8),
    },
    textAnalysis: {
      narrativeSummary: old.summary,
      recurringThemes: old.themes,
      sentiment: "mixed",
      sentimentRationale: "Ранний формат отчёта без отдельного анализа тональности.",
      moderationNote:
        "Перегенерируйте отчёт для полной HR-аналитики (версия 2): бенчмарки, риски и план на 90 дней.",
      anonymousQuotes: [],
    },
    benchmarking: {
      vsCompany: {
        overallDelta: null,
        byCompetency: [],
        footnote: "Бенчмарки недоступны в архивном формате отчёта.",
      },
      vsJobTitle: { cohortN: 0, overallDelta: null, footnote: "—" },
      vsPreviousCycle: null,
    },
    riskSignals: [],
    recommendations: {
      plan90Days: [
        { period: "0–30 дней", focus: "Синхронизация ожиданий", milestones: old.recommendations.slice(0, 2) },
        { period: "31–60 дней", focus: "Поведение в работе", milestones: old.recommendations.slice(2, 4) },
        { period: "61–90 дней", focus: "Итог и ИПР", milestones: old.recommendations.slice(4, 6) },
      ],
      concreteActions: old.recommendations,
      forManager: ["Согласовать с сотрудником 1–2 приоритета развития и наблюдаемые индикаторы."],
      learningAndCoaching: ["Оценить необходимость коучинга или тренинга по темам из отчёта."],
    },
  };
}

export function normalizeStoredAiReport(raw: unknown): AiReportShape | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version === 2 && r.insights && r.textAnalysis) return raw as AiReportShape;
  if (typeof r.summary === "string" && Array.isArray(r.themes)) {
    return migrateLegacyFlatToV2(raw as LegacyFlatReport);
  }
  return null;
}

export function buildDemoAiReport(input: {
  revieweeName: string;
  selfAvg: number | null;
  othersAvg: number | null;
  anonymousNotes: string;
  roleAverages: Record<string, { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }>;
  benchmarks: AiBenchmarkBundle;
}): AiReportShape {
  const first = input.revieweeName.split(/\s+/)[0] ?? input.revieweeName;
  const delta =
    input.selfAvg != null && input.othersAvg != null
      ? round1(input.selfAvg - input.othersAvg)
      : null;

  const derived = deriveCompetencyAnalytics(input.roleAverages);
  const hasRichText = input.anonymousNotes.trim().length > 120;
  const summaryLead = `Сводка для HR и руководителя по ${input.revieweeName}: профиль по цифрам и текстам подходит для развивающего разговора и планирования ИПР.`;
  const summaryExtra = hasRichText
    ? " Обезличенных комментариев достаточно для уточнения формулировок без указания авторов."
    : "";

  const byComp: AiReportShape["benchmarking"]["vsCompany"]["byCompetency"] = [];
  for (const [competency, row] of Object.entries(input.roleAverages)) {
    const mine = othersOnlyAvg(row);
    const bench = input.benchmarks.company.byCompetencyTitle[competency];
    if (mine != null && bench != null) {
      byComp.push({ competency, othersDelta: round1(mine - bench) });
    }
  }

  const overallDelta =
    input.othersAvg != null && input.benchmarks.company.overallOthersAvg != null
      ? round1(input.othersAvg - input.benchmarks.company.overallOthersAvg)
      : null;

  const jtDelta =
    input.othersAvg != null && input.benchmarks.jobTitle.overallOthersAvg != null
      ? round1(input.othersAvg - input.benchmarks.jobTitle.overallOthersAvg)
      : null;

  const prev = input.benchmarks.previous;
  const selfDeltaPrev =
    prev && input.selfAvg != null && prev.selfAvg != null ? round1(input.selfAvg - prev.selfAvg) : null;
  const othersDeltaPrev =
    prev && input.othersAvg != null && prev.othersAvg != null ? round1(input.othersAvg - prev.othersAvg) : null;

  const { sentiment, rationale } = heuristicSentiment(input.anonymousNotes);

  return {
    version: 2,
    insights: {
      selfVsOthers: {
        selfAvg: input.selfAvg,
        othersAvg: input.othersAvg,
        delta,
        interpretation:
          `${summaryLead}${summaryExtra} Среднее «я»: ${input.selfAvg ?? "—"}, среднее окружения: ${input.othersAvg ?? "—"}.` +
          (delta != null
            ? ` Разница (я − другие): ${delta > 0 ? "+" : ""}${delta}. ${
                Math.abs(delta) > 0.45
                  ? "Это зона внимания для калибровки ожиданий."
                  : "Значимых расхождений по средним нет."
              }`
            : ""),
      },
      blindSpots: derived.blindSpots.length
        ? derived.blindSpots
        : [
            "Сильного расхождения самооценки и окружения по компетенциям не зафиксировано — всё равно проверьте отдельные роли на радаре.",
          ],
      topStrengths: derived.topStrengths,
      topDevelopment: derived.topDevelopment,
      crossRoleContradictions: derived.crossRoleContradictions.length
        ? derived.crossRoleContradictions
        : ["Существенных противоречий между ролями по одной компетенции не выявлено."],
    },
    textAnalysis: {
      narrativeSummary:
        `Качественный слой фидбека по ${input.revieweeName}: ` +
        `${sentiment === "positive" ? "преобладает поддерживающий тон" : sentiment === "negative" ? "есть напряжённые формулировки" : "смешанный, деловой тон"}. ` +
        `Ключевые темы совпадают с сильными сторонами и зонами роста в числовом блоке.`,
      recurringThemes: [
        "Unite efforts и снятие блокеров",
        "Patient first и качество поставки",
        "Less is more: приоритеты и прозрачность статуса",
      ],
      sentiment,
      sentimentRationale: rationale,
      moderationNote:
        "Фильтрация: оскорбления, ПДн и явно нерелевантный оффтоп отсекаются политикой модерации на сервере; в отчёт не попадают идентификаторы авторов.",
      anonymousQuotes: demoQuotes(input.anonymousNotes),
    },
    benchmarking: {
      vsCompany: {
        overallDelta,
        byCompetency: byComp.slice(0, 8),
        footnote:
          input.benchmarks.company.nReviewees > 0
            ? `Когорта цикла: ${input.benchmarks.company.nReviewees} оцениваемых; сравнение — по оценкам не-SELF.`
            : "Недостаточно данных для бенчмарка по компании.",
      },
      vsJobTitle: {
        cohortN: input.benchmarks.jobTitle.nRevieweesInCohort,
        overallDelta: jtDelta,
        footnote:
          input.benchmarks.jobTitle.jobTitle && input.benchmarks.jobTitle.nRevieweesInCohort > 0
            ? `Должность в справочнике: «${input.benchmarks.jobTitle.jobTitle}», в когорте ${input.benchmarks.jobTitle.nRevieweesInCohort} человек(а).`
            : "Должность не задана или когорта мала — бенчмарк по роли условный.",
      },
      vsPreviousCycle: prev
        ? {
            cycleName: prev.cycleName,
            selfDelta: selfDeltaPrev,
            othersDelta: othersDeltaPrev,
            footnote:
              selfDeltaPrev != null || othersDeltaPrev != null
                ? "Динамика относительно предыдущего цикла в базе (при одном сохранённом цикле сравнение может быть ограниченным)."
                : "Нет парных средних для сравнения с прошлым циклом.",
          }
        : null,
    },
    riskSignals: demoRisks({
      selfAvg: input.selfAvg,
      othersAvg: input.othersAvg,
      text: input.anonymousNotes,
    }),
    recommendations: {
      plan90Days: [
        {
          period: "0–30 дней",
          focus: "Синхронизация ожиданий и приоритетов",
          milestones: [
            `Разбор отчёта 1:1 с ${first}: 2 сильные стороны и 1 зона роста без сравнения с другими людьми.`,
            "Зафиксировать топ-3 задачи квартала и явные trade-off по загрузке.",
          ],
        },
        {
          period: "31–60 дней",
          focus: "Поведение и ритуалы",
          milestones: [
            "Еженедельный 15-минутный стек приоритетов с руководителем.",
            "Правило эскалации рисков по срокам за N дней (N — договорённость команды).",
          ],
        },
        {
          period: "61–90 дней",
          focus: "Итог и ИПР",
          milestones: [
            "Повторная самооценка по 1–2 компетенциям с индикатором наблюдения.",
            "Решение по обучению или коучингу на следующий квартал.",
          ],
        },
      ],
      concreteActions: [
        "Внедрить короткий статус по зависимостям в общем канале 2 раза в неделю.",
        "Для задач с внешним клиентом — чек-лист критериев приёмки до старта работ.",
        "Один слот в календаре «глубокая работа» без встреч (согласовать с командой).",
      ],
      forManager: [
        `Явно озвучить ${first}, какие два поведения вы хотите усилить в квартале и как это увидите в работе.`,
        "Не использовать формулировки отчёта как оценку личности — только наблюдаемое поведение и договорённости.",
        "При расхождении мнений ролей — отдельный короткий созвон с коллегой-респондентом (без нарушения анонимности в адрес сотрудника).",
      ],
      learningAndCoaching: [
        "Тренинг по приоритизации и управлению перегрузом (внутренний или внешний).",
        "Коуч-сессии по сложным переговорам или фасилитации, если тема лидерства повторяется в циклах.",
      ],
    },
  };
}

export async function generateAiReportWithOpenAI(args: {
  revieweeName: string;
  competencies: Competency[];
  roleAverages: Record<string, { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }>;
  anonymousTextBundle: string;
  selfAvg: number | null;
  othersAvg: number | null;
  benchmarks: AiBenchmarkBundle;
}): Promise<{ report: AiReportShape; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  if (!apiKey) {
    return {
      model: "demo-local",
      report: buildDemoAiReport({
        revieweeName: args.revieweeName,
        selfAvg: args.selfAvg,
        othersAvg: args.othersAvg,
        anonymousNotes: args.anonymousTextBundle,
        roleAverages: args.roleAverages,
        benchmarks: args.benchmarks,
      }),
    };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const derived = deriveCompetencyAnalytics(args.roleAverages);

  const sys = `Ты ведущий HR-аналитик (уровень CHRO) в компании 500–5000 сотрудников. Пиши по-русски.
Правила:
- Во входных текстах фрагменты могут начинаться с префиксов [Самооценка], [Руководитель], [Коллега], [Подчинённый] — это источник смысла (не имя человека); учитывай при интерпретации и в narrativeSummary.
- Не раскрывай личности респондентов; не приписывай цитаты конкретным людям.
- Короткие анонимные «цитаты» — обобщённые перефразы (до ~200 символов), без имён.
- Не ставь медицинских диагнозов; риски формулируй как сигналы для HR-проверки, не как факты.
- Используй только переданные средние и тексты; не выдумывай цифры бенчмарков.
- Верни СТРОГО один JSON по схеме версии 2:

{
  "version": 2,
  "insights": {
    "selfVsOthers": { "selfAvg": number|null, "othersAvg": number|null, "delta": number|null, "interpretation": string },
    "blindSpots": string[],
    "topStrengths": [{ "competency": string, "scoreContext": string, "evidence": string }],
    "topDevelopment": [{ "competency": string, "scoreContext": string, "evidence": string }],
    "crossRoleContradictions": string[]
  },
  "textAnalysis": {
    "narrativeSummary": string,
    "recurringThemes": string[],
    "sentiment": "positive"|"mixed"|"negative"|"neutral",
    "sentimentRationale": string,
    "moderationNote": string,
    "anonymousQuotes": [{ "text": string, "themeTag": string }]
  },
  "benchmarking": {
    "vsCompany": { "overallDelta": number|null, "byCompetency": [{ "competency": string, "othersDelta": number|null }], "footnote": string },
    "vsJobTitle": { "cohortN": number, "overallDelta": number|null, "footnote": string },
    "vsPreviousCycle": null | { "cycleName": string, "selfDelta": number|null, "othersDelta": number|null, "footnote": string }
  },
  "riskSignals": [{ "category": "burnout"|"trust"|"leadership"|"conflict"|"demotivation"|"other", "level": "low"|"medium"|"high", "signal": string, "suggestedHrAction": string }],
  "recommendations": {
    "plan90Days": [{ "period": string, "focus": string, "milestones": string[] }],
    "concreteActions": string[],
    "forManager": string[],
    "learningAndCoaching": string[]
  }
}

Подсказки по данным (можешь уточнить формулировки, но не меняй числа selfAvg/othersAvg/delta бенчмарков — возьми их из входа):
- topStrengths/topDevelopment: опирайся на средние по компетенциям; в evidence — нейтральные формулировки из тем текста.
- crossRoleContradictions: сравни оценки ролей MANAGER vs PEER vs SUBORDINATE по компетенциям.
- blindSpots: где self сильно выше или сильно ниже others по компетенции.
- overallDelta и byCompetency[].othersDelta уже посчитаны во входе «benchmarkHints» — перенеси их в JSON как есть.
- vsPreviousCycle: если previous=null, поле должно быть null; иначе перенеси cycleName и дельты из benchmarkHints.`;

  const benchmarkHints = {
    selfAvg: args.selfAvg,
    othersAvg: args.othersAvg,
    delta:
      args.selfAvg != null && args.othersAvg != null
        ? round1(args.selfAvg - args.othersAvg)
        : null,
    company: args.benchmarks.company,
    jobTitle: args.benchmarks.jobTitle,
    previous: args.benchmarks.previous,
    overallDeltaVsCompany:
      args.othersAvg != null && args.benchmarks.company.overallOthersAvg != null
        ? round1(args.othersAvg - args.benchmarks.company.overallOthersAvg)
        : null,
    byCompetencyDeltaVsCompany: Object.keys(args.roleAverages).map((competency) => {
      const mine = othersOnlyAvg(args.roleAverages[competency]!);
      const bench = args.benchmarks.company.byCompetencyTitle[competency];
      return {
        competency,
        othersDelta: mine != null && bench != null ? round1(mine - bench) : null,
      };
    }),
    overallDeltaVsJobTitle:
      args.othersAvg != null && args.benchmarks.jobTitle.overallOthersAvg != null
        ? round1(args.othersAvg - args.benchmarks.jobTitle.overallOthersAvg)
        : null,
    previousDeltas:
      args.benchmarks.previous && args.selfAvg != null && args.othersAvg != null
        ? {
            cycleName: args.benchmarks.previous.cycleName,
            selfDelta:
              args.benchmarks.previous.selfAvg != null
                ? round1(args.selfAvg - args.benchmarks.previous.selfAvg)
                : null,
            othersDelta:
              args.benchmarks.previous.othersAvg != null
                ? round1(args.othersAvg - args.benchmarks.previous.othersAvg)
                : null,
          }
        : null,
    derivedBlindSpots: derived.blindSpots,
    derivedContradictions: derived.crossRoleContradictions,
    derivedTopStrengths: derived.topStrengths,
    derivedTopDev: derived.topDevelopment,
  };

  const user = JSON.stringify(
    {
      revieweeName: args.revieweeName,
      competencies: args.competencies.map((c) => ({ title: c.title, description: c.description })),
      averagesByRoleByCompetency: args.roleAverages,
      aggregatedAnonymousFeedback: args.anonymousTextBundle,
      benchmarkHints,
    },
    null,
    2,
  );

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const referer = process.env.OPENROUTER_HTTP_REFERER;
  if (referer) headers["HTTP-Referer"] = referer;

  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ модели");

  const parsed = JSON.parse(content) as AiReportShape;
  if (parsed.version !== 2) {
    return {
      model,
      report: buildDemoAiReport({
        revieweeName: args.revieweeName,
        selfAvg: args.selfAvg,
        othersAvg: args.othersAvg,
        anonymousNotes: args.anonymousTextBundle,
        roleAverages: args.roleAverages,
        benchmarks: args.benchmarks,
      }),
    };
  }
  return { report: parsed, model };
}
