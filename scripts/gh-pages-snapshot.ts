/**
 * Экспорт содержимого SQLite (Prisma) в public/gh-pages-db.json для статического демо на GitHub Pages.
 * Запуск: npm run db:export-snapshot (после db push + seed).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outPath = join(root, "public", "gh-pages-db.json");

async function main() {
  const prisma = new PrismaClient();
  try {
    const [
      orgDirections,
      orgDepartments,
      orgSubdivisions,
      orgGroups,
      persons,
      competencies,
      reviewCycles,
      reviewCycleDirections,
      reviewAssignments,
      ratingAnswers,
      textAnswers,
      aiReports,
    ] = await Promise.all([
      prisma.orgDirection.findMany({ orderBy: { num: "asc" } }),
      prisma.orgDepartment.findMany(),
      prisma.orgSubdivision.findMany(),
      prisma.orgGroup.findMany(),
      prisma.person.findMany(),
      prisma.competency.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.reviewCycle.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.reviewCycleDirection.findMany(),
      prisma.reviewAssignment.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.ratingAnswer.findMany(),
      prisma.textAnswer.findMany(),
      prisma.aiReport.findMany(),
    ]);

    const payload = {
      version: 1 as const,
      buildId: new Date().toISOString(),
      orgDirections,
      orgDepartments,
      orgSubdivisions,
      orgGroups,
      persons,
      competencies,
      reviewCycles,
      reviewCycleDirections,
      reviewAssignments,
      ratingAnswers,
      textAnswers,
      aiReports,
    };

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(payload), "utf8");
    console.log(`Wrote ${outPath} (${(Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(1)} KiB)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
