/**
 * Клиентская эмуляция API для статического хостинга (GitHub Pages): данные из gh-pages-db.json + localStorage.
 */
import type { Competency } from "@prisma/client";
import { emptyRoleAverages, radarRows, type RoleAverages } from "@/lib/aggregates";
import { parseLocalDateOnly, todayLocalISODate } from "@/lib/date-only";
import { generateAiReportWithOpenAI } from "@/lib/ai-report";
import { ACTOR_PERSON_COOKIE, PREVIEW_ROLE_COOKIE } from "@/lib/demo-session";
import { parsePreviewRole, type PreviewRoleId } from "@/lib/roles";

const STORAGE_KEY = "360_feedback_gh_pages_state";

type JsonRecord = Record<string, unknown>;

export type GhSnapshot = {
  version: 1;
  buildId: string;
  orgDirections: JsonRecord[];
  orgDepartments: JsonRecord[];
  orgSubdivisions: JsonRecord[];
  orgGroups: JsonRecord[];
  persons: JsonRecord[];
  competencies: JsonRecord[];
  reviewCycles: JsonRecord[];
  reviewCycleDirections: JsonRecord[];
  reviewAssignments: JsonRecord[];
  ratingAnswers: JsonRecord[];
  textAnswers: JsonRecord[];
  aiReports: JsonRecord[];
};

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    try {
      out[k] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      out[k] = part.slice(idx + 1).trim();
    }
  }
  return out;
}

function inviteTokenHex(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getSubtreePersonIds(rootManagerId: string, persons: JsonRecord[]): string[] {
  const byManager = new Map<string, string[]>();
  for (const p of persons) {
    const mid = p.managerId as string | null | undefined;
    if (!mid) continue;
    if (!byManager.has(mid)) byManager.set(mid, []);
    byManager.get(mid)!.push(p.id as string);
  }
  const seen = new Set<string>();
  const stack = [...(byManager.get(rootManagerId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const c of byManager.get(id) ?? []) stack.push(c);
  }
  return [...seen];
}

function getManagerVisiblePersonIds(managerPersonId: string, persons: JsonRecord[]): string[] {
  const sub = getSubtreePersonIds(managerPersonId, persons);
  return [managerPersonId, ...sub];
}

function resolveViewerFromCookies(cookieHeader: string, persons: JsonRecord[]): string | null {
  const c = parseCookies(cookieHeader);
  const role = parsePreviewRole(c[PREVIEW_ROLE_COOKIE]);
  const rawActor = c[ACTOR_PERSON_COOKIE]?.trim();
  if (rawActor && persons.some((p) => p.id === rawActor)) return rawActor;
  if (role === "manager") {
    const p = persons.find((x) => x.email === "dm@demo.local");
    return (p?.id as string) ?? null;
  }
  if (role === "employee" || role === "respondent") {
    const p = persons.find((x) => x.email === "anna@demo.local");
    return (p?.id as string) ?? null;
  }
  return null;
}

function canViewRevieweeResults(
  role: PreviewRoleId,
  viewerPersonId: string | null,
  revieweeId: string,
  persons: JsonRecord[],
): boolean {
  if (role === "hr_admin" || role === "executive") return true;
  if (role === "respondent") return false;
  if (!viewerPersonId) return false;
  if (role === "employee") return viewerPersonId === revieweeId;
  if (role === "manager") {
    if (viewerPersonId === revieweeId) return true;
    const sub = getSubtreePersonIds(viewerPersonId, persons);
    return sub.includes(revieweeId);
  }
  return false;
}

function includeVerbatimFeedbackForViewer(
  role: PreviewRoleId,
  viewerPersonId: string | null,
  revieweeId: string,
): boolean {
  if (role === "hr_admin" || role === "executive") return true;
  if (role === "manager" && viewerPersonId && viewerPersonId !== revieweeId) return true;
  if ((role === "employee" || role === "manager") && viewerPersonId === revieweeId) return false;
  return true;
}

function relationshipToKey(r: string): keyof RoleAverages {
  switch (r) {
    case "SELF":
      return "SELF";
    case "MANAGER":
      return "MANAGER";
    case "PEER":
      return "PEER";
    case "SUBORDINATE":
      return "SUBORDINATE";
    default:
      return "PEER";
  }
}

function cellAvg(cell: { sum: number; count: number } | undefined) {
  if (!cell || cell.count === 0) return undefined;
  return Math.round((cell.sum / cell.count) * 10) / 10;
}

function competencyAveragesMap(competencies: Competency[], averages: RoleAverages) {
  const out: Record<string, { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }> = {};
  for (const c of competencies) {
    out[c.id] = {
      SELF: cellAvg(averages.SELF[c.id]),
      MANAGER: cellAvg(averages.MANAGER[c.id]),
      PEER: cellAvg(averages.PEER[c.id]),
      SUBORDINATE: cellAvg(averages.SUBORDINATE[c.id]),
    };
  }
  return out;
}

function globalAverages(competencies: Competency[], averages: RoleAverages) {
  let selfSum = 0;
  let selfN = 0;
  let otherSum = 0;
  let otherN = 0;
  for (const c of competencies) {
    const s = averages.SELF[c.id];
    if (s && s.count) {
      selfSum += s.sum;
      selfN += s.count;
    }
    for (const role of ["MANAGER", "PEER", "SUBORDINATE"] as const) {
      const cell = averages[role][c.id];
      if (cell && cell.count) {
        otherSum += cell.sum;
        otherN += cell.count;
      }
    }
  }
  return {
    selfAvg: selfN ? Math.round((selfSum / selfN) * 10) / 10 : null,
    othersAvg: otherN ? Math.round((otherSum / otherN) * 10) / 10 : null,
  };
}

function loadCycleSummaryFromState(
  s: GhSnapshot,
  cycleId: string,
  revieweeId: string,
  includeVerbatim: boolean,
): {
  cycle: JsonRecord;
  reviewee: JsonRecord;
  competencies: Competency[];
  assignments: {
    id: string;
    relationship: string;
    submittedAt: string | null;
    reviewerName: string;
    inviteToken: string;
  }[];
  averages: RoleAverages;
  roleAveragesByCompetency: Record<string, { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }>;
  anonymousTextBundle: string;
  completion: { completed: number; total: number; completionRate: number };
  selfAvg: number | null;
  othersAvg: number | null;
} | null {
  const cycle = s.reviewCycles.find((c) => c.id === cycleId);
  const reviewee = s.persons.find((p) => p.id === revieweeId);
  const competencies = s.competencies as unknown as Competency[];
  const assignments = s.reviewAssignments.filter((a) => a.cycleId === cycleId && a.revieweeId === revieweeId);
  if (!cycle || !reviewee) return null;

  const averages: RoleAverages = emptyRoleAverages();
  const texts: string[] = [];

  for (const a of assignments) {
    const role = relationshipToKey(a.relationship as string);
    const ratings = s.ratingAnswers.filter((r) => r.assignmentId === a.id);
    for (const r of ratings) {
      const cid = r.competencyId as string;
      if (!averages[role][cid]) averages[role][cid] = { sum: 0, count: 0 };
      averages[role][cid]!.sum += Number(r.score);
      averages[role][cid]!.count += 1;
    }
    if (includeVerbatim) {
      for (const t of s.textAnswers.filter((t) => t.assignmentId === a.id)) {
        texts.push(t.body as string);
      }
      for (const r of ratings) {
        const comment = (r.comment as string | null | undefined)?.trim();
        if (comment) {
          const comp = competencies.find((c) => c.id === r.competencyId);
          const title = comp?.title ?? "компетенция";
          texts.push(`По «${title}»: ${comment}`);
        }
      }
    }
  }

  const roleAveragesByCompetency = competencyAveragesMap(competencies, averages);
  const completed = assignments.filter((a) => a.submittedAt).length;
  const total = assignments.length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const { selfAvg, othersAvg } = globalAverages(competencies, averages);

  const reviewerNames = new Map<string, string>();
  for (const p of s.persons) reviewerNames.set(p.id as string, p.name as string);

  return {
    cycle,
    reviewee,
    competencies,
    assignments: assignments.map((a) => ({
      id: a.id as string,
      relationship: a.relationship as string,
      submittedAt: (a.submittedAt as string | null) ?? null,
      reviewerName: reviewerNames.get(a.reviewerId as string) ?? "",
      inviteToken: a.inviteToken as string,
    })),
    averages,
    roleAveragesByCompetency,
    anonymousTextBundle: texts.map((t, i) => `Фрагмент ${i + 1}: ${t}`).join("\n\n"),
    completion: { completed, total, completionRate },
    selfAvg,
    othersAvg,
  };
}

function personDirectionId(person: JsonRecord, s: GhSnapshot): string | null {
  const gid = person.orgGroupId as string | null | undefined;
  if (!gid) return null;
  const g = s.orgGroups.find((x) => x.id === gid);
  if (!g) return null;
  const sub = s.orgSubdivisions.find((x) => x.id === g.subdivisionId);
  if (!sub) return null;
  const dep = s.orgDepartments.find((x) => x.id === sub.departmentId);
  return (dep?.directionId as string) ?? null;
}

function directionBreakdownForCycle(s: GhSnapshot, cycleId: string) {
  const directions = [...s.orgDirections].sort((a, b) => Number(a.num) - Number(b.num));
  const rows: {
    directionId: string;
    directionNum: number;
    directionName: string;
    employeesInOrg: number;
    assignmentsInCycle: number;
    assignmentsDone: number;
    completionRate: number;
  }[] = [];

  for (const d of directions) {
    const did = d.id as string;
    const employeesInOrg = s.persons.filter((p) => personDirectionId(p, s) === did).length;
    const ass = s.reviewAssignments.filter((a) => {
      if (a.cycleId !== cycleId) return false;
      const rv = s.persons.find((p) => p.id === a.revieweeId);
      return rv && personDirectionId(rv, s) === did;
    });
    const assignmentsInCycle = ass.length;
    const assignmentsDone = ass.filter((a) => a.submittedAt).length;
    const completionRate = assignmentsInCycle ? Math.round((assignmentsDone / assignmentsInCycle) * 100) : 0;
    rows.push({
      directionId: did,
      directionNum: Number(d.num),
      directionName: d.name as string,
      employeesInOrg,
      assignmentsInCycle,
      assignmentsDone,
      completionRate,
    });
  }
  return rows;
}

function scopeLabelFromCycleScoped(c: JsonRecord, scoped: JsonRecord[], directions: JsonRecord[]) {
  if (c.scopeType !== "DIRECTIONS" || scoped.length === 0) return "Вся компания";
  const nums = scoped
    .map((x) => {
      const dir = directions.find((d) => d.id === x.directionId);
      return dir ? Number(dir.num) : 0;
    })
    .filter(Boolean)
    .sort((a, b) => a - b);
  return `Направления: ${nums.join(", ")}`;
}

function bulkCreateAssignmentsForCycle(s: GhSnapshot, cycleId: string): number {
  const people = s.persons.filter((p) => p.orgGroupId);
  const byGroup = new Map<string, string[]>();
  for (const p of people) {
    const gid = p.orgGroupId as string;
    const arr = byGroup.get(gid) ?? [];
    arr.push(p.id as string);
    byGroup.set(gid, arr);
  }
  const rows: JsonRecord[] = [];
  for (const p of people) {
    const gid = p.orgGroupId as string;
    const inGroup = byGroup.get(gid) ?? [];
    const others = inGroup.filter((id) => id !== p.id);
    rows.push({
      id: `tmp_${inviteTokenHex()}`,
      cycleId,
      revieweeId: p.id,
      reviewerId: p.id,
      relationship: "SELF",
      inviteToken: inviteTokenHex(),
      submittedAt: null,
      createdAt: new Date().toISOString(),
    });
    const managerId = p.managerId as string | null | undefined;
    if (managerId) {
      rows.push({
        id: `tmp_${inviteTokenHex()}`,
        cycleId,
        revieweeId: p.id,
        reviewerId: managerId,
        relationship: "MANAGER",
        inviteToken: inviteTokenHex(),
        submittedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    const withoutManager = managerId ? others.filter((id) => id !== managerId) : others;
    const peerPool = withoutManager.length > 0 ? withoutManager : others.filter((id) => id !== p.id);
    const sortedPeers = [...peerPool].sort();
    const peerId = sortedPeers[0];
    if (peerId && peerId !== managerId) {
      rows.push({
        id: `tmp_${inviteTokenHex()}`,
        cycleId,
        revieweeId: p.id,
        reviewerId: peerId,
        relationship: "PEER",
        inviteToken: inviteTokenHex(),
        submittedAt: null,
        createdAt: new Date().toISOString(),
      });
    }
  }
  // assign real cuid-like ids
  for (const r of rows) {
    r.id = `cl_${inviteTokenHex().slice(0, 24)}`;
  }
  s.reviewAssignments.push(...rows);
  return rows.length;
}

let cached: GhSnapshot | null = null;
let loadPromise: Promise<GhSnapshot> | null = null;

async function loadSnapshot(basePath: string): Promise<GhSnapshot> {
  if (cached) return cached;
  if (!loadPromise) {
    loadPromise = (async () => {
      const url = `${basePath}/gh-pages-db.json`.replace(/\/{2,}/g, "/");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`gh-pages-db.json: ${res.status}`);
      const raw = (await res.json()) as GhSnapshot;
      let state = deepClone(raw);
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as GhSnapshot;
          if (parsed.buildId === raw.buildId) state = parsed;
        }
      } catch {
        /* ignore */
      }
      cached = state;
      return state;
    })();
  }
  return loadPromise;
}

function persist(s: GhSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function stripBasePath(pathname: string, basePath: string): string {
  if (basePath && pathname.startsWith(basePath)) {
    const rest = pathname.slice(basePath.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname;
}

export async function ghPagesHandleRequest(
  inputUrl: string,
  init: RequestInit | undefined,
  opts: { basePath: string; cookieHeader: string },
): Promise<Response> {
  const s = await loadSnapshot(opts.basePath || "");
  const method = (init?.method ?? "GET").toUpperCase();
  let bodyStr = "";
  if (init?.body && typeof init.body === "string") bodyStr = init.body;

  const full = inputUrl.startsWith("http") ? new URL(inputUrl) : new URL(inputUrl, "http://localhost");
  const path = stripBasePath(full.pathname, opts.basePath);
  const search = full.searchParams;

  try {
    // --- Survey ---
    const surveyM = path.match(/^\/api\/survey\/([^/]+)$/);
    if (surveyM) {
      const token = surveyM[1]!;
      if (method === "GET") {
        const assignment = s.reviewAssignments.find((a) => a.inviteToken === token);
        if (!assignment) return jsonResponse({ error: "Недействительная ссылка" }, 404);
        const cycle = s.reviewCycles.find((c) => c.id === assignment.cycleId)!;
        const reviewee = s.persons.find((p) => p.id === assignment.revieweeId)!;
        const reviewer = s.persons.find((p) => p.id === assignment.reviewerId)!;
        const ratings = s.ratingAnswers.filter((r) => r.assignmentId === assignment.id);
        const texts = s.textAnswers.filter((t) => t.assignmentId === assignment.id);
        const competencies = s.competencies as unknown as Competency[];
        const existingScores: Record<string, number> = {};
        const existingCompetencyComments: Record<string, string> = {};
        for (const r of ratings) {
          existingScores[r.competencyId as string] = Number(r.score);
          const cm = (r.comment as string | null | undefined)?.trim();
          if (cm) existingCompetencyComments[r.competencyId as string] = cm;
        }
        const existingText = (texts[0]?.body as string) ?? "";
        return jsonResponse({
          submitted: Boolean(assignment.submittedAt),
          reviewerId: reviewer.id,
          assignmentId: assignment.id,
          cycleId: cycle.id,
          cycleName: cycle.name,
          collectionStartsAt: cycle.startsAt ?? null,
          collectionEndsAt: cycle.endsAt ?? null,
          relationship: assignment.relationship,
          revieweeId: assignment.revieweeId,
          revieweeName: reviewee.name,
          reviewerName: reviewer.name,
          competencies,
          existingScores,
          existingCompetencyComments,
          existingText,
        });
      }
      if (method === "POST") {
        const body = JSON.parse(bodyStr || "{}") as {
          scores: Record<string, number>;
          text: string;
          competencyComments?: Record<string, string>;
        };
        const assignment = s.reviewAssignments.find((a) => a.inviteToken === token);
        if (!assignment) return jsonResponse({ error: "Недействительная ссылка" }, 404);
        if (assignment.submittedAt) return jsonResponse({ error: "Анкета уже отправлена" }, 400);
        const competencies = s.competencies as unknown as Competency[];
        const compIds = new Set(competencies.map((c) => c.id));
        for (const id of Object.keys(body.scores ?? {})) {
          if (!compIds.has(id)) return jsonResponse({ error: "Неизвестная компетенция" }, 400);
        }
        if (!body.text || body.text.trim().length < 20) {
          return jsonResponse({ error: "Общий комментарий обязателен (минимум 20 символов)" }, 400);
        }
        const comments = body.competencyComments ?? {};
        for (const c of competencies) {
          const score = Number(body.scores[c.id]);
          if (!Number.isFinite(score) || score < 1 || score > 5) {
            return jsonResponse({ error: "Все компетенции должны быть оценены по шкале от 1 до 5" }, 400);
          }
          const raw = comments[c.id]?.trim();
          const comment = raw && raw.length > 0 ? raw : null;
          const existing = s.ratingAnswers.find(
            (r) => r.assignmentId === assignment.id && r.competencyId === c.id,
          );
          if (existing) {
            existing.score = score;
            existing.comment = comment;
          } else {
            s.ratingAnswers.push({
              id: `ra_${inviteTokenHex().slice(0, 20)}`,
              assignmentId: assignment.id,
              competencyId: c.id,
              score,
              comment,
            });
          }
        }
        s.textAnswers = s.textAnswers.filter((t) => t.assignmentId !== assignment.id);
        s.textAnswers.push({ id: `ta_${inviteTokenHex().slice(0, 20)}`, assignmentId: assignment.id, body: body.text.trim() });
        assignment.submittedAt = new Date().toISOString();
        persist(s);
        return jsonResponse({ ok: true });
      }
    }

    // --- Cycles list ---
    if (path === "/api/cycles" && method === "GET") {
      const cycles = [...s.reviewCycles].sort(
        (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
      );
      const payload = cycles.map((c) => {
        const scoped = s.reviewCycleDirections.filter((x) => x.cycleId === c.id);
        const assignments = s.reviewAssignments.filter((a) => a.cycleId === c.id);
        const revieweeIds = [...new Set(assignments.map((a) => a.revieweeId as string))];
        const completed = assignments.filter((a) => a.submittedAt).length;
        const total = assignments.length;
        return {
          id: c.id,
          name: c.name,
          createdAt: c.createdAt,
          startsAt: c.startsAt ?? null,
          endsAt: c.endsAt ?? null,
          semesterPeriodStartsAt: c.semesterPeriodStartsAt ?? null,
          semesterPeriodEndsAt: c.semesterPeriodEndsAt ?? null,
          scopeType: c.scopeType,
          scopeLabel: scopeLabelFromCycleScoped(c, scoped, s.orgDirections),
          revieweeCount: revieweeIds.length,
          completionRate: total ? Math.round((completed / total) * 100) : 0,
          completed,
          total,
        };
      });
      return jsonResponse({ cycles: payload, headcount: s.persons.length });
    }

    if (path === "/api/cycles" && method === "POST") {
      const body = JSON.parse(bodyStr || "{}") as {
        name?: string;
        startsAt?: string | null;
        endsAt?: string | null;
        semesterPeriodStartsAt?: string | null;
        semesterPeriodEndsAt?: string | null;
      };
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return jsonResponse({ error: "Укажите название цикла" }, 400);
      if (s.reviewCycles.some((c) => (c.name as string) === name)) {
        return jsonResponse({ error: "Цикл с таким названием уже существует" }, 409);
      }
      const startsAtStr = typeof body.startsAt === "string" ? body.startsAt.trim() : "";
      const endsAtStr = typeof body.endsAt === "string" ? body.endsAt.trim() : "";
      const semStartStr = typeof body.semesterPeriodStartsAt === "string" ? body.semesterPeriodStartsAt.trim() : "";
      const semEndStr = typeof body.semesterPeriodEndsAt === "string" ? body.semesterPeriodEndsAt.trim() : "";
      if (!startsAtStr || !endsAtStr) {
        return jsonResponse({ error: "Укажите даты начала и окончания сбора оценок" }, 400);
      }
      if (!semStartStr || !semEndStr) {
        return jsonResponse({ error: "Укажите период полугодия (даты начала и окончания)" }, 400);
      }
      const startsAt = parseLocalDateOnly(startsAtStr);
      const endsAt = parseLocalDateOnly(endsAtStr);
      const semesterPeriodStartsAt = parseLocalDateOnly(semStartStr);
      const semesterPeriodEndsAt = parseLocalDateOnly(semEndStr);
      if (!startsAt || !endsAt || !semesterPeriodStartsAt || !semesterPeriodEndsAt) {
        return jsonResponse({ error: "Некорректный формат даты (ожидается YYYY-MM-DD)" }, 400);
      }
      const today = todayLocalISODate();
      if (startsAtStr < today) {
        return jsonResponse({ error: "Дата начала сбора не может быть раньше сегодняшнего дня" }, 400);
      }
      if (endsAtStr < today) {
        return jsonResponse({ error: "Дата окончания сбора не может быть раньше сегодняшнего дня" }, 400);
      }
      if (endsAtStr < startsAtStr) {
        return jsonResponse({ error: "Окончание сбора не может быть раньше начала" }, 400);
      }
      if (semEndStr < semStartStr) {
        return jsonResponse({ error: "Окончание периода полугодия не может быть раньше начала" }, 400);
      }
      const cycleId = `cyc_${inviteTokenHex().slice(0, 20)}`;
      const cycle: JsonRecord = {
        id: cycleId,
        name,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        semesterPeriodStartsAt: semesterPeriodStartsAt.toISOString(),
        semesterPeriodEndsAt: semesterPeriodEndsAt.toISOString(),
        scopeType: "COMPANY",
        createdAt: new Date().toISOString(),
      };
      s.reviewCycles.unshift(cycle);
      const created = bulkCreateAssignmentsForCycle(s, cycleId);
      persist(s);
      return jsonResponse({ ok: true, id: cycleId, assignmentsCreated: created });
    }

    const cycleIdM = path.match(/^\/api\/cycles\/([^/]+)$/);
    if (cycleIdM && method === "DELETE") {
      const id = cycleIdM[1]!;
      const idx = s.reviewCycles.findIndex((c) => c.id === id);
      if (idx === -1) return jsonResponse({ error: "Цикл не найден или уже удалён" }, 404);
      s.reviewCycles.splice(idx, 1);
      s.reviewCycleDirections = s.reviewCycleDirections.filter((x) => x.cycleId !== id);
      const assIds = s.reviewAssignments.filter((a) => a.cycleId === id).map((a) => a.id as string);
      s.reviewAssignments = s.reviewAssignments.filter((a) => a.cycleId !== id);
      s.ratingAnswers = s.ratingAnswers.filter((r) => !assIds.includes(r.assignmentId as string));
      s.textAnswers = s.textAnswers.filter((t) => !assIds.includes(t.assignmentId as string));
      s.aiReports = s.aiReports.filter((r) => r.cycleId !== id);
      persist(s);
      return jsonResponse({ ok: true });
    }

    if (cycleIdM && method === "GET") {
      const id = cycleIdM[1]!;
      const cycle = s.reviewCycles.find((c) => c.id === id);
      if (!cycle) return jsonResponse({ error: "Not found" }, 404);
      const assignments = s.reviewAssignments.filter((a) => a.cycleId === id);
      const nameById = new Map(s.persons.map((p) => [p.id as string, p.name as string]));
      const byReviewee = new Map<string, { reviewee: { id: string; name: string }; completed: number; total: number }>();
      for (const a of assignments) {
        const rid = a.revieweeId as string;
        const cur = byReviewee.get(rid) ?? {
          reviewee: { id: rid, name: nameById.get(rid) ?? "" },
          completed: 0,
          total: 0,
        };
        cur.total += 1;
        if (a.submittedAt) cur.completed += 1;
        byReviewee.set(rid, cur);
      }
      const reviewees = [...byReviewee.values()].map((v) => ({
        ...v.reviewee,
        completed: v.completed,
        total: v.total,
        completionRate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
      }));
      const otherCycles = s.reviewCycles
        .filter((c) => c.id !== id)
        .sort((a, b) => new Date((b.startsAt as string) ?? 0).getTime() - new Date((a.startsAt as string) ?? 0).getTime())
        .slice(0, 4)
        .map((c) => ({ id: c.id, name: c.name }));
      const directionBreakdown = directionBreakdownForCycle(s, id);
      const scopedDirs = s.reviewCycleDirections.filter((x) => x.cycleId === id);
      const scopedDirections = scopedDirs.map((x) => ({
        cycleId: id,
        directionId: x.directionId,
        direction: s.orgDirections.find((d) => d.id === x.directionId) ?? { id: x.directionId, num: 0, name: "" },
      }));
      return jsonResponse({
        cycle: {
          id: cycle.id,
          name: cycle.name,
          startsAt: cycle.startsAt,
          endsAt: cycle.endsAt,
          semesterPeriodStartsAt: cycle.semesterPeriodStartsAt,
          semesterPeriodEndsAt: cycle.semesterPeriodEndsAt,
          scopeType: cycle.scopeType,
          scopedDirections,
        },
        reviewees,
        directionBreakdown,
        otherCycles,
        assignments: assignments.map((a) => ({
          id: a.id,
          revieweeId: a.revieweeId,
          revieweeName: nameById.get(a.revieweeId as string),
          reviewerId: a.reviewerId,
          reviewerName: nameById.get(a.reviewerId as string),
          relationship: a.relationship,
          submittedAt: a.submittedAt,
          inviteToken: a.inviteToken,
          surveyUrl: `${opts.basePath}/survey/${a.inviteToken}`.replace(/\/{2,}/g, "/"),
        })),
      });
    }

    // --- my-assignments ---
    if (path === "/api/my-assignments" && method === "GET") {
      const status = search.get("status") ?? "pending";
      if (status !== "pending" && status !== "archive") {
        return jsonResponse({ error: "status должен быть pending или archive" }, 400);
      }
      const role = parsePreviewRole(parseCookies(opts.cookieHeader)[PREVIEW_ROLE_COOKIE]);
      const viewerId = resolveViewerFromCookies(opts.cookieHeader, s.persons);
      if (!viewerId) return jsonResponse({ reviewerId: null, items: [] });
      const items = s.reviewAssignments
        .filter((a) => {
          if (a.reviewerId !== viewerId) return false;
          if (status === "pending") return !a.submittedAt;
          return Boolean(a.submittedAt);
        })
        .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
        .slice(0, 120);
      return jsonResponse({
        reviewerId: viewerId,
        items: items.map((a) => {
          const c = s.reviewCycles.find((x) => x.id === a.cycleId)!;
          const rv = s.persons.find((p) => p.id === a.revieweeId)!;
          return {
            token: a.inviteToken,
            cycleId: a.cycleId,
            cycleName: c.name,
            collectionStartsAt: c.startsAt ?? null,
            collectionEndsAt: c.endsAt ?? null,
            revieweeId: a.revieweeId,
            revieweeName: rv.name,
            relationship: a.relationship,
            submittedAt: a.submittedAt ?? null,
          };
        }),
      });
    }

    // --- respondent ---
    if (path === "/api/respondent" && method === "GET") {
      const reviewerId = search.get("reviewerId");
      const status = search.get("status") ?? "pending";
      if (!reviewerId?.trim()) return jsonResponse({ error: "Не указан идентификатор респондента" }, 400);
      if (status !== "pending" && status !== "archive") {
        return jsonResponse({ error: "status должен быть pending или archive" }, 400);
      }
      const items = s.reviewAssignments
        .filter((a) => {
          if (a.reviewerId !== reviewerId) return false;
          if (status === "pending") return !a.submittedAt;
          return Boolean(a.submittedAt);
        })
        .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
        .slice(0, 80);
      return jsonResponse({
        items: items.map((a) => {
          const c = s.reviewCycles.find((x) => x.id === a.cycleId)!;
          const rv = s.persons.find((p) => p.id === a.revieweeId)!;
          return {
            token: a.inviteToken,
            cycleId: a.cycleId,
            cycleName: c.name,
            collectionStartsAt: c.startsAt ?? null,
            collectionEndsAt: c.endsAt ?? null,
            revieweeId: a.revieweeId,
            revieweeName: rv.name,
            relationship: a.relationship,
            submittedAt: a.submittedAt ?? null,
          };
        }),
      });
    }

    // --- me-context ---
    if (path === "/api/me-context" && method === "GET") {
      const role = parsePreviewRole(parseCookies(opts.cookieHeader)[PREVIEW_ROLE_COOKIE]);
      const viewerId = resolveViewerFromCookies(opts.cookieHeader, s.persons);
      const cycle = [...s.reviewCycles].sort(
        (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
      )[0];
      if (!cycle) return jsonResponse({ ctx: null, viewerId, role });
      const anna = s.persons.find((p) => p.email === "anna@demo.local");
      const annaInCycle = anna
        ? s.reviewAssignments.find((a) => a.cycleId === cycle.id && a.revieweeId === anna.id)
        : null;
      const firstAss = s.reviewAssignments.find((a) => a.cycleId === cycle.id);
      const anchorRevieweeId = (annaInCycle?.revieweeId as string) ?? (firstAss?.revieweeId as string | undefined);
      if (!anchorRevieweeId) return jsonResponse({ ctx: null, viewerId, role });
      const pending = s.reviewAssignments
        .filter((a) => a.cycleId === cycle.id && !a.submittedAt)
        .slice(0, 40);
      const nameById = new Map(s.persons.map((p) => [p.id as string, p.name as string]));
      const ctx = {
        cycleId: cycle.id as string,
        cycleName: cycle.name as string,
        revieweeId: anchorRevieweeId,
        pending: pending.map((p) => ({
          inviteToken: p.inviteToken as string,
          revieweeName: nameById.get(p.revieweeId as string) ?? "",
          reviewerName: nameById.get(p.reviewerId as string) ?? "",
          relationship: p.relationship as string,
        })),
      };
      return jsonResponse({ ctx, viewerId, role });
    }

    // --- team-directory ---
    if (path === "/api/team-directory" && method === "GET") {
      const role = parsePreviewRole(parseCookies(opts.cookieHeader)[PREVIEW_ROLE_COOKIE]);
      const viewerPersonId = resolveViewerFromCookies(opts.cookieHeader, s.persons);
      let people = [...s.persons].sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
      if (role === "manager" && viewerPersonId) {
        const allowed = new Set(getManagerVisiblePersonIds(viewerPersonId, s.persons));
        people = people.filter((p) => allowed.has(p.id as string));
      }
      return jsonResponse({
        role,
        people: people.map((p) => ({
          id: p.id,
          name: p.name,
          title: p.title ?? null,
          email: p.email ?? null,
          managerId: p.managerId ?? null,
        })),
      });
    }

    // --- reports-dashboard ---
    if (path === "/api/reports-dashboard" && method === "GET") {
      const role = parsePreviewRole(parseCookies(opts.cookieHeader)[PREVIEW_ROLE_COOKIE]);
      const viewerPersonId = resolveViewerFromCookies(opts.cookieHeader, s.persons);
      let allowedRevieweeIds: Set<string> | null = null;
      if (role === "manager" && viewerPersonId) {
        allowedRevieweeIds = new Set(getManagerVisiblePersonIds(viewerPersonId, s.persons));
      }
      const cycles = [...s.reviewCycles].sort(
        (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
      );
      const items = cycles.map((c) => {
        const allAss = s.reviewAssignments.filter((a) => a.cycleId === c.id);
        const ass = allowedRevieweeIds
          ? allAss.filter((a) => allowedRevieweeIds!.has(a.revieweeId as string))
          : allAss;
        const revieweeIds = [...new Set(ass.map((a) => a.revieweeId as string))].sort();
        const done = ass.filter((a) => a.submittedAt).length;
        const total = ass.length;
        const firstReviewee = revieweeIds[0];
        const scoped = s.reviewCycleDirections.filter((x) => x.cycleId === c.id);
        const scopeLabel =
          c.scopeType !== "DIRECTIONS" || scoped.length === 0
            ? "Вся компания"
            : `Напр.: ${scoped
                .map((x) => {
                  const dir = s.orgDirections.find((d) => d.id === x.directionId);
                  return dir ? Number(dir.num) : 0;
                })
                .filter(Boolean)
                .sort((a, b) => a - b)
                .join(", ")}`;
        return {
          id: c.id,
          name: c.name,
          scopeLabel,
          revieweeCount: revieweeIds.length,
          completionRate: total ? Math.round((done / total) * 100) : 0,
          firstRevieweeId: firstReviewee,
        };
      });
      const avg =
        items.length === 0 ? 0 : Math.round(items.reduce((a, c) => a + c.completionRate, 0) / items.length);
      const latestCycleId = (cycles[0]?.id as string) ?? null;
      type CoverageRow = {
        revieweeId: string;
        revieweeName: string;
        selfSubmitted: boolean;
        pendingAssignments: { id: string; reviewerName: string; relationship: string }[];
      };
      let coverage: CoverageRow[] | null = null;
      if (role === "manager" && viewerPersonId && latestCycleId) {
        const visible = getManagerVisiblePersonIds(viewerPersonId, s.persons);
        const ass = s.reviewAssignments.filter(
          (a) => a.cycleId === latestCycleId && visible.includes(a.revieweeId as string),
        );
        const nameById = new Map(s.persons.map((p) => [p.id as string, p.name as string]));
        const byRv = new Map<string, JsonRecord[]>();
        for (const a of ass) {
          const rid = a.revieweeId as string;
          if (!byRv.has(rid)) byRv.set(rid, []);
          byRv.get(rid)!.push(a);
        }
        const rows: CoverageRow[] = [];
        for (const rid of visible) {
          const list = byRv.get(rid) ?? [];
          if (list.length === 0) continue;
          const name = nameById.get(rid) ?? "";
          const self = list.find((x) => x.relationship === "SELF");
          const selfSubmitted = Boolean(self?.submittedAt);
          const pendingAssignments = list
            .filter((x) => !x.submittedAt)
            .map((x) => ({
              id: x.id as string,
              reviewerName: nameById.get(x.reviewerId as string) ?? "",
              relationship: x.relationship as string,
            }));
          rows.push({ revieweeId: rid, revieweeName: name, selfSubmitted, pendingAssignments });
        }
        rows.sort((a, b) => a.revieweeName.localeCompare(b.revieweeName, "ru"));
        coverage = rows;
      }
      return jsonResponse({ role, items, avg, latestCycleId, coverage });
    }

    // --- reviewees summary / ai ---
    const sumM = path.match(/^\/api\/reviewees\/([^/]+)\/summary$/);
    if (sumM && method === "GET") {
      const revieweeId = sumM[1]!;
      const cycleId = search.get("cycleId");
      if (!cycleId) return jsonResponse({ error: "cycleId обязателен" }, 400);
      const role = parsePreviewRole(parseCookies(opts.cookieHeader)[PREVIEW_ROLE_COOKIE]);
      const viewerPersonId = resolveViewerFromCookies(opts.cookieHeader, s.persons);
      const allowed = canViewRevieweeResults(role, viewerPersonId, revieweeId, s.persons);
      if (!allowed) return jsonResponse({ error: "Нет доступа к этим результатам" }, 403);
      const verbatim = includeVerbatimFeedbackForViewer(role, viewerPersonId, revieweeId);
      const data = loadCycleSummaryFromState(s, cycleId, revieweeId, verbatim);
      if (!data) return jsonResponse({ error: "Не найдено" }, 404);
      const radar = radarRows(data.competencies, data.averages);
      const { anonymousTextBundle: _omit, averages: _a, ...rest } = data;
      return jsonResponse({
        ...rest,
        radar,
        viewerMode: verbatim ? "full" : "scores_only",
      });
    }

    const aiM = path.match(/^\/api\/reviewees\/([^/]+)\/ai$/);
    if (aiM) {
      const revieweeId = aiM[1]!;
      const cycleId = search.get("cycleId");
      if (!cycleId) return jsonResponse({ error: "cycleId обязателен" }, 400);
      const role = parsePreviewRole(parseCookies(opts.cookieHeader)[PREVIEW_ROLE_COOKIE]);
      const viewerPersonId = resolveViewerFromCookies(opts.cookieHeader, s.persons);
      const allowed = canViewRevieweeResults(role, viewerPersonId, revieweeId, s.persons);
      if (!allowed) return jsonResponse({ error: "Нет доступа" }, 403);

      if (method === "GET") {
        const row = s.aiReports.find((r) => r.cycleId === cycleId && r.revieweeId === revieweeId);
        if (!row) return jsonResponse({ report: null });
        return jsonResponse({ report: JSON.parse(row.payload as string), model: row.model });
      }
      if (method === "POST") {
        const data = loadCycleSummaryFromState(s, cycleId, revieweeId, true);
        if (!data) return jsonResponse({ error: "Не найдено" }, 404);
        const roleAveragesReadable: Record<
          string,
          { SELF?: number; MANAGER?: number; PEER?: number; SUBORDINATE?: number }
        > = {};
        for (const c of data.competencies) {
          roleAveragesReadable[c.title] = data.roleAveragesByCompetency[c.id]!;
        }
        const { report, model } = await generateAiReportWithOpenAI({
          revieweeName: data.reviewee.name as string,
          competencies: data.competencies,
          roleAverages: roleAveragesReadable,
          anonymousTextBundle: data.anonymousTextBundle,
          selfAvg: data.selfAvg,
          othersAvg: data.othersAvg,
        });
        const payloadStr = JSON.stringify(report);
        const existing = s.aiReports.findIndex((r) => r.cycleId === cycleId && r.revieweeId === revieweeId);
        const row = {
          id: `air_${inviteTokenHex().slice(0, 18)}`,
          cycleId,
          revieweeId,
          payload: payloadStr,
          model,
          createdAt: new Date().toISOString(),
        };
        if (existing >= 0) s.aiReports[existing] = row;
        else s.aiReports.push(row);
        persist(s);
        return jsonResponse({ report, model });
      }
    }

    return jsonResponse({ error: "Not found", path }, 404);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
}

/** Сброс кэша снимка (тесты / hot reload). */
export function resetGhPagesCache() {
  cached = null;
  loadPromise = null;
}
