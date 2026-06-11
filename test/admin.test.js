import test from "node:test";
import assert from "node:assert/strict";
import {
  isCompetitionExcluded,
  saveMatchResult,
} from "../src/services/admin.js";

test("checks permanent competition eligibility by user ID", async () => {
  const calls = [];
  const client = {
    async rpc(name, parameters) {
      calls.push({ name, parameters });
      return { data: true, error: null };
    },
  };

  assert.equal(
    await isCompetitionExcluded("user-123", client),
    true,
  );
  assert.deepEqual(calls, [
    {
      name: "is_competition_excluded",
      parameters: { p_user_id: "user-123" },
    },
  ]);
});

test("stores a match result with an optional correction reason", async () => {
  const calls = [];
  const storedMatch = {
    id: "match-001",
    status: "complete",
    team1_score: 2,
    team2_score: 1,
  };
  const client = {
    rpc(name, parameters) {
      calls.push({ name, parameters });
      return {
        single: async () => ({ data: storedMatch, error: null }),
      };
    },
  };

  const result = await saveMatchResult(
    "match-001",
    "complete",
    "2",
    "1",
    "Corrected official score",
    client,
  );

  assert.deepEqual(calls, [
    {
      name: "set_match_result",
      parameters: {
        p_match_id: "match-001",
        p_status: "complete",
        p_team1_score: 2,
        p_team2_score: 1,
        p_change_reason: "Corrected official score",
      },
    },
  ]);
  assert.deepEqual(result, storedMatch);
});

test("sends blank scores and reasons as null", async () => {
  const calls = [];
  const client = {
    rpc(name, parameters) {
      calls.push({ name, parameters });
      return {
        single: async () => ({
          data: { id: "match-001", status: "scheduled" },
          error: null,
        }),
      };
    },
  };

  await saveMatchResult(
    "match-001",
    "scheduled",
    "",
    "",
    "   ",
    client,
  );

  assert.deepEqual(calls[0].parameters, {
    p_match_id: "match-001",
    p_status: "scheduled",
    p_team1_score: null,
    p_team2_score: null,
    p_change_reason: null,
  });
});
