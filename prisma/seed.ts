import { PrismaClient } from "@prisma/client";
import { DEMO_PERSON_EMAIL } from "../src/lib/demo-personas";
import { bulkCreateStructuredAssignments } from "../src/lib/cycle-assignments";
import { runHrAiAgentReport } from "../src/lib/hr-ai-agent";
import { loadAiBenchmarkBundle } from "../src/lib/report-benchmarks";
import { loadCycleSummary } from "../src/lib/summary";

const prisma = new PrismaClient();

/** Компетенции по модели «Концепция 360°» (названия как в документе; ключи стабильны для данных). */
const competencies = [
  {
    key: "patient_first",
    title: "Patient first",
    description:
      "Учитывает потребности клиента при принятии решений. Проверяет, какую ценность создаёт результат.",
    sortOrder: 1,
  },
  {
    key: "play_to_win",
    title: "Play to win",
    description: "Берёт ответственность за результат. Доводит задачи до конца.",
    sortOrder: 2,
  },
  {
    key: "unite_efforts",
    title: "Unite efforts",
    description: "Делится информацией. Конструктивно взаимодействует.",
    sortOrder: 3,
  },
  {
    key: "embrace_change",
    title: "Embrace change",
    description: "Быстро адаптируется. Предлагает улучшения.",
    sortOrder: 4,
  },
  {
    key: "less_is_more",
    title: "Less is more",
    description: "Упрощает процессы. Фокусируется на приоритетах.",
    sortOrder: 5,
  },
];

type AssignmentRow = {
  id: string;
  relationship: string;
  reviewee: { name: string };
  reviewer: { name: string };
};

function scoreSet(rel: string, variant: number): number[] {
  const bases: Record<string, number[]> = {
    SELF: [4, 4, 3, 4, 4],
    MANAGER: [4, 3, 4, 3, 4],
    PEER: [4, 4, 4, 3, 3],
    SUBORDINATE: [5, 4, 4, 4, 4],
  };
  const base = bases[rel] ?? [4, 4, 4, 4, 4];
  const bump = variant % 3;
  return base.map((s, i) => Math.min(5, Math.max(2, s + ((i + bump) % 2) - (variant % 2))));
}

function competencyCommentsFor(
  rel: string,
  revieweeFirst: string,
  reviewerFirst: string,
  v: number,
): string[] {
  const idx = v % 4;
  if (rel === "SELF") {
    return [
      `Считаю сильной стороной доведение задач до результата; иногда беру на себя слишком много параллельных инициатив.`,
      `В коммуникации стараюсь быть прозрачной по срокам; хочу раньше эскалировать риски.`,
      `Смотрю на квартальные цели; в операционке хочу сильнее держать фокус на приоритетах и не распыляться.`,
      `Коллегам помогаю, когда просят; баланс «свои задачи / помощь» — зона внимания.`,
      `Под давлением дедлайнов сохраняю работоспособность; отдых планирую не всегда системно.`,
    ];
  }
  if (rel === "MANAGER") {
    const lines = [
      `Видит картину целиком; просит уточнений по приоритетам — это помогает команде.`,
      `На ${revieweeFirst} можно опереться в переговорах со смежными командами.`,
      `Иногда ожидания по срокам звучат оптимистичнее, чем реальность загрузки — стоит синхронизировать буферы.`,
      `Хорошо даёт развивающую обратную связь 1:1.`,
      `В изменениях процессов держит команду в курсе; хочется чуть больше предсказуемости по критериям успеха.`,
    ];
    return lines.map((_, i) => lines[(i + idx) % lines.length]!);
  }
  if (rel === "PEER") {
    const lines = [
      `${reviewerFirst} отмечает: в парных задачах с ${revieweeFirst} удобно синхронизироваться, ответы по сути и в срок.`,
      `На ревью аргументирует позицию данными, а не «мнением» — ускоряет решения.`,
      `В стрессовых релизах иногда резковато в чате; на результат это не влияет, но климат можно смягчить.`,
      `Готова подхватить блокер коллеги, иногда за счёт своих слотов — команда ценит, но есть риск перегруза.`,
      `Быстро вникает в новую предметную область; документацию дополняет примерами.`,
    ];
    return lines.map((_, i) => lines[(i + idx + 1) % lines.length]!);
  }
  return [
    `Как руководителю ${revieweeFirst} удаётся держать фокус команды на метриках.`,
    `Запрашивает обратную связь у команды — редкая и ценная практика.`,
    `Иногда много параллельных тем на статусе; короче повестка помогла бы всем.`,
    `Поддерживает инициативы сотрудников, но границы ответственности можно прояснять чаще.`,
    `В конфликтных ситуациях выносит обсуждение в живой разговор, а не в переписку.`,
  ];
}

function generalTextFor(row: AssignmentRow, variant: number): string {
  const r = row.relationship;
  const who = row.reviewee.name.split(" ")[0] ?? row.reviewee.name;
  if (r === "SELF") {
    return (
      `${who}: полугодие прошло продуктивно. Сильнее всего чувствую вклад в кросс-функциональные проекты и доверие со стороны заказчиков. ` +
      `Зона развития — жёстче обозначать «не делаю» при перегрузе и раньше просить ресурс. Готов(а) участвовать в калибровочной сессии и обновить ИПР.`
    );
  }
  if (r === "MANAGER") {
    return (
      `Как руководитель вижу ${row.reviewee.name} как надёжного исполнителя с высокой планкой качества. ` +
      `Коллеги ценят готовность помочь; мой запрос — заранее сигнализировать о рисках срыва сроков и не тащить всё в одиночку. ` +
      `Рекомендую зафиксировать 2–3 приоритетных направления на следующий квартал и согласовать критерии успеха.`
    );
  }
  if (r === "PEER") {
    const pool = [
      `Работали вместе над интеграцией и презентацией для клиента. ${row.reviewee.name} тащит детали, внимателен к регрессу, в чате отвечает быстро. ` +
        `Из зоны роста — иногда уходит в глубокий фокус и меньше видно статуса по зависимостям; короткий ежедневный синк решил бы это.`,
      `На планировании ${row.reviewee.name} конструктивно спорит с гипотезами, не с людьми — это зрелая позиция. ` +
        `Хотелось бы чуть больше документирования решений для тех, кто подключился позже.`,
      `${row.reviewee.name} — человек, к которому идут за советом по процессам. Иногда очередь вопросов мешает собственным дедлайнам — стоит договориться о «тихих часах».`,
    ];
    return pool[variant % pool.length]!;
  }
  return `Общий комментарий по ${row.reviewee.name}: стабильный уровень взаимодействия, профессиональный тон, готовность к диалогу. Вариант ${variant}.`;
}

async function submitAssignmentFull(
  row: AssignmentRow,
  competencyIds: string[],
  scores: number[],
  generalText: string,
  compComments: string[],
) {
  for (let i = 0; i < competencyIds.length; i++) {
    await prisma.ratingAnswer.create({
      data: {
        assignmentId: row.id,
        competencyId: competencyIds[i]!,
        score: scores[i] ?? 4,
        comment: compComments[i] ?? null,
      },
    });
  }
  await prisma.textAnswer.create({ data: { assignmentId: row.id, body: generalText } });
  await prisma.reviewAssignment.update({
    where: { id: row.id },
    data: { submittedAt: new Date("2025-11-18T12:00:00.000Z") },
  });
}

async function seedOrgNordiumDemo(): Promise<void> {
  const dir = await prisma.orgDirection.create({
    data: { num: 1, name: "ООО «Нордиум» (вся компания)" },
  });
  const dep = await prisma.orgDepartment.create({
    data: { directionId: dir.id, name: "Операционные подразделения" },
  });
  const sub = await prisma.orgSubdivision.create({
    data: { departmentId: dep.id, name: "Команды" },
  });

  const gProduct = await prisma.orgGroup.create({
    data: { subdivisionId: sub.id, name: "Продукт и интеграции" },
  });
  const gCx = await prisma.orgGroup.create({
    data: { subdivisionId: sub.id, name: "Клиентский успех" },
  });

  const dmitry = await prisma.person.create({
    data: {
      name: "Дмитрий Волков",
      title: "Руководитель направления «Продукт»",
      email: "dm@demo.local",
      orgGroupId: gProduct.id,
      managerId: null,
    },
  });
  const productStaff = [
    { name: "Анна Соколова", email: DEMO_PERSON_EMAIL.employee, title: "Ведущий аналитик" },
    { name: "Борис Панов", email: DEMO_PERSON_EMAIL.respondentPeer, title: "Инженер по данным" },
    { name: "Виктория Нова", email: "viktoriya.nova@nordium.demo", title: "UX/UI дизайнер" },
    { name: "Глеб Артёмов", email: "gleb.artemov@nordium.demo", title: "Разработчик" },
  ];
  for (const s of productStaff) {
    await prisma.person.create({
      data: {
        name: s.name,
        title: s.title,
        email: s.email,
        orgGroupId: gProduct.id,
        managerId: dmitry.id,
      },
    });
  }

  const elena = await prisma.person.create({
    data: {
      name: "Елена Короткова",
      title: "Руководитель клиентского успеха",
      email: "elena.lead@nordium.demo",
      orgGroupId: gCx.id,
      managerId: null,
    },
  });
  const cxStaff = [
    { name: "Дарья Мишина", email: "darya.mishina@nordium.demo" },
    { name: "Жанна Климова", email: "zhanna.klimova@nordium.demo" },
    { name: "Игорь Светлов", email: "igor.sv@nordium.demo" },
    { name: "Константин Юрьев", email: "konstantin.yu@nordium.demo" },
  ];
  for (const s of cxStaff) {
    await prisma.person.create({
      data: {
        name: s.name,
        title: "Менеджер сопровождения",
        email: s.email,
        orgGroupId: gCx.id,
        managerId: elena.id,
      },
    });
  }
}

async function seedAiReportsForCycle(cycleId: string): Promise<void> {
  const revieweeIds = await prisma.reviewAssignment.findMany({
    where: { cycleId },
    distinct: ["revieweeId"],
    select: { revieweeId: true },
  });

  for (const { revieweeId } of revieweeIds) {
    const data = await loadCycleSummary(cycleId, revieweeId, { includeVerbatimFeedback: true });
    if (!data) continue;

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
  }
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

  await seedOrgNordiumDemo();

  const comps = await prisma.competency.findMany({ orderBy: { sortOrder: "asc" } });
  const compIds = comps.map((c) => c.id);

  const cycle = await prisma.$transaction(async (tx) => {
    const c = await tx.reviewCycle.create({
      data: {
        name: "360° · II полугодие 2025 · вся компания (завершён)",
        semesterPeriodStartsAt: new Date("2025-07-01"),
        semesterPeriodEndsAt: new Date("2025-12-31"),
        startsAt: new Date("2025-09-01"),
        endsAt: new Date("2025-11-30"),
        scopeType: "COMPANY",
      },
    });
    await bulkCreateStructuredAssignments(c.id, { db: tx });
    return c;
  });

  const assignments = await prisma.reviewAssignment.findMany({
    where: { cycleId: cycle.id },
    include: { reviewee: true, reviewer: true },
    orderBy: { id: "asc" },
  });

  let v = 0;
  for (const a of assignments) {
    const row: AssignmentRow = {
      id: a.id,
      relationship: a.relationship,
      reviewee: { name: a.reviewee.name },
      reviewer: { name: a.reviewer.name },
    };
    const revieweeFirst = a.reviewee.name.split(/\s+/)[0] ?? a.reviewee.name;
    const reviewerFirst = a.reviewer.name.split(/\s+/)[0] ?? a.reviewer.name;
    const scores = scoreSet(a.relationship, v);
    const comments = competencyCommentsFor(a.relationship, revieweeFirst, reviewerFirst, v);
    const general = generalTextFor(row, v);
    await submitAssignmentFull(row, compIds, scores, general, comments);
    v += 1;
  }

  await seedAiReportsForCycle(cycle.id);

  const anna = await prisma.person.findFirst({ where: { email: DEMO_PERSON_EMAIL.employee }, select: { id: true } });

  console.log("Seed OK — ООО «Нордиум», 10 сотрудников, 1 завершённый цикл 360°, все анкеты + AI-отчёты.");
  console.log("ID цикла:", cycle.id);
  if (anna) console.log("Оцениваемый (пример для просмотра):", anna.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
