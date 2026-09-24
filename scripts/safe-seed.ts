import fs from "fs";
import path from "path";
import { execSync } from "child_process";

try {
  const seedFile = path.resolve(process.cwd(), "scripts/seed.ts");
  if (!fs.existsSync(seedFile)) {
    console.error("Seed aborted: scripts/seed.ts does not exist.");
    process.exit(1);
  }
  const content = fs.readFileSync(seedFile, "utf-8");

  const forbiddenPatterns = [
    /prisma\.\w+\.delete\(/,
    /prisma\.\w+\.deleteMany\(/,
  ];

  const violations = forbiddenPatterns.filter((pattern) => pattern.test(content));

  if (violations.length > 0) {
    console.error("Seed aborted: seed.ts contains prisma.delete or prisma.deleteMany calls.");
    console.error("Remove all delete operations before seeding to avoid deleting production data.");
    console.error("Do not modify this file to bypass this check in development environment as production and deployment database can be shared.");
    process.exit(1);
  }

} catch (err: any) {
  console.error("Seed aborted:", err?.message ?? err);
  process.exit(1);
}

execSync("tsx --require dotenv/config scripts/seed.ts", { stdio: "inherit" });