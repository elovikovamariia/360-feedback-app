import { DEMO_PERSON_EMAIL } from "@/lib/demo-personas";
import { prisma } from "@/lib/prisma";
import { parsePreviewRole, type PreviewRoleId } from "@/lib/roles";

/** Дублируем роль из localStorage в cookie, чтобы серверные страницы и API знали выбранный режим предпросмотра. */
export const PREVIEW_ROLE_COOKIE = "360_feedback_preview_role";
export const ACTOR_PERSON_COOKIE = "360_feedback_actor_person_id";

type CookieStoreLike = { get(name: string): { value: string } | undefined };

export function getPreviewRoleFromCookies(cookieStore: CookieStoreLike): PreviewRoleId {
  return parsePreviewRole(cookieStore.get(PREVIEW_ROLE_COOKIE)?.value);
}

export async function defaultDemoActorPersonId(role: PreviewRoleId): Promise<string | null> {
  if (role === "manager") {
    const p = await prisma.person.findFirst({ where: { email: DEMO_PERSON_EMAIL.manager }, select: { id: true } });
    return p?.id ?? null;
  }
  if (role === "employee") {
    const p = await prisma.person.findFirst({ where: { email: DEMO_PERSON_EMAIL.employee }, select: { id: true } });
    return p?.id ?? null;
  }
  if (role === "respondent") {
    const p = await prisma.person.findFirst({
      where: { email: DEMO_PERSON_EMAIL.respondentPeer },
      select: { id: true },
    });
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
