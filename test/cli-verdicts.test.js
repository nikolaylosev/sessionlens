"use strict";
/* --verdicts (phase 11): the team's verdicts, exported from the Calibration tab and kept in its repository, calibrate
   the checks in the CLI with the panel's own counts and thresholds. A file or a folder of files, one per reviewer; the
   same finding in two files counts once; a file that holds no verdicts is exit 2. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load, root } = require("./helpers");

const { Lens } = load();
const { run } = require(path.join(root, "cli", "lib", "cli.js"));
const { readVerdicts, levels } = require(path.join(root, "cli", "lib", "verdicts.js"));

const J = JSON.stringify;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-verdicts-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
const file = (name, content) => {
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), typeof content === "string" ? content : J(content));
  return name;
};
// n rows of one check and source, `ok` of them confirmed, each its own finding
const rows = (check, source, n, ok, session = "s") =>
  Array.from({ length: n }, (_, i) => ({ session, check, source, seq: i + 1, message: `${check} finding ${i}`, verdict: i < ok ? "ok" : "fp" }));

test("a file and a folder of files: verdicts counted per check and source; what is no verdict does not count", () => {
  file("one.json", [
    ...rows("weak_assert", "formal", 3, 1),
    { session: "s", check: "weak_assert", source: "lint", seq: 9, message: "from ESLint", verdict: "fp" },
    { session: "s", check: "weak_assert", source: "formal", seq: 9, message: "skipped", verdict: "skip" },
    { session: "s", check: "weak_assert", source: "formal", seq: 9, message: "no verdict" },
    { session: "s", check: "magic_number", seq: 1, message: "no source", verdict: "ok" },
    { check: "no_message", verdict: "ok" },
    null,
  ]);
  const r = readVerdicts(["one.json"], dir);
  assert.deepEqual(r.stats, {
    weak_assert: { formal: { total: 3, ok: 1, fp: 2 }, lint: { total: 1, ok: 0, fp: 1 } },
    magic_number: { external: { total: 1, ok: 1, fp: 0 } },
  });
  assert.equal(r.verdicts, 5);
  assert.equal(r.files, 1);
  // a folder: its .json files, nothing else; a Report .json with its verdicts as the panel writes them
  file("team/nick.json", rows("weak_assert", "formal", 2, 2, "nick's"));
  file("team/report.json", {
    session: "ann's",
    findings: [
      { check: "weak_assert", source: "formal", seq: 1, message: "m", verdict: { v: "fp", note: "" } },
      { check: "weak_assert", source: "formal", seq: 2, message: "n", verdict: null },
    ],
  });
  file("team/notes.txt", "not a verdict");
  const t = readVerdicts(["team"], dir);
  assert.deepEqual(t.stats, { weak_assert: { formal: { total: 3, ok: 2, fp: 1 } } });
  assert.equal(t.files, 2);
  // several paths add up
  assert.equal(readVerdicts(["one.json", "team"], dir).verdicts, 8);
  // a folder with nothing yet: no verdicts, no error
  fs.mkdirSync(path.join(dir, "empty"));
  assert.deepEqual(readVerdicts(["empty"], dir), { stats: {}, verdicts: 0, files: 0 });
});

test("the same finding in two files counts once, the first verdict wins; the same text at another step is another finding", () => {
  const a = { session: "s", check: "weak_assert", source: "formal", seq: 3, message: "e2e/a.spec.ts: weak", verdict: "ok" };
  file("dup/a.json", [a]);
  file("dup/b.json", [
    { ...a, verdict: "fp" },
    { ...a, seq: 7, verdict: "fp" },
    { ...a, session: "other", verdict: "fp" },
  ]);
  assert.deepEqual(readVerdicts(["dup"], dir).stats.weak_assert.formal, { total: 3, ok: 1, fp: 2 });
});

test("the same counts as the panel: what Export verdicts.json writes for a session and what its summary counts", () => {
  const cfg = Lens.profile("qa-ts");
  const code = (t) =>
    `import { test, expect } from '@playwright/test';\ntest('a', async ({ page }) => {\n  await page.waitForTimeout(${t});\n  expect(true).toBeTruthy();\n});\n`;
  const events = [
    { seq: 1, kind: "write", file: "e2e/a.spec.ts", new_content: code(1000) },
    { seq: 2, kind: "write", file: "e2e/b.spec.ts", new_content: code(2000) },
  ];
  const findings = Lens.runChecks(events, cfg);
  const verdicts = {};
  findings.forEach((f, i) => (verdicts[Lens.fkey(f)] = { v: i % 2 ? "ok" : "fp", note: "", at: "2026-11-01" }));
  const s = { id: "x", name: "x", task: "", profile: "qa-ts", created: "2026-11-01", events, findings, calibHidden: [], verdicts, spec: "" };
  const exported = findings.map((f) => ({
    session: s.name,
    check: f.check,
    source: f.source,
    seq: f.seq,
    message: f.message,
    verdict: verdicts[Lens.fkey(f)].v,
  }));
  const { stats } = readVerdicts([file("parity.json", exported)], dir);
  const counts = (st) =>
    Object.fromEntries(Object.entries(st).map(([c, per]) => [c, Object.fromEntries(Object.entries(per).map(([src, x]) => [src, [x.ok, x.fp]]))]));
  assert.ok(findings.length >= 4);
  assert.deepEqual(counts(stats), counts(Lens.sessionSummary(s).sourceStats));
});

test("what cannot be read: exit 2 with the reason, nothing on stdout", async () => {
  file("log.jsonl", J({ type: "user", message: { role: "user", content: "hi" } }));
  const cases = {
    "cannot read nope.json: no such file or folder": ["nope.json"],
    "cannot read bad.json: it is not JSON": [file("bad.json", "{ nope")],
    "object.json is not a verdicts.json: it holds no list of verdicts": [file("object.json", { rules: [] })],
    [`${path.join("broken", "a.json")}: it is not JSON`]: [(file("broken/a.json", "["), "broken")],
  };
  for (const [msg, paths] of Object.entries(cases)) {
    let out = "",
      err = "";
    const code = await run(["analyze", "log.jsonl", "--profile", "qa-ts", ...paths.flatMap((p) => ["--verdicts", p])], {
      stdout: { write: (t) => (out += t) },
      stderr: { write: (t) => (err += t) },
      env: {},
      isTTY: false,
      cwd: dir,
    });
    assert.equal(code, 2, msg);
    assert.equal(out, "", msg);
    assert.ok(err.includes(msg), `${msg}: ${err}`);
  }
});

test("levels: the thresholds of the panel; only what calibration may touch; a check ticked on by hand is not off", () => {
  const st = (ok, fp) => ({ total: ok + fp, ok, fp });
  assert.deepEqual(
    levels(
      {
        weak_assert: { formal: st(1, 9) }, // 10%: off
        magic_number: { formal: st(4, 6) }, // 40%: demoted
        raw_locator: { formal: st(5, 5) }, // 50%: ok
        fragile_wait: { formal: st(0, 9) }, // 9 verdicts: too few
        no_spec: { spec: st(0, 10) }, // a fact: never calibrated
        ai_fragility: { ai: st(0, 10) }, // the model's: never calibrated
        sleep_or_skip_added: { formal: st(9, 1), lint: st(1, 9) }, // the name says which source
        focused_test: { formal: st(0, 10) }, // ticked on on the Rules tab
      },
      Lens,
      { focused_test: { enabled: true } },
    ),
    { off: ["sleep_or_skip_added (lint)", "weak_assert"], demoted: ["magic_number"] },
  );
});

// a session with a sleep in its test, as ESLint reports it, and no other finding but the two context ones
const SLEEPY =
  "import { test, expect } from '@playwright/test';\ntest('adds', async ({ page }) => {\n  await page.goto('/');\n  await page.waitForTimeout(2000);\n  await expect(page.getByTestId('todo-title')).toHaveText(['Milk']);\n});\n";
const INJECTED =
  "import { test, expect } from '@playwright/test';\ntest.beforeEach(async ({ page }) => {\n  await page.addInitScript(() => {\n    const button = document.createElement('button');\n    document.body.appendChild(button);\n  });\n  await page.goto('/');\n});\ntest('undo', async ({ page }) => {\n  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();\n});\n";
const EMPTY_RESULT =
  "import { test, expect } from '@playwright/test';\ntest('no items', async ({ request }) => {\n  const r = await request.get('/api/items');\n  expect(await r.json()).toHaveLength(0);\n});\n";
const tool = (id, name, input, result) => [
  J({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }),
  J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: result }] } }),
];
const session = (code) =>
  [
    J({ type: "user", message: { role: "user", content: "Write a test" } }),
    ...tool("t1", "Write", { file_path: "tests/a.spec.ts", content: code }, "ok"),
    ...tool("t2", "Bash", { command: "npx playwright test" }, "  1 passed (1.2s)\n"),
  ].join("\n");
async function cli(args) {
  let out = "",
    err = "";
  const code = await run(args, { stdout: { write: (t) => (out += t) }, stderr: { write: (t) => (err += t) }, env: {}, isTTY: false, cwd: dir });
  return { code, out, err };
}

test("sessionlens analyze --verdicts: an off check goes to the hidden list with its reason, the verdict and the exit code follow", async () => {
  file("sleepy.jsonl", session(SLEEPY));
  file("off/nick.json", rows("sleep_or_skip_added", "lint", 10, 1));
  const base = ["analyze", "sleepy.jsonl", "--profile", "qa-ts", "--ci"];
  assert.equal((await cli([...base, "--fail-on", "red"])).code, 1, "without verdicts: red");
  const r = await cli([...base, "--fail-on", "red", "--verdicts", "off"]);
  assert.equal(r.code, 0, r.err);
  const lines = r.out.split("\n");
  assert.match(lines[1], /^Verdict: Green/);
  assert.ok(lines.includes("Calibration: 10 verdicts from 1 file, off: sleep_or_skip_added"), r.out);
  assert.ok(lines.includes("Hidden by calibration: sleep_or_skip_added (precision 10% over 10 verdicts)"), r.out);
  assert.doesNotMatch(r.out, /\nhigh /);
  const md = (await cli([...base, "--md", "--verdicts", "off"])).out;
  assert.match(md, /\n\*\*Calibration:\*\* 10 verdicts from 1 file, off: sleep_or_skip_added\n/);
  assert.match(md, /### Hidden by calibration \(low precision\)\n- 🔴 \*\*high\*\* .*`sleep_or_skip_added` · precision 10% over 10 verdicts\n/);
  const j = JSON.parse((await cli([...base, "--json", "--verdicts", "off"])).out);
  assert.equal(j.verdict, "green");
  assert.deepEqual(j.calibration, { verdicts: 10, files: 1, off: ["sleep_or_skip_added"], demoted: [] });
  assert.deepEqual(
    j.hiddenByCalibration.map((f) => [f.check, f.precision, f.verdicts]),
    [["sleep_or_skip_added", 0.1, 10]],
  );
  // demoted: low, so yellow is not reached either; the regex check's record says nothing about ESLint's finding
  file("low/nick.json", rows("sleep_or_skip_added", "lint", 10, 4));
  const low = await cli([...base, "--fail-on", "yellow", "--verdicts", "low"]);
  assert.equal(low.code, 0);
  assert.match(low.out, /\nlow +sleep_or_skip_added /);
  assert.match(low.out, /Calibration: 10 verdicts from 1 file, demoted: sleep_or_skip_added\n/);
  file("regex/nick.json", rows("sleep_or_skip_added", "formal", 10, 1));
  assert.equal((await cli([...base, "--fail-on", "red", "--verdicts", "regex"])).code, 1);
  // no line about calibration without the flag; with it and no verdicts yet, the line says so
  assert.doesNotMatch((await cli(base)).out, /Calibration:/);
  assert.match((await cli([...base, "--verdicts", "empty"])).out, /Calibration: 0 verdicts from 0 files\n/);
  // repeated, the files add up
  file("off/half.json", rows("sleep_or_skip_added", "lint", 5, 0, "first"));
  file("half2.json", rows("sleep_or_skip_added", "lint", 5, 1, "second"));
  assert.match(
    (await cli([...base, "--verdicts", "off/half.json", "--verdicts", "half2.json"])).out,
    /Calibration: 10 verdicts from 2 files, off: sleep_or_skip_added\n/,
  );
});

test("a check on trial: low until it has 10 verdicts, its own severity after, off when they say so", async () => {
  file("empty.jsonl", session(EMPTY_RESULT));
  const base = ["analyze", "empty.jsonl", "--profile", "qa-ts", "--ci"];
  const sev = (r) => (r.out.match(/\n(high|medium|low) +empty_result_unverified /) || [])[1];
  assert.equal(sev(await cli(base)), "low");
  file("t9.json", rows("empty_result_unverified", "formal", 9, 9));
  assert.equal(sev(await cli([...base, "--verdicts", "t9.json"])), "low", "9 verdicts: still on trial");
  file("t10.json", rows("empty_result_unverified", "formal", 10, 9));
  const medium = await cli([...base, "--fail-on", "yellow", "--verdicts", "t10.json"]);
  assert.equal(sev(medium), "medium");
  assert.equal(medium.code, 1);
  file("t0.json", rows("empty_result_unverified", "formal", 10, 1));
  assert.equal(sev(await cli([...base, "--verdicts", "t0.json"])), undefined);
});

// 0.1.136: out of trial, a fake of the app makes the session Red with no verdicts at all; the verdicts can still say otherwise
test("app_faked_in_test is high with no verdicts, and calibration can still switch it off", async () => {
  file("fake.jsonl", session(INJECTED));
  const base = ["analyze", "fake.jsonl", "--profile", "qa-ts", "--ci"];
  const sev = (r) => (r.out.match(/\n(high|medium|low) +app_faked_in_test /) || [])[1];
  const red = await cli([...base, "--fail-on", "red"]);
  assert.equal(sev(red), "high");
  assert.equal(red.code, 1);
  assert.match(red.out, /Verdict: Red/);
  file("fake-off.json", rows("app_faked_in_test", "formal", 10, 1));
  assert.equal(sev(await cli([...base, "--verdicts", "fake-off.json"])), undefined);
});
