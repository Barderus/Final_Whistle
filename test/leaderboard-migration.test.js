import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migrationPath = new URL(
  "../supabase/migrations/202606110004_fix_leaderboard_and_profile_sync.sql",
  import.meta.url,
);
const migration = fs.readFileSync(migrationPath, "utf8");
const initialMigrationPath = new URL(
  "../supabase/migrations/202606100001_initial_schema.sql",
  import.meta.url,
);
const initialMigration = fs.readFileSync(initialMigrationPath, "utf8");

test("leaderboard excludes users on the admin allowlist", () => {
  assert.match(
    migration,
    /where not public\.is_admin_user\(profiles\.id\)/,
  );
});

test("leaderboard totals use the shared database scoring function", () => {
  assert.match(migration, /sum\(\s*public\.prediction_points\(/);
  assert.match(migration, /then 3/);
  assert.match(migration, /then 1/);
});

test("display-name updates synchronize authentication metadata", () => {
  assert.match(migration, /update auth\.users/);
  assert.match(
    migration,
    /jsonb_build_object\('display_name', normalized_name\)/,
  );
  assert.match(
    migration,
    /jsonb_build_object\('display_name', profiles\.display_name::text\)/,
  );
});

test("database rejects prediction writes at or after kickoff", () => {
  assert.match(
    initialMigration,
    /if selected_match\.start_time <= now\(\) then/,
  );
  assert.match(
    initialMigration,
    /This prediction is locked because the match has started\./,
  );
});
