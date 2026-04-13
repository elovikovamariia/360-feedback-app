import type { Competency } from "@prisma/client";

export type AiReportShape = {
  summary: string;
  themes: string[];
  patterns: string[];
  strengths: string[];
  growth: string[];
  contradictions: string[];
  recommendations: string[];
};

export function buildDemoAiReport(input: {
  revieweeName: string;
  selfAvg: number | null;
  othersAvg: number | null;
  anonymousNotes: string;
}): AiReportShape {
  const gap =
    input.selfAvg != null && input.othersAvg != null
      ? Math.round((input.selfAvg - input.othersAvg) * 10) / 10
      : null;

  const contradictions: string[] = [];
  if (gap != null && gap > 0.4) {
    contradictions.push(
      `Самооценка заметно выше средней оценки коллег и руководителя (разница ~${gap} по шкале 1–5). Имеет смысл обсудить ожидания и наблюдаемое поведение на 1:1.`,
    );
  } else if (gap != null && gap < -0.4) {
    contradictions.push(
      `Оценки окружения выше самооценки (разница ~${Math.abs(gap)}). Возможен эффект «синдрома самозванца» или недостаток видимости своих результатов.`,
    );
  } else {
    contradictions.push("Сильных противоречий между самооценкой и группами по средним баллам не выявлено.");
  }

  return {
    summary: `Краткое резюме по ${input.revieweeName}: сбалансированный профиль с акцентом на командное взаимодействие; ключевой фокус развития — приоритизация и управление перегрузом.`,
    themes: [
      "Клиент и ценность результата",
      "Командная коммуникация и помощь коллегам",
      "Приоритизация и управление параллельными задачами",
    ],
    patterns: [
      "В текстах повторяется мотив «помогает снять блокеры».",
      "Встречается запрос на более раннюю эскалацию рисков и прозрачность сроков.",
    ],
    strengths: [
      "Клиентоориентированность и внимание к ценности результата.",
      "Конструктивная поддержка коллег в сложных ситуациях.",
    ],
    growth: [
      "Явная приоритизация при перегрузе; снижение количества параллельных инициатив.",
      "Регулярная обратная связь подчинённым вне формальных статусов.",
    ],
    contradictions,
    recommendations: [
      "Ввести еженедельный 15-минутный «приоритетный стек» с руководителем (топ-3 на неделю).",
      "Для задач с риском срыва срока — правило эскалации за N дней до дедлайна.",
      "Один запланированный слот 1:1 с каждым прямым подчинённым раз в две недели только под развитие.",
    ],
  };
}

export async function generateAiReportWithOpenAI(args: {
  revieweeName: string;
  competencies: Competency[];
  roleAverages: Record<string, { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }>;
  anonymousTextBundle: string;
  selfAvg: number | null;
  othersAvg: number | null;
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
      }),
    };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const sys = `Ты HR-аналитик 360°. Пиши по-русски. Не раскрывай личности респондентов, не цитируй дословно длинные фрагменты. Используй только обезличенные формулировки. Верни строго JSON по схеме:
{
  "summary": string,
  "themes": string[],
  "patterns": string[],
  "strengths": string[],
  "growth": string[],
  "contradictions": string[],
  "recommendations": string[]
}`;

  const user = JSON.stringify(
    {
      revieweeFirstName: args.revieweeName,
      competencies: args.competencies.map((c) => ({ title: c.title, description: c.description })),
      averagesByRole: args.roleAverages,
      aggregatedAnonymousFeedback: args.anonymousTextBundle,
    },
    null,
    2,
  );

  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ модели");

  const parsed = JSON.parse(content) as AiReportShape;
  return { report: parsed, model };
}
