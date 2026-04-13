import { prisma } from "@/lib/prisma";
import { parsePreviewRole, type PreviewRoleId } from "@/lib/roles";

/** Дублируем роль из localStorage в cookie, чтобы серверные страницы и API знали режим демо. */
export const PREVIEW_ROLE_COOKIE = "360_feedback_preview_role";
export const ACTOR_PERSON_COOKIE = "360_feedback_actor_person_id";

const DEMO_EMAIL_EMPLOYEE = "anna@demo.local";
const DEMO_EMAIL_MANAGER = "dm@demo.local";

type CookieStoreLike = { get(name: string): { value: string } | undefined };

export function getPreviewRoleFromCookies(cookieStore: CookieStoreLike): PreviewRoleId {
  return parsePreviewRole(cookieStore.get(PREVIEW_ROLE_COOKIE)?.value);
}

export async function defaultDemoActorPersonId(role: PreviewRoleId): Promise<string | null> {
  if (role === "manager") {
    const p = await prisma.person.findFirst({ where: { email: DEMO_EMAIL_MANAGER }, select: { id: true } });
    return p?.id ?? null;
  }
  if (role === "employee" || role === "respondent") {
    const p = await prisma.person.findFirst({ where: { email: DEMO_EMAIL_EMPLOYEE }, select: { id: true } });
    return p?.id ?? null;
  }
  return null;
}

export async function resolveViewerPersonId(
  cookieStore: CookieStoreLike,
  role: PreviewRoleId,
): Promise<string | null> {
  const raw = cookieStore.get(ACTOR_PERSON_COOKIE)?.value?.trim();
  if (raw) {
    const ok = await prisma.person.findUnique({ where: { id: raw }, select: { id: true } });
    if (ok) return ok.id;
  }
  return defaultDemoActorPersonId(role);
}
