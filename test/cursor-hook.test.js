"use strict";
/* The Cursor hook (0.1.130, media/cursor-hook.js, built from src/hook): what Cursor 3.25 really sent to a hook on
   macOS (test/fixtures/cursor-hooks/events.jsonl, captured 21 Oct 2026: a venv, a red pytest run, an edit, a green run)
   becomes a log of shell, exit, edit, file and stop lines; a command and its output are masked, code is not; the size
   limits; and whatever comes in, the script prints {} and exits 0 without writing outside its folder. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { root } = require("./helpers");

const HOOK = path.join(root, "media", "cursor-hook.js");
const H = require(HOOK);
const EVENTS = fs
  .readFileSync(path.join(__dirname, "fixtures", "cursor-hooks", "events.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l));
const ID = "185d7b56-71d4-447b-940b-c5790e97d391";
const NOW = new Date("2026-10-21T12:19:30.000Z");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "sl-hook-"));
const lines = (dir, id = ID) =>
  fs
    .readFileSync(path.join(dir, id + ".jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
// the script as Cursor runs it: JSON on stdin, {} on stdout, exit 0
const run = (input, env) => spawnSync(process.execPath, [HOOK], { input, env: Object.assign({}, process.env, env), encoding: "utf8", timeout: 10000 });

test("the real capture: shell, exit, edit, file and stop lines, in the order they came", () => {
  const dir = tmp();
  for (const e of EVENTS) H.handle(JSON.stringify(e), { env: { SESSIONLENS_HOOK_LOG: dir }, now: NOW });
  const log = lines(dir);
  assert.deepEqual(
    log.map((l) => l.event),
    ["shell", "shell", "exit", "edit", "file", "shell", "edit", "file", "shell", "exit", "stop"],
    "Grep and Read are not kept",
  );
  const shells = log.filter((l) => l.event === "shell");
  assert.deepEqual(
    shells.map((l) => l.command),
    [
      "python3 -m venv .venv && .venv/bin/python -m pip install pytest",
      "rm -rf .venv && python3 -m venv .venv && .venv/bin/python -m pip install pytest",
      ".venv/bin/python -m pytest -q",
      ".venv/bin/python -m pytest -q && ls -la tests",
    ],
  );
  // the red run's output, which Cursor's transcript does not have
  assert.match(shells[2].output, /1 failed, 1 passed/);
  assert.match(shells[3].output, /2 passed in/);
  assert.equal(shells[2].tool_use_id, "7117bbba-4008-42e4-8ace-4481f8e7181a");
  assert.equal(shells[2].duration, 313.217);
  // an exit code only for the calls that succeeded: Cursor sent no postToolUse after the red run
  assert.deepEqual(
    log.filter((l) => l.event === "exit").map((l) => [l.command, l.exit_code, l.failed]),
    [
      ["rm -rf .venv && python3 -m venv .venv && .venv/bin/python -m pip install pytest", 0, false],
      [".venv/bin/python -m pytest -q && ls -la tests", 0, false],
    ],
  );
  const edits = log.filter((l) => l.event === "edit");
  assert.deepEqual(edits[1].edits, [{ old: '    assert "abc".upper() == "abc"', new: '    assert "abc".upper() == "ABC"' }]);
  assert.equal(edits[0].edits[0].old, "", "a new file");
  const files = log.filter((l) => l.event === "file");
  assert.equal(files[1].file_path, "/Users/me/hook-capture-demo/tests/test_sample.py");
  assert.equal(
    files[1].content,
    'def test_ok():\n    assert 1 + 1 == 2\n\n\ndef test_fail():\n    assert "abc".upper() == "ABC"\n',
    "the whole file after the edit",
  );
  const stop = log.at(-1);
  assert.deepEqual([stop.status, stop.model, stop.input_tokens, stop.output_tokens, stop.cache_read_tokens], ["completed", "grok-4.7", 121087, 1154, 105984]);
  assert.ok(log.every((l) => l.v === 1 && l.conversation_id === ID && l.ts === NOW.toISOString()));
  assert.ok(!JSON.stringify(log).includes("user_email"), "nothing about the user");
});

test("as Cursor runs it: {} on stdout and exit 0, for an event it keeps, one it does not, and anything else", () => {
  const dir = tmp();
  for (const input of [JSON.stringify(EVENTS[1]), JSON.stringify(EVENTS[0]), "not json", "", "[]", JSON.stringify({ hook_event_name: "stop" })]) {
    const r = run(input, { SESSIONLENS_HOOK_LOG: dir });
    assert.equal(r.status, 0, input.slice(0, 40));
    assert.equal(r.stdout, "{}\n", input.slice(0, 40));
  }
  assert.deepEqual(fs.readdirSync(dir), [ID + ".jsonl"]);
  assert.deepEqual(
    lines(dir).map((l) => l.event),
    ["shell"],
  );
  // the log folder cannot be made (a file is in the way): still {} and 0
  const blocked = path.join(tmp(), "a-file");
  fs.writeFileSync(blocked, "x");
  const r = run(JSON.stringify(EVENTS[1]), { SESSIONLENS_HOOK_LOG: path.join(blocked, "log") });
  assert.deepEqual([r.status, r.stdout], [0, "{}\n"]);
});

test("a conversation id that is no plain name writes nothing, inside the folder or out of it", () => {
  // the log folder inside a folder of its own: "../escape" would land next to it
  const base = tmp(),
    dir = path.join(base, "log");
  for (const id of ["../escape", "a/b", "", ".hidden", "x".repeat(200), 42])
    assert.equal(H.handle(JSON.stringify(Object.assign({}, EVENTS[1], { conversation_id: id })), { env: { SESSIONLENS_HOOK_LOG: dir } }), null, String(id));
  assert.deepEqual(fs.readdirSync(base), [], "neither the log folder nor escape.jsonl");
});

test("a token in a command or its output is masked; code in an edit or a file is kept as it is", () => {
  const TOKEN = "sk-live0123456789abcdefghijklmnop";
  const shell = H.record(
    {
      hook_event_name: "afterShellExecution",
      conversation_id: ID,
      command: `curl -H "Authorization: Bearer ${TOKEN}" https://api.shop.test`,
      output: `token = "${TOKEN}"\n`,
    },
    NOW,
  );
  assert.ok(!JSON.stringify(shell).includes(TOKEN), JSON.stringify(shell));
  assert.match(shell.command, /\[REDACTED\]/);
  const edit = H.record(
    { hook_event_name: "afterFileEdit", conversation_id: ID, file_path: "/p/t.py", edits: [{ old_string: "", new_string: `API_KEY = "${TOKEN}"` }] },
    NOW,
  );
  assert.equal(edit.edits[0].new, `API_KEY = "${TOKEN}"`, "SessionLens reports it as hardcoded_secret");
  const file = H.record(
    { hook_event_name: "postToolUse", conversation_id: ID, tool_name: "Write", tool_input: { file_path: "/p/t.py", content: `API_KEY = "${TOKEN}"` } },
    NOW,
  );
  assert.equal(file.content, `API_KEY = "${TOKEN}"`);
});

test("the limits: the end of a long output, a long command's start, 50 edits of 20 000 characters, no cut file", () => {
  const out = "x".repeat(H.MAX_OUTPUT + 5000) + "1 failed, 1 passed";
  const shell = H.record({ hook_event_name: "afterShellExecution", conversation_id: ID, command: "pytest " + "-k a ".repeat(1000), output: out }, NOW);
  assert.equal(shell.output.length, H.MAX_OUTPUT);
  assert.ok(shell.output.endsWith("1 failed, 1 passed"), "the summary is at the end");
  assert.equal(shell.output_chars, out.length);
  assert.equal(shell.command.length, H.MAX_COMMAND);
  assert.ok(shell.command.startsWith("pytest -k a"));
  const many = Array.from({ length: 60 }, () => ({ old_string: "a".repeat(H.MAX_EDIT + 10), new_string: "b" }));
  const edit = H.record({ hook_event_name: "afterFileEdit", conversation_id: ID, file_path: "/p/t.py", edits: many }, NOW);
  assert.equal(edit.edits.length, H.MAX_EDITS);
  assert.equal(edit.edits[0].old.length, H.MAX_EDIT);
  const big = {
    hook_event_name: "postToolUse",
    conversation_id: ID,
    tool_name: "Write",
    tool_input: { file_path: "/p/t.py", content: "y".repeat(H.MAX_FILE + 1) },
  };
  assert.equal(H.record(big, NOW), null);
});

test("a failed Shell call: postToolUseFailure is a failure, with its exit code when Cursor gives one", () => {
  const fail = (extra) =>
    H.record(
      Object.assign({ hook_event_name: "postToolUseFailure", conversation_id: ID, tool_name: "Shell", tool_input: { command: "pytest -q" } }, extra),
      NOW,
    );
  assert.deepEqual([fail({}).failed, fail({}).exit_code], [true, undefined]);
  assert.equal(fail({ tool_output: JSON.stringify({ output: "1 failed", exitCode: 1 }) }).exit_code, 1);
  const ok = (code) =>
    H.record(
      {
        hook_event_name: "postToolUse",
        conversation_id: ID,
        tool_name: "Shell",
        tool_input: { command: "pytest -q" },
        tool_output: JSON.stringify({ exitCode: code }),
      },
      NOW,
    );
  assert.deepEqual([ok(0).failed, ok(2).failed, ok(2).exit_code], [false, true, 2]);
  assert.equal(H.record({ hook_event_name: "postToolUse", conversation_id: ID, tool_name: "Read", tool_input: { file_path: "/p" } }, NOW), null);
});
