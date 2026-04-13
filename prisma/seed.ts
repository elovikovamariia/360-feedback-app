import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { bulkCreateStructuredAssignments } from "../src/lib/cycle-assignments";

const prisma = new PrismaClient();

function t() {
  return randomBytes(24).toString("hex");
}

const competencies = [
  { key: "patient_first", title: "Patient first", description: "Клиент и ценность результата в решениях", sortOrder: 1 },
  { key: "play_to_win", title: "Play to win", description: "Ответственность и доведение до результата", sortOrder: 2 },
  { key: "unite_efforts", title: "Unite efforts", description: "Обмен информацией и конструктивное взаимодействие", sortOrder: 3 },
  { key: "embrace_change", title: "Embrace change", description: "Адаптивность и улучшения", sortOrder: 4 },
  { key: "less_is_more", title: "Less is more", description: "Фокус на приоритетах и упрощение", sortOrder: 5 },
];

const demoTexts: Partial<Record<string, string>> = {
  SELF:
    "Считаю, что хорошо выстраиваю коммуникацию и довожу задачи до результата. Хочу сильнее делегировать рутину.",
  MANAGER:
    "Сильная сторона — клиентоориентированность. Зона роста — приоритизация при перегрузе; иногда берёт слишком много параллельных задач.",
  PEER: "Конструктивно помогает в блокерах. Иногда не успевает на ревью в срок из-за приоритетов.",
};

function scoreFor(rel: string, idx: number, boost: number) {
  const base = rel === "SELF" ? 4 : rel === "MANAGER" ? 3 : rel === "PEER" ? 3 : 4;
  return Math.min(5, Math.max(1, base + ((idx % 3) - 1) + boost));
}

async function submitAssignment(
  assignmentId: string,
  relationship: string,
  competencyIds: string[],
  scoreBoost: number,
) {
  for (let i = 0; i < competencyIds.length; i++) {
    await prisma.ratingAnswer.create({
      data: {
        assignmentId,
        competencyId: competencyIds[i]!,
        score: scoreFor(relationship, i, scoreBoost),
      },
    });
  }
  const text =
    demoTexts[relationship] ?? "В целом сильный командный игрок; есть запрос на более раннюю эскалацию рисков.";
  await prisma.textAnswer.create({ data: { assignmentId, body: text } });
  await prisma.reviewAssignment.update({
    where: { id: assignmentId },
    data: { submittedAt: new Date() },
  });
}

/** 100 сотрудников: 10 команд × (1 руководитель + 9 сотрудников). Руководитель в той же орггруппе, без managerId. */
async function seedCompany100() {
  const dir = await prisma.orgDirection.create({
    data: { num: 1, name: "Компания (демо, 100 чел.)" },
  });
  const dep = await prisma.orgDepartment.create({
    data: { directionId: dir.id, name: "Операционный блок" },
  });
  const sub = await prisma.orgSubdivision.create({
    data: { departmentId: dep.id, name: "Команды" },
  });

  const groupIds: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const g = await prisma.orgGroup.create({
      data: { subdivisionId: sub.id, name: `Команда ${i}` },
    });
    groupIds.push(g.id);
  }

  let staffCounter = 0;
  for (let ti = 0; ti < groupIds.length; ti++) {
    const groupId = groupIds[ti]!;
    const teamNum = ti + 1;
    const leadName = teamNum === 1 ? "Дмитрий Орлов" : `Руководитель команды ${teamNum}`;
    const leadEmail = teamNum === 1 ? "dm@demo.local" : `lead.team${teamNum}@demo.org`;
    const lead = await prisma.person.create({
      data: {
        name: leadName,
        title: "Руководитель команды",
        email: leadEmail,
        orgGroupId: groupId,
        managerId: null,
      },
    });

    for (let j = 1; j <= 9; j++) {
      staffCounter += 1;
      const isAnna = teamNum === 1 && j === 1;
      await prisma.person.create({
        data: {
          name: isAnna ? "Анна Смирнова" : `Сотрудник ${staffCounter}`,
          title: "Специалист",
          email: isAnna ? "anna@demo.local" : `staff${staffCounter}@demo.org`,
          orgGroupId: groupId,
          managerId: lead.id,
        },
      });
    }
  }

  const total = await prisma.person.count();
  if (total !== 100) {
    console.warn("Ожидалось 100 сотрудников, фактически:", total);
  }

  return { firstTeamGroupId: groupIds[0]! };
}

async function main() {
  await prisma.aiReport.deleteMany();
  await prisma.ratingAnswer.deleteMany();
  await prisma.textAnswer.deleteMany();
  await prisma.reviewAssignment.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.person.deleteMany();
  await prisma.orgGroup.deleteMany();
  await prisma.orgSubdivision.deleteMany();
  await prisma.orgDepartment.deleteMany();
  await prisma.orgDirection.deleteMany();
  await prisma.competency.deleteMany();

  for (const c of competencies) {
    await prisma.competency.create({ data: c });
  }

  const { firstTeamGroupId } = await seedCompany100();
  const comps = await prisma.competency.findMany({ orderBy: { sortOrder: "asc" } });
  const compIds = comps.map((c) => c.id);

  const team1Ids = (
    await prisma.person.findMany({
      where: { orgGroupId: firstTeamGroupId },
      select: { id: true },
    })
  ).map((p) => p.id);

  async function seedCycleWithAssignments(opts: {
    name: string;
    startsAt: Date;
    endsAt: Date;
    semesterPeriodStartsAt: Date;
    semesterPeriodEndsAt: Date;
    submitForRevieweeIds: string[] | null;
    scoreBoost: number;
  }) {
    const cycle = await prisma.$transaction(async (tx) => {
      const c = await tx.reviewCycle.create({
        data: {
          name: opts.name,
          startsAt: opts.startsAt,
          endsAt: opts.endsAt,
          semesterPeriodStartsAt: opts.semesterPeriodStartsAt,
          semesterPeriodEndsAt: opts.semesterPeriodEndsAt,
          scopeType: "COMPANY",
        },
      });
      await bulkCreateStructuredAssignments(c.id, { db: tx });
      return c;
    });

    if (opts.submitForRevieweeIds?.length) {
      const toSubmit = await prisma.reviewAssignment.findMany({
        where: { cycleId: cycle.id, revieweeId: { in: opts.submitForRevieweeIds } },
        select: { id: true, relationship: true },
      });
      for (const row of toSubmit) {
        await submitAssignment(row.id, row.relationship, compIds, opts.scoreBoost);
      }
    }

    return cycle;
  }

  await seedCycleWithAssignments({
    name: "360° · I полугодие 2025 · завершён",
    semesterPeriodStartsAt: new Date("2025-01-01"),
    semesterPeriodEndsAt: new Date("2025-06-30"),
    startsAt: new Date("2025-01-08"),
    endsAt: new Date("2025-06-28"),
    submitForRevieweeIds: team1Ids,
    scoreBoost: 0,
  });

  await seedCycleWithAssignments({
    name: "360° · II полугодие 2025 · завершён",
    semesterPeriodStartsAt: new Date("2025-07-01"),
    semesterPeriodEndsAt: new Date("2025-12-31"),
    startsAt: new Date("2025-07-05"),
    endsAt: new Date("2025-12-22"),
    submitForRevieweeIds: team1Ids,
    scoreBoost: 1,
  });

  const current = await seedCycleWithAssignments({
    name: "360° · I полугодие 2026 · в процессе",
    semesterPeriodStartsAt: new Date("2026-01-01"),
    semesterPeriodEndsAt: new Date("2026-06-30"),
    startsAt: new Date("2026-01-10"),
    endsAt: new Date("2026-06-30"),
    submitForRevieweeIds: null,
    scoreBoost: 0,
  });

  const pending = await prisma.reviewAssignment.findFirst({
    where: { cycleId: current.id, submittedAt: null },
    select: { inviteToken: true },
  });
  const anna = await prisma.person.findFirst({ where: { email: "anna@demo.local" }, select: { id: true } });

  console.log("Seed OK — 100 сотрудников (10 команд), циклы с авто-назначениями SELF + руководитель + 1 коллега");
  console.log("Текущий цикл:", current.id);
  if (anna) console.log("Оцениваемый (демо):", anna.id);
  if (pending) console.log("Пример незаполненной анкеты (токен):", pending.inviteToken);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
