"use strict";
/* What the CLI prints for one analyzed session (phase 11, step 3): cli/lib/report.js (terminal text, Markdown for a CI
   job's summary, JSON) and media/report.js, the Report .json the panel exports too. --ci sets context checks aside:
   listed on their own, not counted in the verdict. */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { load, M, root } = require("./helpers");

const { Lens } = load();
const LensReport = require(M("report.js"));
const report = require(path.join(root, "cli", "lib", "report.js"));

const F = (check, severity, message, extra = {}) => ({ check, severity, seq: 3, message, source: "formal", ...extra });
const session = (extra = {}) => ({
  name: "agent.jsonl",
  task: "TODO-12",
  profile: "qa-ts",
  verdicts: {},
  metrics: { reads: 4, edits: 2, readEdit: 2, runs: 1, editsToGreen: 2 },
  specParsed: { n: 0, oos: 0, hasIds: false },
  findings: [
    F("weak_assert", "low", "tests/a.spec.ts:4 — expect(<div>).toBeTruthy()"),
    F("test_deleted", "high", "A failing test was deleted"),
    F("no_spec", "high", "No specification", { source: "spec" }),
    F("stop_markers_missing", "medium", "Code written without a plan"),
  ],
  calibHidden: [],
  suppressed: [],
  lintNote: "ESLint: 1 finding in 1 block",
  ...extra,
});
const CI = new Set(["no_spec", "stop_markers_missing"]);
const OPTS = { version: "0.1.132", file: "out/agent.jsonl" };

test("the Report .json: the panel's schema; --ci moves context findings to a list of their own, out of the verdict", () => {
  const s = session();
  const r = LensReport.json(s);
  assert.equal(r.schema, "sessionlens/finding@1");
  assert.equal(r.verdict, "red");
  assert.deepEqual(
    r.findings.map((f) => f.check),
    ["weak_assert", "test_deleted", "no_spec", "stop_markers_missing"],
  );
  assert.equal(r.context, undefined, "no context without --ci");
  const ci = LensReport.json(s, { context: CI });
  assert.deepEqual(
    ci.findings.map((f) => f.check),
    ["weak_assert", "test_deleted"],
  );
  assert.deepEqual(
    ci.context.map((f) => f.check),
    ["no_spec", "stop_markers_missing"],
  );
  // only the context was red or yellow: the session is green
  const clean = session({ findings: s.findings.filter((f) => f.check !== "test_deleted") });
  assert.equal(LensReport.json(clean).verdict, "red");
  assert.equal(LensReport.json(clean, { context: CI }).verdict, "green");
  // the CLI's file says which version made it
  assert.equal(JSON.parse(report.json(s, { ...OPTS, context: CI })).sessionlens, "0.1.132");
  assert.deepEqual(JSON.parse(report.json(s, OPTS)).findings, r.findings);
});

test("the Report .json keeps verdicts, the model that found a finding and why calibration hid one", () => {
  const ai = F("ai_fragility", "medium", "flaky wait", { source: "ai", model: "m1", verifier: "m2" });
  const hidden = F("magic_number", "low", "42 in a test");
  const s = session({ findings: [ai], calibHidden: [hidden], suppressed: [{ check: "magic_number", source: "formal", precision: 0.2, n: 10 }] });
  s.verdicts[Lens.fkey(ai)] = { v: "ok", note: "real", at: 1 };
  const r = LensReport.json(s);
  assert.deepEqual(r.findings[0], {
    check: "ai_fragility",
    severity: "medium",
    seq: 3,
    message: "flaky wait",
    evidence: null,
    source: "ai",
    model: "m1",
    verifier: "m2",
    verdict: { v: "ok", note: "real", at: 1 },
  });
  assert.deepEqual(r.hiddenByCalibration, [
    { check: "magic_number", severity: "low", seq: 3, message: "42 in a test", source: "formal", precision: 0.2, verdicts: 10, verdict: null },
  ]);
});

test("the terminal text: the verdict, the counts, the findings by severity, the context; colours only when asked", () => {
  const out = report.text(session(), { ...OPTS, context: CI });
  const lines = out.split("\n");
  assert.equal(lines[0], "SessionLens 0.1.132 · qa-ts · out/agent.jsonl");
  assert.equal(lines[1], "Verdict: Red · profile qa-ts · reads 4, edits 2, Read:Edit 2, runs 1, edits to green 2");
  assert.equal(lines[2], "1 high, 0 medium, 1 low");
  assert.ok(lines.includes("Lint: ESLint: 1 finding in 1 block"));
  const found = lines.filter((l) => /^(high|medium|low) /.test(l));
  assert.deepEqual(found, [
    "high    test_deleted  #3    A failing test was deleted",
    "low     weak_assert   #3    tests/a.spec.ts:4 — expect(<div>).toBeTruthy()",
  ]);
  assert.ok(lines.includes("Context, not counted in CI: no_spec, stop_markers_missing"));
  assert.doesNotMatch(out, /\x1b\[/);
  const coloured = report.text(session(), { ...OPTS, context: CI, color: true });
  assert.match(coloured, /\x1b\[31mVerdict: Red/);
  assert.match(report.text(session({ findings: [] }), OPTS), /No findings\./);
  // the session's tokens, when its log had them, as the panel shows them
  const usage = { input: 12345, cached: 10000, output: 2100, requests: 5 };
  assert.ok(report.text(session({ usage }), OPTS).split("\n").includes("Tokens: 12k in (81% from the cache), 2k out, 5 requests to the model."));
});

test("the Markdown for a job summary: headline lines, findings by severity, context and hidden findings, no raw HTML", () => {
  const hidden = F("magic_number", "low", "42 in a test");
  const out = report.md(session({ calibHidden: [hidden] }), { ...OPTS, context: CI });
  const lines = out.split("\n");
  assert.equal(lines[0], "## Session review: TODO-12");
  assert.ok(lines.includes("**Specification:** not provided"));
  const at = lines.indexOf("### Findings: 1 high, 0 medium, 1 low");
  assert.deepEqual(lines.slice(at + 1, at + 3), [
    "- 🔴 **high** A failing test was deleted _(seq 3)_ · `test_deleted`",
    "- ⚪ **low** tests/a.spec.ts:4 — expect(&lt;div>).toBeTruthy() _(seq 3)_ · `weak_assert`",
  ]);
  const ctx = lines.indexOf("### Context, not counted in CI");
  assert.deepEqual(lines.slice(ctx + 1, ctx + 3), [
    "- 🔴 **high** No specification _(seq 3)_ · `no_spec`",
    "- 🟡 **medium** Code written without a plan _(seq 3)_ · `stop_markers_missing`",
  ]);
  assert.ok(lines.includes("### Hidden by calibration (low precision)"));
  assert.ok(lines.includes("- ⚪ **low** 42 in a test _(seq 3)_ · `magic_number`"));
  assert.equal(lines.at(-2), "_SessionLens 0.1.132_");
  assert.match(report.md(session({ findings: [] }), OPTS), /### Findings: 0 high, 0 medium, 0 low\nNone\./);
  // without a task the file names the review
  assert.match(report.md(session({ task: "" }), OPTS), /^## Session review: agent\.jsonl/);
});
