import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migrationPath = new URL(
  "../supabase/migrations/202606110005_harden_competition_and_results.sql",
  import.meta.url,
);
const migration = fs.readFileSync(migrationPath, "utf8");
const integrationTestPath = new URL(
  "../supabase/tests/competition.sql",
  import.meta.url,
);
const integrationTest = fs.readFileSync(integrationTestPath, "utf8");

test("admin assignment permanently excludes the account from competition", () => {
  assert.match(migration, /create table public\.competition_exclusions/);
  assert.match(
    migration,
    /create trigger admin_emails_exclude_from_competition/,
  );
  assert.match(
    migration,
    /if public\.is_competition_excluded\(new\.user_id\) then/,
  );
  assert.match(
    migration,
    /where not public\.is_competition_excluded\(profiles\.id\)/,
  );
});

test("shared prediction policy hides excluded accounts", () => {
  assert.match(
    migration,
    /not public\.is_competition_excluded\(user_id\)/,
  );
});

test("result changes are audited and future completion is rejected", () => {
  assert.match(migration, /create table public\.match_result_audit/);
  assert.match(migration, /insert into public\.match_result_audit/);
  assert.match(migration, /changed_by_email citext not null/);
  assert.match(
    migration,
    /A match cannot start or complete before kickoff\./,
  );
  assert.match(
    migration,
    /Correcting a completed result requires a reason\./,
  );
});

test("migration preserves existing policy and RPC objects", () => {
  assert.doesNotMatch(migration, /drop policy/i);
  assert.doesNotMatch(migration, /drop function/i);
  assert.match(
    migration,
    /alter policy "Users can read allowed predictions"/,
  );
  assert.match(
    migration,
    /create or replace function public\.set_match_result\(\s*p_match_id text,\s*p_status text,\s*p_team1_score smallint default null,\s*p_team2_score smallint default null\s*\)/,
  );
});

test("database scenarios call result RPC with smallint scores", () => {
  assert.doesNotMatch(
    integrationTest,
    /set_match_result\([\s\S]*?\n\s+[0-9]+,\n\s+[0-9]+,/,
  );
  assert.match(integrationTest, /[0-9]+::smallint/);
});

test("duplicate signup names receive a deterministic unique fallback", () => {
  assert.match(
    migration,
    /create trigger prepare_auth_user_display_name\s+before insert on auth\.users/,
  );
  assert.match(
    migration,
    /left\(requested_name, 21\) \|\| ' ' \|\| left\(new\.id::text, 8\)/,
  );
  assert.match(
    migration,
    /jsonb_build_object\('display_name', requested_name\)/,
  );
});
