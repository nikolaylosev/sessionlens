"use strict";
/* What the segmentation prompts tell the model about a specification (0.1.125). The owner's request "rewrite the tests
   with this review in mind" came back as a spec under the old prompt in both of two runs (Opus, 11 Oct 2026), and
   "spec found" put the review's five headings in as requirements; with these words it came back as prose in both, and
   a ticket with R1–R3 and an out-of-scope item next to the review was still a spec. The model's answer cannot be
   tested here: this pins the words, in both prompts, so an edit does not drop them. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { M } = require("./helpers");

const LensSeg = require(M("segment.js"));

test("both prompts: a spec is what the product must do; a review of the tests or code is prose", () => {
  for (const [name, prompt] of Object.entries(LensSeg.DEFAULTS)) {
    assert.match(prompt, /"spec" \([^)]*what the product under test MUST do\)|what the PRODUCT\s+under test MUST do/, name);
    assert.match(prompt, /review[\s\S]{0,40}of the tests or code themselves/, name);
  }
  assert.match(LensSeg.SYSTEM, /even with "should", "must" or "Solution:" in it, is "prose", not "spec"/);
  assert.match(LensSeg.LOCAL_SYSTEM, /"prose" \(explanation, and a review of the tests or code themselves\)/);
});
