import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canViewRevieweeResults, includeVerbatimFeedbackForViewer } from "@/lib/access";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { loadCycleSummary } from "@/lib/summary";
import { radarRows } from "@/lib/aggregates";

type Params = { params: { revieweeId: string } };

export async function GET(req: Request, { params }: Params) {
  const { revieweeId } = params;
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ error: "cycleId обязателен" }, { status: 400 });

  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerPersonId = await resolveViewerPersonId(cookieStore, role);
  const allowed = await canViewRevieweeResults(role, viewerPersonId, revieweeId);
  if (!allowed) return NextResponse.json({ error: "Нет доступа к этим результатам" }, { status: 403 });

  const verbatim = includeVerbatimFeedbackForViewer(role, viewerPersonId, revieweeId);
  const data = await loadCycleSummary(cycleId, revieweeId, { includeVerbatimFeedback: verbatim });
  if (!data) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const radar = radarRows(data.competencies, data.averages);
  const { anonymousTextBundle: _omit, ...rest } = data;

  return NextResponse.json({
    ...rest,
    radar,
    viewerMode: verbatim ? "full" : "scores_only",
  });
}
