import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { token: string } };

export async function GET(_req: Request, { params }: Params) {
  const { token } = params;
  const assignment = await prisma.reviewAssignment.findUnique({
    where: { inviteToken: token },
    include: {
      cycle: true,
      reviewee: { select: { name: true } },
      reviewer: { select: { id: true, name: true } },
      ratings: true,
      texts: true,
    },
  });
  if (!assignment) return NextResponse.json({ error: "Недействительная ссылка" }, { status: 404 });

  const competencies = await prisma.competency.findMany({ orderBy: { sortOrder: "asc" } });

  const existingScores: Record<string, number> = {};
  const existingCompetencyComments: Record<string, string> = {};
  for (const r of assignment.ratings) {
    existingScores[r.competencyId] = r.score;
    if (r.comment && r.comment.trim()) existingCompetencyComments[r.competencyId] = r.comment;
  }
  const existingText = assignment.texts[0]?.body ?? "";

  return NextResponse.json({
    submitted: Boolean(assignment.submittedAt),
    reviewerId: assignment.reviewer.id,
    assignmentId: assignment.id,
    cycleId: assignment.cycle.id,
    cycleName: assignment.cycle.name,
    collectionStartsAt: assignment.cycle.startsAt?.toISOString() ?? null,
    collectionEndsAt: assignment.cycle.endsAt?.toISOString() ?? null,
    relationship: assignment.relationship,
    revieweeId: assignment.revieweeId,
    revieweeName: assignment.reviewee.name,
    reviewerName: assignment.reviewer.name,
    competencies,
    existingScores,
    existingCompetencyComments,
    existingText,
  });
}

export async function POST(req: Request, { params }: Params) {
  const { token } = params;
  const body = (await req.json()) as {
    scores: Record<string, number>;
    text: string;
    competencyComments?: Record<string, string>;
  };

  const assignment = await prisma.reviewAssignment.findUnique({ where: { inviteToken: token } });
  if (!assignment) return NextResponse.json({ error: "Недействительная ссылка" }, { status: 404 });
  if (assignment.submittedAt) return NextResponse.json({ error: "Анкета уже отправлена" }, { status: 400 });

  const competencies = await prisma.competency.findMany();
  const compIds = new Set(competencies.map((c) => c.id));
  for (const id of Object.keys(body.scores ?? {})) {
    if (!compIds.has(id)) return NextResponse.json({ error: "Неизвестная компетенция" }, { status: 400 });
  }
  if (!body.text || body.text.trim().length < 20) {
    return NextResponse.json({ error: "Общий комментарий обязателен (минимум 20 символов)" }, { status: 400 });
  }

  const comments = body.competencyComments ?? {};

  try {
    await prisma.$transaction(async (tx) => {
      for (const c of competencies) {
        const score = Number(body.scores[c.id]);
        if (!Number.isFinite(score) || score < 1 || score > 5) {
          throw new Error("INVALID_SCORE");
        }
        const raw = comments[c.id]?.trim();
        const comment = raw && raw.length > 0 ? raw : null;
        await tx.ratingAnswer.upsert({
          where: { assignmentId_competencyId: { assignmentId: assignment.id, competencyId: c.id } },
          create: { assignmentId: assignment.id, competencyId: c.id, score, comment },
          update: { score, comment },
        });
      }
      await tx.textAnswer.deleteMany({ where: { assignmentId: assignment.id } });
      await tx.textAnswer.create({ data: { assignmentId: assignment.id, body: body.text.trim() } });
      await tx.reviewAssignment.update({
        where: { id: assignment.id },
        data: { submittedAt: new Date() },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_SCORE") {
      return NextResponse.json({ error: "Все компетенции должны быть оценены по шкале от 1 до 5" }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
