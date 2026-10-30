"use strict";
/* media/analyze.js: the one analysis of a session, shared by the panel and the CLI (phase 11). What the panel keeps in
   its state comes in as options: the settings (lint on or off), the verdict counts that calibrate each check, and the
   Rules tab's overrides. The panel's own behaviour is pinned by the render snapshots and host-panel tests. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");

load();
const LensAnalyze = require(M("analyze.js"));

const SPEC_TS =
  'import { test, expect } from "@playwright/test";\ntest("a", async ({ page }) => {\n  await page.waitForTimeout(3000);\n  expect(true).toBeTruthy();\n});\n';
const session = (extra = {}) => ({
  profile: "qa-ts",
  events: [{ seq: 1, kind: "write", file: "tests/a.spec.ts", new_content: SPEC_TS }],
  verdicts: {},
  ...extra,
});
const checks = (s) => s.findings.map((f) => `${f.check}:${f.severity}`).sort();

test("the checks, the specification check and what the session gets besides its findings", () => {
  const s = LensAnalyze.analyze(session(), { settings: { lint: false } });
  assert.deepEqual(checks(s), ["no_spec:high", "sleep_or_skip_added:high", "stop_markers_missing:medium", "tests_never_run:high", "weak_assert:high"]);
  assert.deepEqual(s.specParsed, { n: 0, oos: 0, hasIds: false });
  assert.equal(s.metrics.edits, 1);
  assert.deepEqual(s.suppressed, []);
  assert.deepEqual(s.calibHidden, []);
  // the model's findings of an earlier review stay; the formal ones are computed again
  const ai = { check: "ai_fragility", severity: "medium", seq: 1, message: "flaky wait", source: "ai" };
  const again = LensAnalyze.analyze(session({ findings: [ai, { check: "old_check", severity: "high", seq: 1, message: "x" }] }), { settings: { lint: false } });
  assert.ok(again.findings.includes(ai));
  assert.ok(!again.findings.some((f) => f.check === "old_check"));
});

test("the Rules tab's overrides and the verdicts' calibration come in as options", () => {
  const overrides = { weak_assert: { severity: "low" }, sleep_or_skip_added: { enabled: false } };
  const s = LensAnalyze.analyze(session(), { settings: { lint: false }, overrides });
  assert.ok(checks(s).includes("weak_assert:low"));
  assert.ok(!checks(s).some((c) => c.startsWith("sleep_or_skip_added")));
  // 1 of 10 verdicts confirmed: the check is off, its finding is counted for calibration and never shown
  const off = LensAnalyze.analyze(session(), { settings: { lint: false }, calibStats: { weak_assert: { formal: { ok: 1, fp: 9 } } } });
  assert.ok(!checks(off).some((c) => c.startsWith("weak_assert")));
  assert.deepEqual(
    off.calibHidden.map((f) => f.check),
    ["weak_assert"],
  );
});

test("lint off runs no engine; lint on asks the engine of the profile's language", () => {
  const offS = LensAnalyze.analyze(session(), { settings: { lint: false } });
  assert.equal(offS.lintNote, "");
  assert.equal(offS.lintWhy, undefined);
  // in Node the ESLint bundle is not loaded by this module (the CLI's engine loader is a later step): the note says so
  const onS = LensAnalyze.analyze(session(), {});
  assert.notEqual(onS.lintNote, "");
});
