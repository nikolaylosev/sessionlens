"use strict";
/* sessionlens analyze (phase 11, step 4): cli/lib/cli.js, run in this process with its output captured, and the bin
   once through a real process. The decisions it carries (TODO §6.1, 30.10): --profile is required; --ci sets
   stop_markers_missing aside, and no_spec without --spec; exit 0 whatever the colour unless --fail-on red|yellow, 1 when
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
file("no-requirements.md", "\n\n");

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

test("the review: text by default; --ci sets the context aside; --fail-on decides the exit code", async () => {
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
  assert.match(ci.out, /Context, not counted in CI: no_spec, stop_markers_missing/);
  // with a specification nobody approves a plan in CI either; outside CI the plan counts
  const spec = await cli([...base, "--ci", "--spec", "spec.md", "--fail-on", "yellow"]);
  assert.equal(spec.code, 0);
  assert.match(spec.out, /Verdict: Green/);
  assert.match(spec.out, /Context, not counted in CI: stop_markers_missing\n/);
  assert.match((await cli([...base, "--spec", "spec.md"])).out, /Verdict: Yellow/);
  // a specification file with nothing in it, not even a blank line: no_spec says so, and counts
  for (const name of ["no-requirements.md", file("zero-bytes.md", "")]) {
    const empty = await cli([...base, "--ci", "--spec", name, "--fail-on", "red"]);
    assert.equal(empty.code, 1, name);
    assert.match(empty.out, /\nhigh +no_spec /, name);
    assert.match(empty.out, new RegExp(`\\nSpecification: ${name}: no requirements found\\n`));
    assert.match((await cli([...base, "--spec", name, "--md"])).out, new RegExp(`\\*\\*Specification:\\*\\* ${name}: no requirements found\\n`));
  }
  // requirements with IDs have an "untested" list; lines the parser numbered have no IDs, so their coverage is not checked
  const uncovered = await cli([...base, "--spec", file("two.md", "- R1. A todo can be added.\n- R2. A todo can be deleted.\n")]);
  assert.match(uncovered.out, /\nSpecification: 2 requirements, untested: R2\n/);
  const noIds = await cli([...base, "--spec", file("notes.md", "A todo can be added\nA todo can be deleted\n")]);
  assert.match(noIds.out, /\nSpecification: 2 requirements · numbered automatically, coverage not checked\n/);
  assert.doesNotMatch(noIds.out, /untested/);
  assert.match((await cli([...base, "--spec", "notes.md", "--md"])).out, /\*\*Specification:\*\* 2 requirements · numbered automatically/);
  // no --spec at all: nothing to name
  assert.match(ci.out, /\nSpecification: not provided\n/);
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

test("a text file in place of a log is exit 2, not a Green review, whatever --fail-on says", async () => {
  for (const [name, text] of [
    ["agent-failed.jsonl", "Error: API key invalid\n"],
    ["notes.txt", "hello\n"],
    ["numbers.json", "[1, 2]\n"],
  ]) {
    const r = await cli(["analyze", file(name, text), "--profile", "qa-ts", "--ci", "--fail-on", "none"]);
    assert.equal(r.code, 2, name);
    assert.equal(r.out, "", name);
    assert.match(r.err, new RegExp(`${name} is not a session log of Claude Code, Codex or Cursor`));
  }
});

test("a log with only messages: a review, and all three outputs say it saw no tool calls", async () => {
  const log = [
    J({ type: "user", message: { role: "user", content: "Write a test" } }),
    J({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }),
  ].join("\n");
  const base = ["analyze", file("messages.jsonl", log), "--profile", "qa-ts"];
  const text = await cli([...base, "--fail-on", "yellow"]);
  assert.equal(text.code, 0, "the verdict comes from the findings, and there are none");
  assert.match(text.out, /Verdict: Green[^\n]*\nNote: this log has no tool calls/);
  assert.match(text.err, /messages\.jsonl: no tool calls in this log/);
  assert.match((await cli([...base, "--md"])).out, /Verdict:\*\* Green[^\n]*\n\*\*Note:\*\* this log has no tool calls/);
  assert.equal(JSON.parse((await cli([...base, "--json"])).out).noToolCalls, true);
  // a session with tool calls has none of it
  const honest = await cli(["analyze", "honest.jsonl", "--profile", "qa-ts", "--json"]);
  assert.equal(honest.err, "");
  assert.equal("noToolCalls" in JSON.parse(honest.out), false);
  assert.doesNotMatch((await cli(["analyze", "honest.jsonl", "--profile", "qa-ts"])).out, /no tool calls/);
  // tool calls it cannot read are a different message, once
  const unread = [log, J({ type: "tool_call", name: "edit" })].join("\n");
  const other = await cli(["analyze", file("unread.jsonl", unread), "--profile", "qa-ts"]);
  assert.match(other.err, /a format SessionLens does not read/);
  assert.doesNotMatch(other.err, /no tool calls in this log/);
});

test("--json-file: the Report .json in a file, whatever is printed; a file that cannot be written is exit 2", async () => {
  const base = ["analyze", "honest.jsonl", "--profile", "qa-ts", "--ci"];
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const text = await cli([...base, "--json-file", "out/deep/review.json"]);
  assert.equal(text.code, 0, text.err);
  assert.match(text.out, /^SessionLens /, "the text is still printed");
  const j = read("out/deep/review.json");
  assert.equal(j.schema, "sessionlens/finding@1");
  assert.equal(j.sessionlens, Lens.ANALYSIS_VERSION);
  assert.deepEqual(
    j.context.map((f) => f.check),
    ["no_spec", "stop_markers_missing"],
  );
  assert.match((await cli([...base, "--md", "--json-file", "md.json"])).out, /^## Session review/);
  assert.equal(read("md.json").verdict, "green");
  // the same content as --json
  const both = await cli([...base, "--json", "--json-file", "both.json"]);
  assert.equal(fs.readFileSync(path.join(dir, "both.json"), "utf8").replace(/"created": "[^"]*"/, ""), both.out.replace(/"created": "[^"]*"/, ""));
  // the exit code does not change
  assert.equal((await cli(["analyze", "honest.jsonl", "--profile", "qa-ts", "--fail-on", "red", "--json-file", "red.json"])).code, 1);
  assert.equal(read("red.json").verdict, "red");
  // a folder in its place: nothing printed, exit 2
  fs.mkdirSync(path.join(dir, "a-folder"));
  const bad = await cli([...base, "--json-file", "a-folder"]);
  assert.equal(bad.code, 2);
  assert.equal(bad.out, "");
  assert.match(bad.err, /^sessionlens: cannot write a-folder: /);
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
