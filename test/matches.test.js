import test from "node:test";
import assert from "node:assert/strict";
import { isMatchLocked } from "../src/utils/matches.js";

const mexicoSouthAfricaKickoff = "2026-06-11T19:00:00Z";

test("keeps predictions open immediately before kickoff", () => {
  const oneMillisecondBeforeKickoff = Date.parse(
    mexicoSouthAfricaKickoff,
  ) - 1;

  assert.equal(
    isMatchLocked(
      mexicoSouthAfricaKickoff,
      oneMillisecondBeforeKickoff,
    ),
    false,
  );
});

test("locks predictions exactly at kickoff", () => {
  assert.equal(
    isMatchLocked(
      mexicoSouthAfricaKickoff,
      Date.parse(mexicoSouthAfricaKickoff),
    ),
    true,
  );
});

test("keeps predictions locked after kickoff", () => {
  const oneMillisecondAfterKickoff = Date.parse(
    mexicoSouthAfricaKickoff,
  ) + 1;

  assert.equal(
    isMatchLocked(
      mexicoSouthAfricaKickoff,
      oneMillisecondAfterKickoff,
    ),
    true,
  );
});
