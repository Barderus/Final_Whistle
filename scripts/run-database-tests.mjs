import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required to run database integration tests.");
  process.exit(1);
}

const files = [
  path.join(projectRoot, "supabase", "tests", "bootstrap.sql"),
  ...fs
    .readdirSync(path.join(projectRoot, "supabase", "migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) =>
      path.join(projectRoot, "supabase", "migrations", file),
    ),
  path.join(projectRoot, "supabase", "tests", "competition.sql"),
];

for (const file of files) {
  console.log(`Applying ${path.relative(projectRoot, file)}`);

  const result = spawnSync(
    "psql",
    [databaseUrl, "--set", "ON_ERROR_STOP=1", "--file", file],
    {
      encoding: "utf8",
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Database integration tests passed.");
