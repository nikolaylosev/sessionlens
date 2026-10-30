"use strict";
/* The tests a Playwright run failed (0.1.132): the list reporter's line of each, "✘  1 [chromium] › file:line:col ›
   title (5.6s)", and the heading of its error, "1) [chromium] › file:line:col › title ─────". Until then only the
   heading matched, with its rule of ─ in the name, and the reporter's line with its index after ✘ did not. Now both,
   without the rule and the time, each name once. The output is the real one of a Cursor agent's run in the CI lab. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const RUN = [
  "",
  "Running 4 tests using 2 workers",
  "",
  "  ✘  1 [chromium] › tests/filters.spec.ts:11:5 › completing a todo updates the counter (5.6s)",
  "  ✘  2 [chromium] › tests/filters.spec.ts:16:5 › the Completed filter shows only completed todos (5.6s)",
  "  ✓  3 [chromium] › tests/filters.spec.ts:22:5 › Clear completed removes the completed todos (591ms)",
  "  ✓  4 [chromium] › tests/seed.spec.ts:4:5 › the app opens with an empty list (244ms)",
  "",
  "",
  "  1) [chromium] › tests/filters.spec.ts:11:5 › completing a todo updates the counter ───────────────",
  "",
  "    Error: expect(locator).toHaveText(expected) failed",
  "",
  "  2) [chromium] › tests/filters.spec.ts:16:5 › the Completed filter shows only completed todos ─────",
  "",
  "    Error: expect(locator).toHaveCount(expected) failed",
  "",
  "  2 failed",
  "    [chromium] › tests/filters.spec.ts:11:5 › completing a todo updates the counter ────────────────",
  "    [chromium] › tests/filters.spec.ts:16:5 › the Completed filter shows only completed todos ──────",
  "  2 passed (7.6s)",
].join("\n");
const NAMES = [
  "tests/filters.spec.ts:11:5 › completing a todo updates the counter",
  "tests/filters.spec.ts:16:5 › the Completed filter shows only completed todos",
];

test("the failed tests of a run, from the reporter's lines and the error headings, without the rule and the time, once each", () => {
  assert.deepEqual(Lens.parseTests(RUN, cfg), { passed: 2, failed: 2, errors: 0, failed_names: NAMES });
});

test("only the reporter's lines (the output cut before the errors), or only the headings: the same names", () => {
  const lines = RUN.split("\n");
  assert.deepEqual(Lens.parseTests(lines.slice(0, 7).concat(["  2 failed", "  2 passed (7.6s)"]).join("\n"), cfg).failed_names, NAMES);
  assert.deepEqual(Lens.parseTests(lines.slice(8).join("\n"), cfg).failed_names, NAMES);
  // a title of its own that ends in one ─ keeps it (a rule is two or more); a passed test is no failed one
  const own = "  ✘  1 [chromium] › a.spec.ts:1:1 › from A to B ─ (12ms)\n  ✓  2 [chromium] › a.spec.ts:5:1 › ok (3ms)\n  1 failed\n  1 passed";
  assert.deepEqual(Lens.parseTests(own, cfg).failed_names, ["a.spec.ts:1:1 › from A to B ─"]);
});
