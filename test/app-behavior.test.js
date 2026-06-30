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

test("admin tied knockout results can select an advancing team", () => {
  assert.match(adminPanel, /const needsWinner = isKnockoutStage\(match\.stage\) && completedTie/);
  assert.match(adminPanel, /<span>Advancing team<\/span>/);
  assert.match(adminPanel, /<option value=\{match\.team1\}>\{match\.team1\}<\/option>/);
  assert.match(adminPanel, /<option value=\{match\.team2\}>\{match\.team2\}<\/option>/);
});

test("completed match cards display the penalty winner when present", () => {
  assert.match(matchCard, /match\.winner_team \? `, \$\{match\.winner_team\} advanced` : ""/);
});
