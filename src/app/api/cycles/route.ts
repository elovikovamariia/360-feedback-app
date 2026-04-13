import { NextResponse } from "next/server";
import { bulkCreateStructuredAssignments } from "@/lib/cycle-assignments";
import { parseLocalDateOnly, todayLocalISODate } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";

function scopeLabelFromCycle(c: {
  scopeType: string;
  scopedDirections: { direction: { num: number } }[];
}) {
  if (c.scopeType !== "DIRECTIONS" || c.scopedDirections.length === 0) return "Вся компания";
  const nums = c.scopedDirections.map((s) => s.direction.num).sort((a, b) => a - b);
  return `Направления: ${nums.join(", ")}`;
}

export async function GET() {
  const headcount = await prisma.person.count();
  const cycles = await prisma.reviewCycle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assignments: { select: { id: true, submittedAt: true, revieweeId: true } },
      scopedDirections: { include: { direction: { select: { num: true, name: true } } } },
    },
  });

  const payload = cycles.map((c) => {
    const revieweeIds = [...new Set(c.assignments.map((a) => a.revieweeId))];
    const completed = c.assignments.filter((a) => a.submittedAt).length;
    const total = c.assignments.length;
    return {
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      semesterPeriodStartsAt: c.semesterPeriodStartsAt,
      semesterPeriodEndsAt: c.semesterPeriodEndsAt,
      scopeType: c.scopeType,
      scopeLabel: scopeLabelFromCycle(c),
      revieweeCount: revieweeIds.length,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      completed,
      total,
    };
  });

  return NextResponse.json({ cycles: payload, headcount });
}

type PostBody = {
  name: string;
  startsAt?: string | null;
  endsAt?: string | null;
  semesterPeriodStartsAt?: string | null;
  semesterPeriodEndsAt?: string | null;
};

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Укажите название цикла" }, { status: 400 });

  const duplicate = await prisma.reviewCycle.findFirst({ where: { name }, select: { id: true } });
  if (duplicate) {
    return NextResponse.json({ error: "Цикл с таким названием уже существует" }, { status: 409 });
  }

  const startsAtStr = typeof body.startsAt === "string" ? body.startsAt.trim() : "";
  const endsAtStr = typeof body.endsAt === "string" ? body.endsAt.trim() : "";
  const semStartStr = typeof body.semesterPeriodStartsAt === "string" ? body.semesterPeriodStartsAt.trim() : "";
  const semEndStr = typeof body.semesterPeriodEndsAt === "string" ? body.semesterPeriodEndsAt.trim() : "";

  if (!startsAtStr || !endsAtStr) {
    return NextResponse.json({ error: "Укажите даты начала и окончания сбора оценок" }, { status: 400 });
  }
  if (!semStartStr || !semEndStr) {
    return NextResponse.json({ error: "Укажите период полугодия (даты начала и окончания)" }, { status: 400 });
  }

  const startsAt = parseLocalDateOnly(startsAtStr);
  const endsAt = parseLocalDateOnly(endsAtStr);
  const semesterPeriodStartsAt = parseLocalDateOnly(semStartStr);
  const semesterPeriodEndsAt = parseLocalDateOnly(semEndStr);
  if (!startsAt || !endsAt || !semesterPeriodStartsAt || !semesterPeriodEndsAt) {
    return NextResponse.json({ error: "Некорректный формат даты (ожидается YYYY-MM-DD)" }, { status: 400 });
  }

  const today = todayLocalISODate();
  if (startsAtStr < today) {
    return NextResponse.json({ error: "Дата начала сбора не может быть раньше сегодняшнего дня" }, { status: 400 });
  }
  if (endsAtStr < today) {
    return NextResponse.json({ error: "Дата окончания сбора не может быть раньше сегодняшнего дня" }, { status: 400 });
  }
  if (endsAtStr < startsAtStr) {
    return NextResponse.json({ error: "Окончание сбора не может быть раньше начала" }, { status: 400 });
  }
  if (semEndStr < semStartStr) {
    return NextResponse.json({ error: "Окончание периода полугодия не может быть раньше начала" }, { status: 400 });
  }

  const { cycle, created } = await prisma.$transaction(async (tx) => {
    const c = await tx.reviewCycle.create({
      data: {
        name,
        startsAt,
        endsAt,
        semesterPeriodStartsAt,
        semesterPeriodEndsAt,
        scopeType: "COMPANY",
      },
    });
    const r = await bulkCreateStructuredAssignments(c.id, { db: tx });
    return { cycle: c, created: r.created };
  });

  return NextResponse.json({ ok: true, id: cycle.id, assignmentsCreated: created });
}
