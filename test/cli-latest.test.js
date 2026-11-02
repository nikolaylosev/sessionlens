"use strict";
/* --latest (0.1.136): the newest session of an agent that worked in this folder, on a made-up home with each agent's folders
   as they are on a real machine. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load, root } = require("./helpers");

load();
const { run } = require(path.join(root, "cli", "lib", "cli.js"));
const { latestSession } = require(path.join(root, "cli", "lib", "find-session.js"));

const J = JSON.stringify;
const home = fs.mkdtempSync(path.join(os.tmpdir(), "sl-latest-"));
test.after(() => fs.rmSync(home, { recursive: true, force: true }));
const CWD = "/Users/me/Projects/my_app.web";
const SLUG = "-Users-me-Projects-my-app-web";
let tick = 1_000_000;
// each file is newer than the one before it
const put = (rel, text = "x\n", when = ++tick) => {
  const f = path.join(home, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  fs.utimesSync(f, when, when);
  return f;
};
const rollout = (cwd) => J({ timestamp: "t", type: "session_meta", payload: { id: "1", instructions: "y".repeat(2000), cwd } }) + "\n";

test("the newest of each agent's sessions of this folder; other folders are left out", () => {
  assert.equal(latestSession(CWD, home), null, "nothing yet");
  const first = put(`.claude/projects/${SLUG}/a.jsonl`);
  assert.deepEqual(latestSession(CWD, home), { file: first, agent: "Claude Code" });
  const second = put(`.claude/projects/${SLUG}/b.jsonl`);
  assert.deepEqual(latestSession(CWD, home), { file: second, agent: "Claude Code" }, "the newer of two");
  put(`.claude/projects/-Users-me-Projects-other/c.jsonl`);
  put(`.claude/projects/${SLUG}/notes.txt`);
  assert.equal(latestSession(CWD, home).file, second, "another folder's, or no session");
  const cur = put(`.cursor/projects/${SLUG.slice(1)}/agent-transcripts/id1/id1.jsonl`);
  assert.deepEqual(latestSession(CWD, home), { file: cur, agent: "Cursor" }, "Cursor, in its folder per chat");
  const flat = put(`.cursor/projects/${SLUG.slice(1)}/agent-transcripts/id2.jsonl`);
  assert.equal(latestSession(CWD, home).file, flat, "Cursor, directly in the folder");
  put(`.cursor/projects/Users-me-Projects-other/agent-transcripts/x/x.jsonl`);
  put(`.codex/sessions/2026/11/01/rollout-other.jsonl`, rollout("/Users/me/Projects/other"));
  assert.equal(latestSession(CWD, home).file, flat, "another folder's Cursor and Codex sessions");
  put(`.codex/sessions/2026/11/01/notes.jsonl`, rollout(CWD));
  assert.equal(latestSession(CWD, home).file, flat, "not a rollout");
  const dex = put(`.codex/sessions/2026/11/02/rollout-mine.jsonl`, rollout(CWD));
  assert.deepEqual(latestSession(CWD, home), { file: dex, agent: "Codex" }, "Codex, by the cwd on its first line");
  put(`.codex/sessions/2026/11/02/rollout-bad.jsonl`, "not json at all\n");
  assert.equal(latestSession(CWD, home).file, dex, "a file with no cwd");
  // a path with a quote or a backslash in it
  const odd = 'C:\\work\\my "app"';
  const f = put(`.codex/sessions/2026/11/02/rollout-odd.jsonl`, rollout(odd));
  assert.equal(latestSession(odd, home).file, f);
});

test("sessionlens analyze --latest: the review of that file, which it names; none, or a log as well, is exit 2", async () => {
  const log = [
    J({ type: "user", message: { role: "user", content: "Write a test" } }),
    J({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id: "r", name: "Read", input: { file_path: "README.md" } }] } }),
    J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "r", content: "# App" }] } }),
    J({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }),
  ].join("\n");
  const newest = put(`.claude/projects/${SLUG}/newest.jsonl`, log);
  const cli = async (args, cwd = CWD) => {
    let out = "",
      err = "";
    const code = await run(args, { stdout: { write: (t) => (out += t) }, stderr: { write: (t) => (err += t) }, env: {}, isTTY: false, cwd, home });
    return { code, out, err };
  };
  const r = await cli(["analyze", "--latest", "--profile", "qa-ts"]);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.err, `sessionlens: the latest session here, Claude Code: ${newest}\n`);
  assert.ok(r.out.split("\n")[0].endsWith(newest), "the report names it");
  const none = await cli(["analyze", "--latest", "--profile", "qa-ts"], "/nowhere");
  assert.equal(none.code, 2);
  assert.equal(none.out, "");
  assert.match(none.err, /no session of Claude Code, Codex or Cursor found for \/nowhere/);
  const both = await cli(["analyze", "a.jsonl", "--latest", "--profile", "qa-ts"]);
  assert.equal(both.code, 2);
  assert.match(both.err, /a log or --latest/);
  const neither = await cli(["analyze", "--profile", "qa-ts"]);
  assert.equal(neither.code, 2);
  assert.match(neither.err, /expected: sessionlens analyze/);
});
