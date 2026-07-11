/**
 * System-level seed only (Module 001 scope). Business seed data begins
 * once domain models exist (Module 002+).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.systemHealth.upsert({
    where: { component: "database" },
    update: { status: "ok", checkedAt: new Date() },
    create: { component: "database", status: "ok" },
  });
  console.log("Seed complete: system_health baseline row created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
