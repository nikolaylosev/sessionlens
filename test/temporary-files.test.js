"use strict";
/* A temporary test file (0.1.140): the agent created it, ran it green and deleted it while doing one request, and did
   not write it again. It is the agent's own check, not part of what the session leaves, so what the checks found in it
   is left out: in the owner's session three such files (each with "TEMPORARY file … delete after the run", one of them
   asked for by the task) got eight findings, three of them high. A fix of it right after a failure stays, low, with
   the deletion named. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");

const { Lens } = load();
const LensAnalyze = require(M("analyze.js"));
const cfg = Lens.profile("qa-ts");

const REAL = "tests/cart.spec.ts";
const TMP = "tests/tmp-probe.spec.ts";
const REAL_CODE = "test('total', async ({ page }) => {\n  await page.goto('/cart');\n  await expect(page.getByText('Total')).toBeVisible();\n});\n";
// a branch, an unexplained number and a token: conditional_logic, magic_number, hardcoded_secret
const PROBE = (n) =>
  "const token = 'sk-live0123456789abcdefghij';\n" +
  "test('probe', async ({ page }) => {\n  await page.goto('/cart');\n  if (await page.isVisible('#tour')) await page.click('#tour .close');\n" +
  `  expect(await page.title()).toHaveLength(${n});\n});\n`;
const green = { passed: 1, failed: 0, errors: 0, failed_names: [] };
const red = { passed: 0, failed: 1, errors: 0, failed_names: [`${TMP}:2:5 › probe`] };

// the plan names only the real test; the probe is written, fails, is fixed, runs green and is deleted
function session({ rm = `rm ${TMP}`, before = green, asked = false, again = false, existed = false } = {}) {
  const ev = [
    { kind: "user", text: "Write the cart tests" },
    { kind: "message", text: `PLAN: write ${REAL}. Waiting for approval.` },
    { kind: "user", text: "yes" },
    { kind: "write", file: REAL, new_content: REAL_CODE },
    { kind: "run_tests", cmd: `npx playwright test ${REAL}`, tests: green },
    { kind: "write", file: TMP, new_content: PROBE(4242), ...(existed ? { prev_content: PROBE(1) } : {}) },
    { kind: "run_tests", cmd: `npx playwright test ${TMP}`, tests: red },
    { kind: "edit", file: TMP, new_content: PROBE(4343) },
    { kind: "run_tests", cmd: `npx playwright test ${TMP}`, tests: before },
    ...(asked ? [{ kind: "user", text: "and the totals?" }] : []),
    { kind: "run_other", cmd: rm },
    ...(again ? [{ kind: "write", file: TMP, new_content: PROBE(4444) }] : []),
    { kind: "message", text: "Done." },
  ];
  return { profile: "qa-ts", events: ev.map((e, seq) => ({ seq, ts: "", ...e })), verdicts: {} };
}
const found = (s) => LensAnalyze.analyze(s, { settings: { lint: false } }).findings.filter((f) => f.check !== "no_spec");
const onProbe = (s) =>
  found(s)
    .filter((f) => (s.events.find((e) => e.seq === f.seq) || {}).file === TMP)
    .map((f) => `${f.check} ${f.severity}`)
    .sort();
const KEPT = [
  "conditional_logic low",
  "fix_after_fail_without_triage high",
  "hardcoded_secret high",
  "magic_number low",
  "magic_number low",
  "scope_creep medium", // one per file: the same text twice is one finding
];

test("a test file made, run green and deleted for one request: only the fix after a failure (low) and the secret stay", () => {
  const s = session();
  assert.deepEqual([...Lens.temporaryFiles(s.events, cfg)], [[TMP, 9]]);
  assert.deepEqual(onProbe(s), ["fix_after_fail_without_triage low", "hardcoded_secret high"]);
  const fix = found(s).find((f) => f.check === "fix_after_fail_without_triage");
  assert.match(fix.message, /right after a failure \(seq 6\).* — a temporary file the agent deleted \(seq 9\)$/);
  // the real test is untouched
  assert.ok(!found(s).some((f) => f.check === "scope_creep" && f.message.includes(REAL)));
});

test("a run in the same command before the rm counts, and a glob deletes it too", () => {
  for (const rm of [`npx playwright test ${TMP}; rm ${TMP}`, "rm -f tests/tmp-*.spec.ts"]) {
    const s = session({ rm, before: { passed: 0, failed: 1, errors: 0, failed_names: [] } });
    s.events[9].kind = rm.startsWith("npx") ? "run_tests" : "run_other";
    if (s.events[9].kind === "run_tests") s.events[9].tests = green;
    else s.events[8].tests = green;
    assert.deepEqual([...Lens.temporaryFiles(s.events, cfg).keys()], [TMP], rm);
  }
});

test("not a temporary file: deleted after a red run, for a later request, written again, or there before the session", () => {
  for (const [why, opts] of [
    ["red run", { before: red }],
    ["a message of the person between", { asked: true }],
    ["written again", { again: true }],
    ["there before", { existed: true }],
  ]) {
    const s = session(opts);
    assert.equal(Lens.temporaryFiles(s.events, cfg).size, 0, why);
    const kept = onProbe(s);
    for (const f of ["conditional_logic low", "hardcoded_secret high", "scope_creep medium"]) assert.ok(kept.includes(f), `${why}: ${f}`);
  }
  assert.deepEqual(onProbe(session({ asked: true })), KEPT);
});

test("a session with no temporary file keeps every finding as it was", () => {
  const s = session({ rm: "ls tests" });
  const f = found(s);
  assert.equal(Lens.temporaryFindings(f, s.events, cfg), f);
});
