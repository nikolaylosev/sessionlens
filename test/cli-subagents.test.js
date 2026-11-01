"use strict";
/* The CLI and a Claude Code session's subagents (0.1.135): their steps are in <session>/subagents/ next to the log, and
   media/claude-subagents.js, shared with the host, reads them. A session that started subagents and has none of their
   files gets a warning: the review misses their steps. On a real session the CLI saw 6 edits of 38 before this. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load, M, root } = require("./helpers");

load();
const { run } = require(path.join(root, "cli", "lib", "cli.js"));
const { claudeSubagents } = require(M("claude-subagents.js"));

const line = (o) => JSON.stringify(o);
const T = (s) => `2026-10-12T09:${String(s).padStart(2, "0")}:00.000Z`;
const base = (t, extra) => ({ timestamp: T(t), cwd: "/p", ...extra });
const say = (t, content, extra) => line({ type: "assistant", ...base(t, extra), message: { role: "assistant", content } });
const hear = (t, content, extra) => line({ type: "user", ...base(t, extra), message: { role: "user", content } });
const SLEEPY =
  "import { test, expect } from '@playwright/test';\ntest('a', async ({ page }) => {\n  await page.waitForTimeout(2000);\n  await expect(page.getByText('x')).toBeVisible();\n});\n";
const SESSION = [
  hear(0, "Write the tests"),
  say(1, [{ type: "tool_use", id: "a1", name: "Agent", input: { subagent_type: "playwright-test-generator", prompt: "Write them" } }]),
  hear(9, [{ type: "tool_result", tool_use_id: "a1", content: "Done" }]),
  say(10, [{ type: "text", text: "The generator wrote them." }]),
].join("\n");
const SUB = { isSidechain: true, agentId: "abc" };
const SUBAGENT = [
  hear(2, "Write them", SUB),
  say(3, [{ type: "tool_use", id: "w1", name: "Write", input: { file_path: "/p/tests/a.spec.ts", content: SLEEPY } }], SUB),
  hear(4, [{ type: "tool_result", tool_use_id: "w1", content: "ok" }], SUB),
].join("\n");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-subagents-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.writeFileSync(path.join(dir, "alone.jsonl"), SESSION);
fs.writeFileSync(path.join(dir, "s1.jsonl"), SESSION);
fs.mkdirSync(path.join(dir, "s1", "subagents"), { recursive: true });
fs.writeFileSync(path.join(dir, "s1", "subagents", "agent-abc.jsonl"), SUBAGENT);
fs.writeFileSync(path.join(dir, "s1", "subagents", "agent-abc.meta.json"), line({ agentType: "playwright-test-generator" }));
fs.writeFileSync(path.join(dir, "s1", "subagents", "notes.txt"), "not a subagent");

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

test("the files of a session's subagents, with their type; none for a session without the folder or a file that is no log", () => {
  assert.deepEqual(
    claudeSubagents(path.join(dir, "s1.jsonl")).map((s) => [s.agentId, s.agentType, s.text === SUBAGENT]),
    [["abc", "playwright-test-generator", true]],
  );
  assert.deepEqual(claudeSubagents(path.join(dir, "alone.jsonl")), []);
  // a file that is no log has no subagents, even with such a folder beside it
  fs.mkdirSync(path.join(dir, "notes.txt", "subagents"), { recursive: true });
  fs.writeFileSync(path.join(dir, "notes.txt", "subagents", "agent-x.jsonl"), SUBAGENT);
  assert.deepEqual(claudeSubagents(path.join(dir, "notes.txt")), []);
});

test("sessionlens analyze reads them: the subagent's test is in the review, and the report says so", async () => {
  const text = await cli("s1.jsonl");
  assert.equal(text.code, 0, text.err);
  assert.equal(text.err, "");
  assert.match(text.out, /\nSubagents: 1 file read with the session\n/);
  assert.match(text.out, /sleep_or_skip_added/, "a finding in the file only the subagent wrote");
  assert.match((await cli("s1.jsonl", "--md")).out, /\n\*\*Subagents:\*\* 1 file read with the session\n/);
  const j = JSON.parse((await cli("s1.jsonl", "--json")).out);
  assert.equal(j.subagents, 1);
  assert.equal(j.metrics.edits, 1);
  // a path from another folder finds them too
  const far = await run(["analyze", path.join(dir, "s1.jsonl"), "--profile", "qa-ts", "--json"], {
    stdout: { write() {} },
    stderr: { write() {} },
    env: {},
    isTTY: false,
    cwd: os.tmpdir(),
  });
  assert.equal(far, 0);
});

test("a session that started subagents without their files: a warning on stderr, the review goes on", async () => {
  const r = await cli("alone.jsonl");
  assert.equal(r.code, 0);
  assert.match(r.err, /alone\.jsonl: the session started subagents and their files are not next to it/);
  assert.doesNotMatch(r.out, /Subagents:/);
  assert.doesNotMatch(r.out, /sleep_or_skip_added/);
  assert.equal(JSON.parse((await cli("alone.jsonl", "--json")).out).subagents, undefined);
});
