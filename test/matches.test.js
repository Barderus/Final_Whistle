import test from "node:test";
import assert from "node:assert/strict";
import {
  isMatchLocked,
  isMatchUnlocked,
} from "../src/utils/matches.js";

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

test("unlocks Round of 32 bracket slot matches", () => {
  assert.equal(
    isMatchUnlocked({
      stage: "Round of 32",
      team1: "2A",
      team2: "3ABCDF",
    }),
    true,
  );
});

test("unlocks Round of 16 matches with confirmed teams", () => {
  assert.equal(
    isMatchUnlocked({
      stage: "Round of 16",
      team1: "Canada",
      team2: "Morocco",
    }),
    true,
  );
});

test("keeps later knockout placeholder matches locked", () => {
  assert.equal(
    isMatchUnlocked({
      stage: "Quarterfinals",
      team1: "W89",
      team2: "W90",
    }),
    false,
  );
});
