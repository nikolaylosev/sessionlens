"use strict";
/* The transcript the semantic review sends to the model (buildPrompt → compact, 0.1.126). Steps of one kind in a row are
   one line with the tools' names (a browser's, other tools, reads, searches); a command is one line of at most 200
   characters. A transcript longer than the room keeps its start and its end; one line says what the steps in between
   had, and the user's messages among them follow it. Until 0.1.126 the end was cut, so the model did not see the
   last test run in 15 of the owner's 20 long sessions with runs. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");

load();
const LensAI = require(M("ai.js"));

const transcript = (events, maxTranscript) =>
  LensAI.buildPrompt({ events, spec: "", findings: [] }, maxTranscript ? { maxTranscript } : {}).user.split("# Transcript (compressed)\n")[1];
const steps = (list) => list.map((e, i) => Object.assign({ seq: i }, e));

test("browser steps, other tools, reads and searches in a row are one line, with the tools' names", () => {
  const ev = steps([
    { kind: "user", text: "Write the search tests" },
    { kind: "tool", tool: "mcp__playwright__browser_navigate" },
    { kind: "tool", tool: "mcp__playwright__browser_snapshot" },
    { kind: "tool", tool: "mcp__playwright__browser_tabs" },
    { kind: "tool", tool: "mcp__playwright__browser_click" },
    { kind: "tool", tool: "mcp__playwright__browser_snapshot" },
    { kind: "tool", tool: "mcp__playwright__browser_type" },
    { kind: "tool", tool: "TodoWrite" },
    { kind: "read", file: "tests/pages/search.page.ts" },
    { kind: "read", file: "tests/fixtures.ts" },
    { kind: "read", file: "tests/pages/search.page.ts" },
    { kind: "tool", tool: "mcp__claude-in-chrome__computer" },
    { kind: "write", file: "tests/search.spec.ts" },
  ]);
  assert.equal(
    transcript(ev),
    [
      "0 USER: Write the search tests",
      "1–6 browser ×6: browser_navigate, browser_snapshot, browser_tabs, browser_click, …",
      "7 tool TodoWrite",
      "8–10 read ×3: tests/pages/search.page.ts, tests/fixtures.ts",
      "11 browser computer",
      "12 write tests/search.spec.ts",
    ].join("\n"),
  );
});

test("a command is one line of at most 200 characters", () => {
  const ev = steps([
    { kind: "run_other", cmd: "node - <<'EOF'\nconst { chromium } = require('playwright');\nEOF" },
    { kind: "run_other", cmd: "for u in " + "/about/ ".repeat(60) + "; do curl -s $u; done" },
  ]);
  const lines = transcript(ev).split("\n");
  assert.equal(lines[0], "0 run_other node - <<'EOF' const { chromium } = require('playwright'); EOF");
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith("…") && lines[1].length === "1 run_other ".length + 200, lines[1]);
});

test("a long transcript keeps its start and its end; one line says what the middle had, the user's messages follow it", () => {
  const ev = [{ seq: 0, kind: "user", text: "Write the cart tests for R1–R3" }];
  for (let i = 1; i < 300; i++)
    ev.push(
      i === 150
        ? { seq: i, kind: "user", text: "Why is there no test for R3?" }
        : i % 10 === 0
          ? { seq: i, kind: "run_tests", cmd: "npx playwright test", tests: { passed: i, failed: 1 } }
          : i % 2
            ? { seq: i, kind: "edit", file: `tests/cart-${i}.spec.ts` }
            : { seq: i, kind: "message", text: `Step ${i}: ` + "fixing the cart test. ".repeat(10) },
    );
  ev.push({ seq: 300, kind: "run_tests", cmd: "npx playwright test", tests: { passed: 12, failed: 0 } });
  ev.push({ seq: 301, kind: "message", text: "All 12 tests pass." });
  for (const max of [12000, 4000]) {
    const out = transcript(ev, max);
    const lines = out.split("\n");
    assert.ok(out.length <= max, `${max}: ${out.length}`);
    assert.equal(lines[0], "0 USER: Write the cart tests for R1–R3", "the task");
    assert.deepEqual(lines.slice(-2), ["300 run_tests npx playwright test → 12 passed, 0 failed", "301 AGENT: All 12 tests pass."], "the end");
    const gap = lines.findIndex((l) => l.startsWith("[… steps "));
    assert.ok(gap > 0, "one line for the middle");
    assert.match(
      lines[gap],
      /^\[… steps \d+–\d+ left out: \d+ edits, \d+ test runs \(the last: \d+ passed, 1 failed\), \d+ agent messages; the user's messages among them follow\]$/,
    );
    assert.equal(lines[gap + 1], "150 USER: Why is there no test for R3?", "the user's message from the middle");
    assert.equal(lines.filter((l) => l.startsWith("[… ")).length, 1);
    // the lines kept are whole and in order
    const seqs = lines.filter((l, i) => i !== gap).map((l) => +l.split(/[ –]/)[0]);
    assert.deepEqual(
      seqs,
      [...seqs].sort((a, b) => a - b),
    );
  }
});

test("a transcript that fits is not cut", () => {
  const ev = steps([
    { kind: "user", text: "Write the tests" },
    { kind: "write", file: "tests/a.spec.ts" },
    { kind: "run_tests", cmd: "npx playwright test", tests: { passed: 1, failed: 0 } },
  ]);
  assert.equal(transcript(ev), "0 USER: Write the tests\n1 write tests/a.spec.ts\n2 run_tests npx playwright test → 1 passed, 0 failed");
});
