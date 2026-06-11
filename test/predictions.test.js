import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePrediction,
  savePrediction,
} from "../src/services/predictions.js";

test("normalizes a stored prediction for application state", () => {
  assert.deepEqual(
    normalizePrediction({
      match_id: "match-001",
      team1_score: 2,
      team2_score: 1,
      updated_at: "2026-06-11T12:00:00Z",
    }),
    {
      matchId: "match-001",
      team1Score: "2",
      team2Score: "1",
      updatedAt: "2026-06-11T12:00:00Z",
    },
  );
});

test("stores numeric scores through save_prediction and returns saved data", async () => {
  const calls = [];
  const storedPrediction = {
    match_id: "match-001",
    team1_score: 2,
    team2_score: 1,
    updated_at: "2026-06-11T12:00:00Z",
  };
  const client = {
    rpc(name, parameters) {
      calls.push({ name, parameters });
      return {
        single: async () => ({ data: storedPrediction, error: null }),
      };
    },
  };

  const result = await savePrediction("match-001", "2", "1", client);

  assert.deepEqual(calls, [
    {
      name: "save_prediction",
      parameters: {
        p_match_id: "match-001",
        p_team1_score: 2,
        p_team2_score: 1,
      },
    },
  ]);
  assert.deepEqual(result, {
    matchId: "match-001",
    team1Score: "2",
    team2Score: "1",
    updatedAt: "2026-06-11T12:00:00Z",
  });
});

test("preserves storage failures from Supabase", async () => {
  const expectedError = new Error("Prediction is locked.");
  const client = {
    rpc() {
      return {
        single: async () => ({ data: null, error: expectedError }),
      };
    },
  };

  await assert.rejects(
    savePrediction("match-001", "2", "1", client),
    expectedError,
  );
});
