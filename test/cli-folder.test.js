"use strict";
/* A folder of sessions (0.1.136): every log in it and its subfolders, one line each, the totals, and how many sessions each
   check spoke in. A subagent's file is part of its session, not a session. What cannot be reviewed is skipped and named. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load, root } = require("./helpers");

load();
const { run } = require(path.join(root, "cli", "lib", "cli.js"));
const { sessionFiles } = require(path.join(root, "cli", "lib", "find-session.js"));

const J = JSON.stringify;
const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sl-folder-")));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
const put = (rel, text) => {
  const f = path.join(dir, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
};
const CLEAN =
  "import { test, expect } from '@playwright/test';\ntest('a', async ({ page }) => {\n  await page.goto('/');\n  await expect(page.getByRole('heading')).toHaveText('Hi');\n});\n";
const SLEEPY = CLEAN.replace("  await expect", "  await page.waitForTimeout(2000);\n  await expect");
const session = (code) =>
  [
    J({ type: "user", message: { role: "user", content: "Write a test" } }),
    J({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id: "w", name: "Write", input: { file_path: "tests/a.spec.ts", content: code } }] },
    }),
    J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "w", content: "ok" }] } }),
    J({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: "r", name: "Bash", input: { command: "npx playwright test" } }] } }),
    J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "r", content: "  1 passed (1s)\n" }] } }),
  ].join("\n");
put("all/clean.jsonl", session(CLEAN));
put("all/sub/sleepy.jsonl", session(SLEEPY));
put("all/sub/sleepy/subagents/agent-a.jsonl", session(SLEEPY));
put("all/x/compaction/c.jsonl", session(SLEEPY));
put("all/notes.txt", "no log");
put("skip/clean.jsonl", session(CLEAN));
put("skip/empty.jsonl", "");
put("none/empty.jsonl", "");
fs.mkdirSync(path.join(dir, "nothing"));

async function cli(...args) {
  let out = "",
    err = "";
  const code = await run(["analyze", ...args, "--profile", "qa-ts"], {
    stdout: { write: (t) => (out += t) },
    stderr: { write: (t) => (err += t) },
    env: {},
    isTTY: false,
    cwd: dir,
  });
  return { code, out, err };
}

test("the logs of a folder and its subfolders; no subagent's file, no compaction, nothing else", () => {
  assert.deepEqual(
    sessionFiles(path.join(dir, "all")).map((f) => path.relative(path.join(dir, "all"), f)),
    ["clean.jsonl", path.join("sub", "sleepy.jsonl")],
  );
});

test("text: one line per session, the totals, the checks by the sessions they spoke in; --ci as for one session", async () => {
  const r = await cli("all", "--ci");
  assert.equal(r.code, 0, r.err);
  const lines = r.out.split("\n");
  assert.match(lines[0], /^SessionLens .* · qa-ts · all$/);
  assert.equal(lines[1], "2 sessions: 1 red, 0 yellow, 1 green");
  assert.equal(lines[3].replace(/ +/g, " "), "green 0 high, 0 medium, 0 low clean.jsonl");
  assert.match(lines[4].replace(/ +/g, " "), new RegExp(`^red 1 high, 0 medium, \\d low ${path.join("sub", "sleepy.jsonl").replace(/[\\.]/g, "\\$&")}$`));
  assert.ok(lines.includes("Checks, by the sessions they spoke in:"));
  assert.ok(
    lines.some((l) => /^ +1 {2}sleep_or_skip_added$/.test(l)),
    r.out,
  );
  assert.ok(!lines.some((l) => /no_spec/.test(l)), "the context does not count");
  // without --ci the context counts, in both sessions
  const all = await cli("all");
  assert.equal(all.out.split("\n")[1], "2 sessions: 2 red, 0 yellow, 0 green");
  assert.ok(all.out.split("\n").some((l) => /^ +2 {2}no_spec$/.test(l)));
});

test("--md and --json; --json-file beside the text; --fail-on on any session", async () => {
  const md = (await cli("all", "--ci", "--md")).out;
  assert.match(md, /^## Sessions: all\n\n2 sessions: 1 red, 0 yellow, 1 green\n/);
  assert.match(md, /\| Green \| 0 \| 0 \| 0 \| `clean\.jsonl` \|/);
  assert.match(md, /\| `sleep_or_skip_added` \| 1 \|/);
  const j = JSON.parse((await cli("all", "--ci", "--json")).out);
  assert.equal(j.schema, "sessionlens/summary@1");
  assert.deepEqual(j.totals, { sessions: 2, red: 1, yellow: 0, green: 1, skipped: 0 });
  assert.deepEqual(
    j.sessions.map((s) => [s.file, s.verdict, s.schema]),
    [
      ["clean.jsonl", "green", "sessionlens/finding@1"],
      [path.join("sub", "sleepy.jsonl"), "red", "sessionlens/finding@1"],
    ],
  );
  assert.deepEqual(j.checks[0], { check: j.checks[0].check, sessions: 1 });
  assert.match((await cli("all", "--ci", "--json-file", "out/s.json")).out, /^SessionLens /);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "out", "s.json"), "utf8")).totals.sessions, 2);
  assert.equal((await cli("all", "--ci", "--fail-on", "red")).code, 1, "one red session is enough");
  assert.equal((await cli("skip", "--ci", "--fail-on", "red")).code, 0, "none red");
});

test("what cannot be reviewed: skipped and named; none reviewable, no log, or --spec is exit 2", async () => {
  const r = await cli("skip", "--ci");
  assert.equal(r.code, 0, r.err);
  assert.equal(r.out.split("\n")[1], "1 session: 0 red, 0 yellow, 1 green, 1 skipped");
  assert.match(r.out, /\nSkipped:\n {2}empty\.jsonl: no steps read/);
  const j = JSON.parse((await cli("skip", "--json")).out);
  assert.equal(j.skipped[0].file, "empty.jsonl");
  assert.equal(j.totals.skipped, 1);
  assert.match((await cli("skip", "--md")).out, /### Skipped\n- empty\.jsonl: no steps read/);
  for (const [args, msg] of [
    [["none"], /none: none of its 1 logs could be reviewed: empty\.jsonl|none of its 1 logs could be reviewed/],
    [["nothing"], /nothing: no \.jsonl logs in this folder/],
    [["all", "--spec", "all/notes.txt"], /--spec is for one session/],
  ]) {
    const x = await cli(...args);
    assert.equal(x.code, 2, args.join(" "));
    assert.equal(x.out, "");
    assert.match(x.err, msg);
  }
});
