import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const directions = await prisma.orgDirection.findMany({
    orderBy: { num: "asc" },
    select: { id: true, num: true, name: true },
  });
  return NextResponse.json({ directions });
}
