import type { SubmitResult } from "../src/leaderboard/api";
import { describeSubmitResult } from "../src/leaderboard/submitResultText";
import assert from "./assert";

const base = { ok: true as const, runScore: 514, campaignScore: 1540, ruleset: "phase4-v1", rating: "Ghostline Architect", handle: "Tester" };
const improved: SubmitResult = { ...base, improved: true, bestScore: 514, globalRank: 2, sectorRank: 3 };
const stood: SubmitResult = { ...base, improved: false, runScore: 300, bestScore: 514, globalRank: 2, sectorRank: 3 };

// Full placement: the copy players already know, with the campaign rank labelled as such.
assert.deepEqual(describeSubmitResult(improved, "panel"), { text: "New best 514! Campaign #2 · Sector #3.", kind: "success", settled: true });
assert.deepEqual(describeSubmitResult(stood, "panel"), { text: "This run: 300. Your best 514 stands — Campaign #2 · Sector #3.", kind: "success", settled: true });
assert.equal(describeSubmitResult(improved, "notice").text, "Run logged — new best 514! Campaign #2 · Sector #3.");
assert.equal(describeSubmitResult(stood, "notice").text, "Run logged. Your best 514 stands — Campaign #2 · Sector #3.");

// Missing read-back never prints "null".
const blind: SubmitResult = { ...base, improved: true, bestScore: null, globalRank: null, sectorRank: null };
assert.equal(describeSubmitResult(blind, "panel").text, "New best 514!");
assert.equal(describeSubmitResult(blind, "notice").text, "Run logged — new best 514!");
const blindStood: SubmitResult = { ...base, improved: false, runScore: 300, bestScore: null, globalRank: 4, sectorRank: null };
assert.equal(describeSubmitResult(blindStood, "panel").text, "This run: 300. Your best stands — Campaign #4.");
for (const result of [blind, blindStood]) {
  for (const where of ["panel", "notice"] as const) assert.equal(describeSubmitResult(result, where).text.includes("null"), false);
}

// Not recorded (lost / retired rules): information, settled — no retry offered.
const notCleared: SubmitResult = { ok: false, recorded: false, reason: "not-cleared", error: "Not recorded — sector not cleared. Only cleared sectors count on the leaderboard." };
assert.deepEqual(describeSubmitResult(notCleared, "panel"), { text: notCleared.error, kind: "info", settled: true });
assert.equal(describeSubmitResult(notCleared, "notice").text, notCleared.error);

// Real failures stay errors and leave SUBMIT retryable.
const failed: SubmitResult = { ok: false, error: "Could not save score." };
assert.deepEqual(describeSubmitResult(failed, "panel"), { text: "Could not save score.", kind: "error", settled: false });
assert.equal(describeSubmitResult(failed, "notice").text, "Couldn't log your last run: Could not save score.");
console.log("Submit result text: campaign/sector placement copy, null-safe read-back, not-recorded info and retryable errors passed.");
