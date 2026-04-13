import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPreviewRoleFromCookies, resolveViewerPersonId } from "@/lib/demo-session";
import { getDemoContext } from "@/lib/get-demo-context";

/** Данные для клиентской страницы «Мои результаты» (в т.ч. GitHub Pages). */
export async function GET() {
  const cookieStore = cookies();
  const role = getPreviewRoleFromCookies(cookieStore);
  const viewerId = await resolveViewerPersonId(cookieStore, role);
  const ctx = await getDemoContext();
  return NextResponse.json({ ctx, viewerId, role });
}
