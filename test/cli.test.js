"use strict";
/* sessionlens analyze (phase 11, step 4): cli/lib/cli.js, run in this process with its output captured, and the bin
   once through a real process. The decisions it carries (TODO §6.1, 30.10): --profile is required; --ci sets no_spec
   and stop_markers_missing aside unless --spec is given; exit 0 whatever the colour unless --fail-on red|yellow, 1 when
   it matches, 2 when the CLI could not do its work; colours only on a terminal without NO_COLOR or --no-color. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { load, root } = require("./helpers");

const { Lens } = load();
const { run } = require(path.join(root, "cli", "lib", "cli.js"));
const BIN = path.join(root, "cli", "bin", "sessionlens.js");

const J = JSON.stringify;
const CODE =
  "import { test, expect } from '@playwright/test';\ntest('R1: adds a todo', async ({ page }) => {\n  await page.goto('/');\n  await page.getByPlaceholder('What needs to be done?').fill('Milk');\n  await page.getByPlaceholder('What needs to be done?').press('Enter');\n  await expect(page.getByTestId('todo-title')).toHaveText(['Milk']);\n});\n";
const tool = (id, name, input, result) => [
  J({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }),
  J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: result }] } }),
];
// a Claude Code session: a test written, run green, reported; its only findings are no_spec and stop_markers_missing
const HONEST = [
  J({ type: "user", message: { role: "user", content: "Write a test for adding a todo" } }),
  ...tool("t1", "Write", { file_path: "tests/todo.spec.ts", content: CODE }, "ok"),
  ...tool("t2", "Bash", { command: "npx playwright test" }, "  ✓  1 [chromium] › tests/todo.spec.ts:2:5 › R1: adds a todo (500ms)\n\n  1 passed (1.2s)\n"),
  J({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "The test passes." }] } }),
].join("\n");
// the same test with a sleep in it: high, from ESLint (the engine loaded) and from the regex check
const SLEEPY = HONEST.replace(
  J(CODE).slice(1, -1),
  J(CODE.replace("  await page.goto('/');\n", "  await page.goto('/');\n  await page.waitForTimeout(2000);\n")).slice(1, -1),
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-cli-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
const file = (name, text) => (fs.writeFileSync(path.join(dir, name), text), name);
file("honest.jsonl", HONEST);
file("sleepy.jsonl", SLEEPY);
file("spec.md", "# Todos\n\n- R1. A todo can be added.\n");
file("not-a-log.txt", "");

async function cli(args, io = {}) {
  let out = "",
    err = "";
  const code = await run(args, {
    stdout: { write: (t) => (out += t) },
    stderr: { write: (t) => (err += t) },
    env: io.env || {},
    isTTY: !!io.isTTY,
    cwd: dir,
  });
  return { code, out, err };
}

test("--help, --version, and what the CLI cannot do: exit 2 with the reason", async () => {
  const help = await cli(["--help"]);
  assert.equal(help.code, 0);
  assert.match(help.out, /^Usage: sessionlens analyze <log> --profile <name>/);
  assert.match(help.out, /qa-ts, qa-cypress/);
  assert.deepEqual(await cli(["--version"]), { code: 0, out: Lens.ANALYSIS_VERSION + "\n", err: "" });
  const errors = {
    "sessionlens: expected: sessionlens analyze <log>": ["honest.jsonl"],
    "--profile is required": ["analyze", "honest.jsonl"],
    'unknown profile "qa-rust"': ["analyze", "honest.jsonl", "--profile", "qa-rust"],
    '--fail-on is none, red or yellow, not "blue"': ["analyze", "honest.jsonl", "--profile", "qa-ts", "--fail-on", "blue"],
    "one output at a time": ["analyze", "honest.jsonl", "--profile", "qa-ts", "--json", "--md"],
    "cannot read nope.jsonl: no such file": ["analyze", "nope.jsonl", "--profile", "qa-ts"],
    "cannot read nope.md: no such file": ["analyze", "honest.jsonl", "--profile", "qa-ts", "--spec", "nope.md"],
    "not-a-log.txt: no steps read": ["analyze", "not-a-log.txt", "--profile", "qa-ts"],
    "spec.md is not a rules.json": ["analyze", "honest.jsonl", "--profile", "qa-ts", "--rules", "spec.md"],
    "Unknown option '--colour'": ["analyze", "honest.jsonl", "--profile", "qa-ts", "--colour"],
  };
  for (const [msg, args] of Object.entries(errors)) {
    const r = await cli(args);
    assert.equal(r.code, 2, args.join(" "));
    assert.equal(r.out, "", args.join(" "));
    assert.ok(r.err.includes(msg), `${args.join(" ")}: ${r.err}`);
  }
  // a claude.ai export of two conversations: one session per file
  const two = [1, 2].map((n) => ({
    name: `c${n}`,
    chat_messages: [
      { sender: "human", text: "hi" },
      { sender: "assistant", text: "Hello" },
    ],
  }));
  const many = await cli(["analyze", file("export.json", J(two)), "--profile", "qa-ts"]);
  assert.equal(many.code, 2);
  assert.match(many.err, /holds 2 conversations/);
});

test("the review: text by default; --ci sets the context aside unless --spec is given; --fail-on decides the exit code", async () => {
  const base = ["analyze", "honest.jsonl", "--profile", "qa-ts"];
  const plain = await cli(base);
  assert.equal(plain.code, 0, "red, and still 0 without --fail-on");
  assert.match(plain.out, /^SessionLens .* · qa-ts · honest\.jsonl\nVerdict: Red/);
  assert.match(plain.out, /\nhigh +no_spec /);
  assert.equal((await cli([...base, "--fail-on", "red"])).code, 1);
  assert.equal((await cli([...base, "--fail-on", "yellow"])).code, 1, "red is worse than yellow");
  const ci = await cli([...base, "--ci", "--fail-on", "yellow"]);
  assert.equal(ci.code, 0, "green once the context is set aside");
  assert.match(ci.out, /Verdict: Green/);
  assert.match(ci.out, /Context, not counted \(no specification given\): no_spec, stop_markers_missing/);
  // with a specification, the plan is the agent's again: stop_markers_missing counts
  const spec = await cli([...base, "--ci", "--spec", "spec.md", "--fail-on", "yellow"]);
  assert.equal(spec.code, 1);
  assert.match(spec.out, /Verdict: Yellow/);
  assert.doesNotMatch(spec.out, /Context, not counted/);
  // the engine of the profile's language ran: its finding and the regex one are one, from ESLint
  const sleepy = await cli(["analyze", "sleepy.jsonl", "--profile", "qa-ts", "--ci", "--fail-on", "red", "--json"]);
  assert.equal(sleepy.code, 1);
  const j = JSON.parse(sleepy.out);
  assert.equal(j.verdict, "red");
  assert.deepEqual(
    j.findings.map((f) => `${f.check}/${f.source}`),
    ["sleep_or_skip_added/lint"],
  );
  assert.deepEqual(
    j.context.map((f) => f.check),
    ["no_spec", "stop_markers_missing"],
  );
  assert.equal(j.sessionlens, Lens.ANALYSIS_VERSION);
  assert.match((await cli([...base, "--md"])).out, /^## Session review: honest\.jsonl\n/);
});

test("--rules: a rules.json's severities and switched-off checks; rows it cannot apply are named on stderr", async () => {
  const rules = file(
    "rules.json",
    J({
      schema: "sessionlens/rules@1",
      rules: [{ check: "no_spec", severity: "low" }, { check: "stop_markers_missing", enabled: false }, { check: "no_such_check" }],
    }),
  );
  const r = await cli(["analyze", "honest.jsonl", "--profile", "qa-ts", "--rules", rules, "--fail-on", "yellow"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /Verdict: Green/);
  assert.match(r.out, /\nlow +no_spec /);
  assert.doesNotMatch(r.out, /stop_markers_missing/);
  assert.equal(r.err, "sessionlens: rules.json: rule 3 (no_such_check) is ignored: unknown_check\n");
});

test("colours on a terminal only, not with NO_COLOR or --no-color, and never in --md or --json", async () => {
  const args = ["analyze", "honest.jsonl", "--profile", "qa-ts"];
  assert.match((await cli(args, { isTTY: true })).out, /\x1b\[31mVerdict: Red/);
  assert.doesNotMatch((await cli(args)).out, /\x1b\[/);
  assert.doesNotMatch((await cli(args, { isTTY: true, env: { NO_COLOR: "1" } })).out, /\x1b\[/);
  assert.doesNotMatch((await cli([...args, "--no-color"], { isTTY: true })).out, /\x1b\[/);
  assert.doesNotMatch((await cli([...args, "--md"], { isTTY: true })).out, /\x1b\[/);
});

test("the bin: the exit code of the process; an engine that does not load is exit 2", () => {
  const sh = (args, pre = []) => spawnSync(process.execPath, [...pre, BIN, ...args], { encoding: "utf8", cwd: dir });
  const v = sh(["--version"]);
  assert.equal(v.status, 0);
  assert.equal(v.stdout, Lens.ANALYSIS_VERSION + "\n");
  assert.equal(sh(["analyze", "honest.jsonl", "--profile", "qa-ts", "--fail-on", "red"]).status, 1);
  assert.equal(sh(["analyze", "honest.jsonl", "--profile", "qa-ts", "--ci", "--fail-on", "red"]).status, 0);
  // the loader replaced by one that fails, before the CLI loads it
  const stub = file(
    "failing-engine.js",
    `require.cache[${J(path.join(root, "cli", "lib", "engines.js"))}] = { exports: { loadEngine: async () => ({ state: "failed", error: "no bundle" }) } };\n`,
  );
  const r = sh(["analyze", "honest.jsonl", "--profile", "qa-ts"], ["--require", path.join(dir, stub)]);
  assert.equal(r.status, 2);
  assert.equal(r.stderr, "sessionlens: the typescript lint engine did not load: no bundle\n");
  assert.equal(r.stdout, "");
});
