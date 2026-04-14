import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canViewRevieweeResults } from "@/lib/access";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { loadCycleSummary } from "@/lib/summary";
import { runHrAiAgentReport } from "@/lib/hr-ai-agent";
import { prisma } from "@/lib/prisma";
import { loadAiBenchmarkBundle } from "@/lib/report-benchmarks";

type Params = { params: { revieweeId: string } };

export async function POST(req: Request, { params }: Params) {
  const { revieweeId } = params;
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ error: "cycleId обязателен" }, { status: 400 });

  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerPersonId = await resolveViewerPersonId(cookieStore, role);
  const allowed = await canViewRevieweeResults(role, viewerPersonId, revieweeId);
  if (!allowed) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const data = await loadCycleSummary(cycleId, revieweeId, { includeVerbatimFeedback: true });
  if (!data) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const roleAveragesReadable: Record<
    string,
    { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }
  > = {};
  for (const c of data.competencies) {
    roleAveragesReadable[c.title] = data.roleAveragesByCompetency[c.id]!;
  }

  const benchmarks = await loadAiBenchmarkBundle(cycleId, revieweeId, data.competencies);
  const { report, model } = await runHrAiAgentReport({
    revieweeName: data.reviewee.name,
    competencies: data.competencies,
    roleAverages: roleAveragesReadable,
    anonymousTextBundle: data.anonymousTextBundle,
    selfAvg: data.selfAvg,
    othersAvg: data.othersAvg,
    benchmarks,
  });

  const payloadStr = JSON.stringify(report);
  await prisma.aiReport.upsert({
    where: { cycleId_revieweeId: { cycleId, revieweeId } },
    create: { cycleId, revieweeId, payload: payloadStr, model },
    update: { payload: payloadStr, model },
  });

  return NextResponse.json({ report, model });
}

export async function GET(req: Request, { params }: Params) {
  const { revieweeId } = params;
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ error: "cycleId обязателен" }, { status: 400 });

  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerPersonId = await resolveViewerPersonId(cookieStore, role);
  const allowed = await canViewRevieweeResults(role, viewerPersonId, revieweeId);
  if (!allowed) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const row = await prisma.aiReport.findUnique({
    where: { cycleId_revieweeId: { cycleId, revieweeId } },
  });
  if (!row) return NextResponse.json({ report: null });
  return NextResponse.json({ report: JSON.parse(row.payload) as unknown, model: row.model });
}
