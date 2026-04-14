/**
 * HR AI Agent — единая точка входа для ИИ-аналитики 360°.
 *
 * При наличии `OPENAI_API_KEY` вызывается LLM (OpenAI-совместимый Chat Completions:
 * OpenAI, OpenRouter и т.д. через `OPENAI_BASE_URL`). Иначе — детерминированный локальный отчёт
 * той же JSON-схемы v2 (см. `buildDemoAiReport` в `ai-report.ts`).
 */
import {
  generateAiReportWithOpenAI,
  type AiBenchmarkBundle,
  type AiReportShape,
} from "@/lib/ai-report";

export type { AiBenchmarkBundle, AiReportShape } from "@/lib/ai-report";

export const HR_AI_AGENT_ID = "hr-360-report-v2";

/** true, если на сервере задан ключ — агент ходит в LLM, иначе локальный режим. */
export function isHrAiAgentConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Сгенерировать HR-отчёт (LLM или локальный шаблон). */
export async function runHrAiAgentReport(
  args: Parameters<typeof generateAiReportWithOpenAI>[0],
): Promise<{ report: AiReportShape; model: string }> {
  return generateAiReportWithOpenAI(args);
}
