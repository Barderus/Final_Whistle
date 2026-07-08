import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
const app = fs.readFileSync(appPath, "utf8");
const adminPanelPath = new URL(
  "../src/components/AdminResultsPanel.jsx",
  import.meta.url,
);
const adminPanel = fs.readFileSync(adminPanelPath, "utf8");
const matchCardPath = new URL("../src/components/MatchCard.jsx", import.meta.url);
const matchCard = fs.readFileSync(matchCardPath, "utf8");
const matchesCsvPath = new URL("../public/matches.csv", import.meta.url);
const matchesCsv = fs.readFileSync(matchesCsvPath, "utf8");
const seedSqlPath = new URL("../supabase/seed.sql", import.meta.url);
const seedSql = fs.readFileSync(seedSqlPath, "utf8");

test("Admin tab does not render the schedule", () => {
  assert.match(
    app,
    /"Friends' Guesses",\s*"Leaderboard",\s*"Admin"/,
  );
});

test("shared guesses and leaderboard refresh in the background", () => {
  assert.match(app, /DATA_REFRESH_INTERVAL_MS = 30000/);
  assert.match(app, /refreshSharedPredictions/);
  assert.match(app, /refreshLeaderboard/);
  assert.match(app, /visibilitychange/);
});

test("Round of 32 website data uses confirmed team names", () => {
  assert.match(
    matchesCsv,
    /match-073,73,Round of 32,[^\n]+,South Africa,Canada/,
  );
  assert.match(
    matchesCsv,
    /match-074,74,Round of 32,[^\n]+,Brazil,Japan/,
  );
  assert.doesNotMatch(matchesCsv, /Round of 32,[^\n]+,\d[A-L]+,/);
});

test("Round of 16 website data uses confirmed team names", () => {
  assert.match(
    matchesCsv,
    /match-089,89,Round of 16,[^\n]+,Paraguay,France/,
  );
  assert.match(
    matchesCsv,
    /match-090,90,Round of 16,[^\n]+,Canada,Morocco/,
  );
  assert.doesNotMatch(matchesCsv, /Round of 16,[^\n]+,[WL]\d+,/);
  assert.doesNotMatch(matchesCsv, /Round of 16,[^\n]+,[^,\n]+,[WL]\d+$/m);
});

test("Quarterfinals website data uses confirmed team names and venues", () => {
  assert.match(
    matchesCsv,
    /match-097,97,Quarterfinals,2026-07-09T20:00:00Z,"Boston Stadium, Boston",France,Morocco/,
  );
  assert.match(
    matchesCsv,
    /match-100,100,Quarterfinals,2026-07-12T01:00:00Z,"Kansas City Stadium, Kansas City",Argentina,Switzerland/,
  );
  assert.doesNotMatch(matchesCsv, /Quarterfinals,[^\n]+,[WL]\d+,/);
  assert.doesNotMatch(matchesCsv, /Quarterfinals,[^\n]+,[^,\n]+,[WL]\d+$/m);
});

test("database seed uses confirmed knockout team names", () => {
  assert.match(
    seedSql,
    /\('match-073', 73, 'Round of 32', [^\n]+, 'South Africa', 'Canada'\)/,
  );
  assert.match(
    seedSql,
    /\('match-089', 89, 'Round of 16', [^\n]+, 'Paraguay', 'France'\)/,
  );
  assert.match(
    seedSql,
    /\('match-097', 97, 'Quarterfinals', [^\n]+, 'France', 'Morocco'\)/,
  );
  assert.doesNotMatch(seedSql, /'Round of 16', [^\n]+, 'W\d+',/);
  assert.doesNotMatch(seedSql, /'Quarterfinals', [^\n]+, 'W\d+',/);
});

test("Knockout tab renders knockout matches through the unlocked match card flow", () => {
  assert.match(
    app,
    /activeTab === "Knockout"[\s\S]+?isKnockoutStage\(match\.stage\)/,
  );
  assert.match(matchCard, /const unlocked = isMatchUnlocked\(match\)/);
  assert.match(matchCard, /unlocked\s+\?\s+"Open"/);
});

test("admin tied knockout results can select an advancing team", () => {
  assert.match(adminPanel, /const needsWinner = isKnockoutStage\(match\.stage\) && completedTie/);
  assert.match(adminPanel, /<span>Advancing team<\/span>/);
  assert.match(adminPanel, /<option value=\{match\.team1\}>\{match\.team1\}<\/option>/);
  assert.match(adminPanel, /<option value=\{match\.team2\}>\{match\.team2\}<\/option>/);
});

test("completed match cards display the penalty winner when present", () => {
  assert.match(matchCard, /match\.winner_team \? `, \$\{match\.winner_team\} advanced` : ""/);
});
