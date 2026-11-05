"use strict";
/* cursor-db.js (0.1.121): the output of a Cursor Agent session's commands, from Cursor's own databases, built here in a
   temporary home with node:sqlite in the shape checked on the IDE and CLI 2026.10.01. What is checked: the CLI's
   store.db (messages in the order of the root blob, results matched by toolCallId, the exit code) and the IDE's
   state.vscdb (bubbles in the composer's order, exitCode absent when 0); a database opened read-only and left as it
   was; and no output, with a reason, for another file name, no node:sqlite, an unknown format or a chat not there. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { root } = require("./helpers");
const { cursorOutputs, transcriptId, ideDatabase } = require(path.join(root, "cursor-db.js"));
const { S, ID, home, transcript, cliDb, shell, result, ideDb, terminal, ideEdit, contentId } = require("./cursor-fixtures");

const skip = !S && "node:sqlite is not available";

test("the CLI's store.db: Shell calls in the root blob's order, each with its result and exit code", { skip }, () => {
  const h = home();
  try {
    const file = cliDb(h, [
      { role: "user", content: [{ type: "text", text: "Write tests" }] },
      shell("c1", "npx playwright test"),
      result("c1", "Exit code: 1\n\nCommand output:\n```\n  1 failed\n  12 passed (55.0s)\n```"),
      {
        role: "assistant",
        content: [
          { type: "text", text: "Fixing it." },
          { type: "tool-call", toolCallId: "r1", toolName: "Read", args: { path: "a.ts" } },
        ],
      },
      shell("c2", "npx playwright test"),
      result("c2", "Exit code: 0\n\nCommand output:\n```\n  13 passed (54.1s)\n```"),
    ]);
    const before = fs.readFileSync(file);
    const r = cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} });
    assert.equal(r.source, "cli");
    assert.deepEqual(
      r.outputs.map((o) => [o.command, o.exitCode, /\d+ passed/.exec(o.output)[0]]),
      [
        ["npx playwright test", 1, "12 passed"],
        ["npx playwright test", 0, "13 passed"],
      ],
    );
    assert.deepEqual(fs.readFileSync(file), before, "opened read-only, left as it was");
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});

test("the IDE's state.vscdb: terminal calls in the composer's order; no exitCode means 0", { skip }, () => {
  const h = home();
  try {
    ideDb(h, [
      { type: 1, text: "Write tests" },
      terminal("npx playwright test", "  1 failed\n  12 passed", 1),
      { toolFormerData: { name: "read_file_v2", params: JSON.stringify({ path: "a.ts" }), result: "{}" } },
      terminal("npx playwright test", "  13 passed"),
    ]);
    const r = cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} });
    assert.equal(r.source, "ide");
    assert.deepEqual(
      r.outputs.map((o) => [o.command, o.exitCode, o.output.trim()]),
      [
        ["npx playwright test", 1, "1 failed\n  12 passed"],
        ["npx playwright test", 0, "13 passed"],
      ],
    );
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});

test("the IDE's state.vscdb: each edit's file before and after, by the ids its result names (0.1.127)", { skip }, () => {
  const h = home();
  try {
    const v1 = "test('a', async () => {});\ntest('b', async () => {});\n",
      v2 = "test('a', async () => {});\n";
    ideDb(
      h,
      [
        { type: 1, text: "Write tests" },
        ideEdit("/w/e2e/x.spec.ts", "", v1),
        terminal("npx playwright test", "  2 passed"),
        ideEdit("/w/e2e/x.spec.ts", v1, v2),
        ideEdit("/w/e2e/gone.spec.ts", v2, "not kept"), // its content is not in the database: left out
      ],
      { [contentId(v1)]: v1, [contentId(v2)]: v2 },
    );
    const r = cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} });
    assert.equal(r.source, "ide");
    assert.equal(r.outputs.length, 1);
    assert.deepEqual(r.edits, [
      { path: "/w/e2e/x.spec.ts", before: "", after: v1 },
      { path: "/w/e2e/x.spec.ts", before: v1, after: v2 },
    ]);
    // edits only, no command: still a result
    const h2 = home();
    try {
      ideDb(h2, [ideEdit("/w/a.ts", "", v1)], { [contentId(v1)]: v1 });
      const r2 = cursorOutputs(transcript(h2), { home: h2, platform: "darwin", env: {} });
      assert.deepEqual([r2.outputs, r2.edits.length], [null, 1]);
    } finally {
      fs.rmSync(h2, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});

const NEW_FORMAT = "the IDE's state.vscdb in parts (chats from mid-October 2026 on, 0.1.138)";
test(`${NEW_FORMAT}: the commands and edits of every part, in order, with their exit codes`, { skip }, () => {
  const h = home();
  try {
    ideDb(
      h,
      [
        { text: "a reply, no tool" },
        terminal("pytest -q", " 1 failed, 1 passed", 1),
        ideEdit("/w/tests/a.py", "old", "new"),
        { text: "another reply" },
        terminal("pytest -q", " 2 passed", 0),
      ],
      { [contentId("old")]: "old", [contentId("new")]: "new" },
      { partSize: 2 }, // three parts, so a loop that stops after the first is seen
    );
    const r = cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} });
    assert.equal(r.source, "ide");
    assert.deepEqual(
      r.outputs.map((o) => [o.command, o.exitCode, o.output.trim()]),
      [
        ["pytest -q", 1, "1 failed, 1 passed"],
        ["pytest -q", 0, "2 passed"],
      ],
    );
    assert.deepEqual(r.edits, [{ path: "/w/tests/a.py", before: "old", after: "new" }]);
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});

test(`${NEW_FORMAT}: a list with entries wins over the parts, a part or a bubble that is gone is skipped`, { skip }, () => {
  const h = home();
  try {
    const file = ideDb(h, [terminal("one", "o1"), terminal("two", "o2"), terminal("three", "o3")], {}, { partSize: 1 });
    const db = new S.DatabaseSync(file);
    db.prepare("DELETE FROM cursorDiskKV WHERE key = ?").run(`composerConvHeaders:${ID}:000001`);
    db.close();
    const commands = () => cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} }).outputs.map((o) => o.command);
    assert.deepEqual(commands(), ["one", "three"]);
    const db2 = new S.DatabaseSync(file);
    db2
      .prepare("UPDATE cursorDiskKV SET value = ? WHERE key = ?")
      .run(JSON.stringify({ fullConversationHeadersOnly: [{ bubbleId: "b1" }, { bubbleId: "gone" }], headerLog: { chunkCount: 3 } }), "composerData:" + ID);
    db2.close();
    assert.deepEqual(commands(), ["two"]);
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});

test(`${NEW_FORMAT}: the chat there with no list that can be read is said so, not "no database has it"`, { skip }, () => {
  const h = home();
  try {
    const file = ideDb(h, [terminal("one", "o1")], {}, { partSize: 1 });
    const db = new S.DatabaseSync(file);
    const set = db.prepare("UPDATE cursorDiskKV SET value = ? WHERE key = ?");
    const composer = (v) => set.run(JSON.stringify(v), "composerData:" + ID);
    composer({ fullConversationHeadersOnly: [], somethingNew: { chunks: 1 } }); // a next format
    db.close();
    const reason = () => cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} }).reason;
    assert.equal(reason(), "the ide database has this chat in a format this version cannot read");
    const db2 = new S.DatabaseSync(file);
    db2.prepare("DELETE FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'").run();
    db2.prepare("INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)").run("bubbleId:ffffffff-3c17-4425-918c-f62e9496e707:b0", "{}"); // another chat's
    db2.close();
    assert.equal(reason(), "no Cursor database has this chat"); // a chat with no steps yet
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});

test("where the IDE keeps its database, per platform", () => {
  const h = path.join(path.sep, "h");
  assert.equal(ideDatabase(h, "darwin", {}), path.join(h, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb"));
  assert.equal(ideDatabase(h, "linux", {}), path.join(h, ".config", "Cursor", "User", "globalStorage", "state.vscdb"));
  assert.equal(ideDatabase(h, "win32", { APPDATA: path.join(h, "AD") }), path.join(h, "AD", "Cursor", "User", "globalStorage", "state.vscdb"));
});

test("no output, with a reason: another file name, no node:sqlite, an unknown format, a chat not there", { skip }, () => {
  const h = home();
  try {
    assert.equal(transcriptId(path.join(h, "notes.jsonl")), null);
    assert.deepEqual(cursorOutputs(path.join(h, "notes.jsonl"), { home: h }), { outputs: null, reason: "not a Cursor transcript name" });
    assert.deepEqual(cursorOutputs(transcript(h), { home: h, sqliteModule: null }), { outputs: null, reason: "node:sqlite is not available" });
    assert.deepEqual(cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} }), { outputs: null, reason: "no Cursor database has this chat" });
    cliDb(h, [shell("c1", "npx playwright test"), result("c1", "Exit code: 0")], { root: false });
    assert.equal(cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} }).outputs, null, "no meta: a format this code does not know");
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});
