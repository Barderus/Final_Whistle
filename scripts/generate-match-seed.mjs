import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMatchesCsv } from "../src/utils/csv.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const csvPath = path.join(projectRoot, "public", "matches.csv");
const seedPath = path.join(projectRoot, "supabase", "seed.sql");

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const matches = parseMatchesCsv(fs.readFileSync(csvPath, "utf8"));
const values = matches
  .map(
    (match) =>
      `  (${[
        sqlString(match.id),
        match.match_number,
        sqlString(match.stage),
        sqlString(match.start_time),
        sqlString(match.location),
        sqlString(match.team1),
        sqlString(match.team2),
      ].join(", ")})`,
  )
  .join(",\n");

const sql = `insert into public.matches (
  id,
  match_number,
  stage,
  start_time,
  location,
  team1,
  team2
)
values
${values}
on conflict (id)
do update set
  match_number = excluded.match_number,
  stage = excluded.stage,
  start_time = excluded.start_time,
  location = excluded.location,
  team1 = excluded.team1,
  team2 = excluded.team2;
`;

fs.writeFileSync(seedPath, sql, "utf8");
console.log(`Wrote ${matches.length} matches to ${seedPath}`);
