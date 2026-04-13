import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { getManagerVisiblePersonIds } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerPersonId = await resolveViewerPersonId(cookieStore, role);

  let where: { id: { in: string[] } } | Record<string, never> = {};
  if (role === "manager" && viewerPersonId) {
    const ids = await getManagerVisiblePersonIds(viewerPersonId);
    where = { id: { in: ids } };
  }

  const people = await prisma.person.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, email: true, managerId: true },
  });

  return NextResponse.json({ people, role });
}
