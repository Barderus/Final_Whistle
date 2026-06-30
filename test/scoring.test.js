import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePredictionPoints,
  tallyLeaderboardPredictions,
} from "../src/utils/scoring.js";

test("awards three points for an exact score", () => {
  assert.equal(calculatePredictionPoints(2, 1, 2, 1), 3);
  assert.equal(calculatePredictionPoints(0, 0, 0, 0), 3);
});

test("awards one point for the correct winner with a different score", () => {
  assert.equal(calculatePredictionPoints(3, 0, 2, 1), 1);
  assert.equal(calculatePredictionPoints(0, 2, 1, 4), 1);
});

test("uses the selected knockout winner when the official score is tied", () => {
  assert.equal(calculatePredictionPoints(1, 1, 1, 1, "complete", -1), 3);
  assert.equal(calculatePredictionPoints(0, 2, 1, 1, "complete", -1), 1);
  assert.equal(calculatePredictionPoints(2, 2, 1, 1, "complete", -1), 0);
  assert.equal(calculatePredictionPoints(2, 0, 1, 1, "complete", -1), 0);
});

test("supports either team as the selected knockout winner", () => {
  assert.equal(calculatePredictionPoints(2, 0, 1, 1, "complete", 1), 1);
  assert.equal(calculatePredictionPoints(0, 2, 1, 1, "complete", 1), 0);
});

test("awards one point for a correct draw with a different score", () => {
  assert.equal(calculatePredictionPoints(1, 1, 2, 2), 1);
});

test("awards zero points for an incorrect outcome", () => {
  assert.equal(calculatePredictionPoints(2, 0, 0, 1), 0);
  assert.equal(calculatePredictionPoints(1, 1, 2, 1), 0);
});

test("awards zero points until the match is complete", () => {
  assert.equal(calculatePredictionPoints(2, 1, 2, 1, "scheduled"), 0);
  assert.equal(calculatePredictionPoints(2, 1, 2, 1, "in_progress"), 0);
});

test("tallies completed predictions for the leaderboard", () => {
  const totals = tallyLeaderboardPredictions([
    {
      predictedTeam1Score: 2,
      predictedTeam2Score: 1,
      actualTeam1Score: 2,
      actualTeam2Score: 1,
      status: "complete",
    },
    {
      predictedTeam1Score: 3,
      predictedTeam2Score: 0,
      actualTeam1Score: 2,
      actualTeam2Score: 1,
      status: "complete",
    },
    {
      predictedTeam1Score: 1,
      predictedTeam2Score: 1,
      actualTeam1Score: 0,
      actualTeam2Score: 2,
      status: "complete",
    },
    {
      predictedTeam1Score: 0,
      predictedTeam2Score: 2,
      actualTeam1Score: 1,
      actualTeam2Score: 1,
      actualWinnerSide: -1,
      status: "complete",
    },
    {
      predictedTeam1Score: 1,
      predictedTeam2Score: 0,
      actualTeam1Score: 1,
      actualTeam2Score: 0,
      status: "in_progress",
    },
  ]);

  assert.deepEqual(totals, {
    scoredPredictions: 4,
    exactScores: 1,
    points: 5,
  });
});
