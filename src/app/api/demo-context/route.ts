import { NextResponse } from "next/server";
import { getDemoContext } from "@/lib/get-demo-context";

export async function GET() {
  const ctx = await getDemoContext();
  if (!ctx) return NextResponse.json({ ok: false, error: "Нет данных в БД" }, { status: 404 });
  return NextResponse.json({ ok: true, ...ctx });
}
