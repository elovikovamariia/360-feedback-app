import { NextResponse } from "next/server";
import { HR_AI_AGENT_ID, isHrAiAgentConfigured } from "@/lib/hr-ai-agent";

/**
 * Статус ИИ-агента для проверки сдачи: без секретов, только факт настройки и параметры.
 */
export async function GET() {
  const configured = isHrAiAgentConfigured();
  const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  let apiBaseHost = "api.openai.com";
  try {
    apiBaseHost = new URL(base).hostname;
  } catch {
    apiBaseHost = "invalid-openai-base-url";
  }

  return NextResponse.json({
    agentId: HR_AI_AGENT_ID,
    mode: configured ? "llm" : "demo",
    configured,
    apiBaseHost,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    reportSchemaVersion: 2,
    endpoints: {
      generateReport: "POST /api/reviewees/:revieweeId/ai?cycleId=…",
    },
  });
}
