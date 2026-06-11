import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
const app = fs.readFileSync(appPath, "utf8");

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
