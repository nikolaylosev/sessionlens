"use strict";
/* The import of a Cursor session reads the Cursor hook's log (0.1.130): cursor-hooks.js readLog turns the log of one
   chat into the command output and the file versions the import already takes from Cursor's database; the red and the
   green run of the real capture (test/fixtures/cursor-hooks) get their results, which the transcript alone does not
   give. End to end through the panel and the host: a picked transcript gets the log over the database, the session
   keeps the chat's id, and Import again asks the log for it, so a session imported before the log was there gets the
   results too. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { root, load } = require("./helpers");
const { bootHost, openPage } = require("./host-panel");
const { createStore } = require("../store.js");
const Hook = require(path.join(root, "media", "cursor-hook.js"));
const H = require(path.join(root, "cursor-hooks.js"));

const { Lens } = load();
const FIX = path.join(__dirname, "fixtures", "cursor-hooks");
const CAPTURED = "185d7b56-71d4-447b-940b-c5790e97d391";
const EVENTS = fs.readFileSync(path.join(FIX, "events.jsonl"), "utf8").trim().split("\n");
const TRANSCRIPT = fs.readFileSync(path.join(FIX, "transcript.jsonl"), "utf8");
const home = () => fs.mkdtempSync(path.join(os.tmpdir(), "sl-hookimp-"));
// the capture's log under a chat id of its own: a real Cursor's database on this machine knows the captured one
function writeLog(h, id = crypto.randomUUID(), events = EVENTS) {
  const dir = H.paths(h).logDir;
  for (const e of events) Hook.handle(e.split(CAPTURED).join(id), { env: { SESSIONLENS_HOOK_LOG: dir } });
  return id;
}
const runs = (events) =>
  events.filter((e) => e.kind === "run_tests").map((e) => [e.cmd, e.tests ? `${e.tests.passed}/${e.tests.failed}` : null, !!e.output_missing]);

test("readLog: the capture gives the output of each command and two versions of the test file", () => {
  const h = home(),
    id = writeLog(h);
  const log = H.readLog({ home: h, id });
  assert.deepEqual(
    log.outputs.map((o) => [o.command, o.exitCode]),
    [
      ["python3 -m venv .venv && .venv/bin/python -m pip install pytest", undefined],
      ["rm -rf .venv && python3 -m venv .venv && .venv/bin/python -m pip install pytest", 0],
      [".venv/bin/python -m pytest -q", undefined],
      [".venv/bin/python -m pytest -q && ls -la tests", 0],
    ],
  );
  assert.match(log.outputs[2].output, /1 failed, 1 passed/);
  const FILE = "/Users/me/hook-capture-demo/tests/test_sample.py";
  const v1 = 'def test_ok():\n    assert 1 + 1 == 2\n\n\ndef test_fail():\n    assert "abc".upper() == "abc"\n';
  assert.deepEqual(log.edits, [
    { path: FILE, before: "", after: v1 },
    { path: FILE, before: v1, after: v1.replace('== "abc"\n', '== "ABC"\n') },
  ]);
  // no log, or an id that is no chat's
  assert.equal(H.readLog({ home: h, id: crypto.randomUUID() }), null);
  assert.equal(H.readLog({ home: h, id: "../" + id }), null);
});

test("readLog: a broken line and another chat's line are left out; a file edited before the log is told from its edit", () => {
  const h = home(),
    id = crypto.randomUUID(),
    dir = H.paths(h).logDir;
  fs.mkdirSync(dir, { recursive: true });
  const L = (o) => JSON.stringify(Object.assign({ v: 1, ts: "", conversation_id: id }, o));
  const before = "a = 1\nassert a == 1\n";
  fs.writeFileSync(
    path.join(dir, id + ".jsonl"),
    [
      L({ event: "shell", command: "pytest", output: "1 passed" }),
      '{"v":1,"conversation_id":"' + id + '","event":"shell","comm', // cut off while written
      L({ event: "shell", conversation_id: crypto.randomUUID(), command: "other", output: "x" }),
      // two edits in one file the agent did not write in this chat: undone from the last
      L({
        event: "edit",
        file_path: "/p/t.py",
        edits: [
          { old: "a = 1", new: "a = 2" },
          { old: "== 1", new: "== 2" },
        ],
      }),
      L({ event: "file", file_path: "/p/t.py", content: "a = 2\nassert a == 2\n" }),
      // a new text that is there twice: which one was it? no version
      L({ event: "edit", file_path: "/p/u.py", edits: [{ old: "x", new: "y" }] }),
      L({ event: "file", file_path: "/p/u.py", content: "y y\n" }),
      // its next edit has the version before it: the last file line of it
      L({ event: "edit", file_path: "/p/u.py", edits: [{ old: "y y", new: "z" }] }),
      L({ event: "file", file_path: "/p/u.py", content: "z\n" }),
      L({ event: "file", file_path: "/p/v.py", content: "x x\n" }),
      // its next edit cannot be undone (x is there three times), but the line before it is its version
      L({ event: "edit", file_path: "/p/v.py", edits: [{ old: "", new: "x " }] }),
      L({ event: "file", file_path: "/p/v.py", content: "x x x\n" }),
      // two edits where the second changes what the first wrote: undone from the last
      L({
        event: "edit",
        file_path: "/p/w.py",
        edits: [
          { old: "a", new: "b" },
          { old: "b", new: "c" },
        ],
      }),
      L({ event: "file", file_path: "/p/w.py", content: "c\n" }),
    ].join("\n") + "\n",
  );
  const log = H.readLog({ home: h, id });
  assert.deepEqual(log.outputs, [{ command: "pytest", output: "1 passed", exitCode: undefined }]);
  assert.deepEqual(log.edits, [
    { path: "/p/t.py", before, after: "a = 2\nassert a == 2\n" },
    { path: "/p/u.py", before: "y y\n", after: "z\n" },
    { path: "/p/v.py", before: "x x\n", after: "x x x\n" },
    { path: "/p/w.py", before: "a\n", after: "c\n" },
  ]);
});

test("the import: with the log the red and the green run have their results; without it, unknown", () => {
  const cfg = Lens.profile("qa-python");
  const h = home(),
    id = writeLog(h);
  const log = H.readLog({ home: h, id });
  const pytest = (ev) => runs(ev).filter((r) => /pytest -q/.test(r[0]));
  const bare = Lens.importAny(TRANSCRIPT, cfg);
  assert.deepEqual(pytest(bare), [
    [".venv/bin/python -m pytest -q", null, true],
    [".venv/bin/python -m pytest -q && ls -la tests", null, true],
  ]);
  const ev = Lens.importAny(TRANSCRIPT, cfg, { cursorOutputs: log.outputs, cursorEdits: log.edits });
  assert.deepEqual(pytest(ev), [
    [".venv/bin/python -m pytest -q", "1/1", false],
    [".venv/bin/python -m pytest -q && ls -la tests", "2/0", false],
  ]);
  const edit = ev.find((e) => e.kind === "edit");
  assert.match(edit.prev_content, /== "abc"/, "the file before the edit");
  assert.match(edit.new_content, /== "ABC"/);
  // the same transcript with and without the output: Import again does not ask whether it is this session
  assert.equal(Lens.transcriptMatch(bare, ev), 1);
});

async function until(fn, ms = 8000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}
const click = (p, sel) => p.document.querySelector(sel).dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));

test("picked in the panel: the log's results; Import again gets a log written after the import", async () => {
  const h = home();
  const env = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = h; // os.homedir(): the log, and Cursor's databases (none here), are looked for in this home
  process.env.USERPROFILE = h;
  try {
    const id = crypto.randomUUID();
    const file = path.join(h, ".cursor", "projects", "Users-me-hook-capture-demo", "agent-transcripts", id, id + ".jsonl");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, TRANSCRIPT);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-hookimp-store-"));
    const host = bootHost({
      storageDir: dir,
      globalState: { storageVersion: 2, settings: { profile: "qa-python", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
      vscode: { openDialogAnswer: [{ scheme: "file", fsPath: file, toString: () => "file://" + file }] },
    });
    const store = async () => {
      const st = createStore({ dir: path.join(dir, "sessions") });
      await st.open();
      const sid = st.list()[0] && st.list()[0].id;
      return sid ? (await st.get(sid)).session : null;
    };
    const pytest = (s) => runs(s.events).filter((r) => /pytest -q/.test(r[0]));

    // imported before the log is there: the results are unknown
    const sb = await openPage(host);
    await sb.ready();
    click(sb, "#file");
    await until(() => sb.document.querySelectorAll(".sl-modal-overlay button").length >= 4);
    [...sb.document.querySelectorAll(".sl-modal-overlay button")].find((b) => b.textContent === "Cursor Agent").click();
    await until(() => !sb.document.querySelector("#name-row").hidden);
    sb.document.querySelector("#name-go").click();
    await until(() => host.calls.output.some((l) => /analysis \(import\)/.test(l)));
    await sb.idle();
    let s = await store();
    assert.equal(s.source_cursor_id, id, "the chat's id is kept");
    assert.deepEqual(
      pytest(s).map((r) => r[2]),
      [true, true],
    );
    assert.deepEqual(sb.errors, []);
    sb.close();

    // the log is written; Import again in the session's tab asks the host for it
    writeLog(h, id);
    const tab = await openPage(host, { sessionId: s.id });
    await tab.ready();
    const n0 = tab.sent.filter((m) => m.type === "session:put").length;
    click(tab, "#reimport-go");
    await until(() => tab.sent.filter((m) => m.type === "session:put").length > n0);
    await tab.idle();
    assert.ok(tab.sent.some((m) => m.type === "cursor:log"));
    s = await store();
    assert.deepEqual(pytest(s), [
      [".venv/bin/python -m pytest -q", "1/1", false],
      [".venv/bin/python -m pytest -q && ls -la tests", "2/0", false],
    ]);
    assert.equal(s.source_outputs.length, 4, "kept with the text: Back to regex parsing reads it too");
    assert.deepEqual(tab.errors, []);
    tab.close();

    // a new pick of the same file: the log over Cursor's database, said in the Output channel
    const again = await openPage(host);
    await again.ready();
    click(again, "#file");
    await until(() => again.document.querySelectorAll(".sl-modal-overlay button").length >= 4);
    [...again.document.querySelectorAll(".sl-modal-overlay button")].find((b) => b.textContent === "Cursor Agent").click();
    await until(() => !again.document.querySelector("#name-row").hidden);
    const out = host.calls.output.join("\n");
    assert.match(out, /cursor: the output of 4 commands from the hook log/);
    assert.match(out, /cursor: the file before and after 2 edits from the hook log/);
    again.close();
  } finally {
    for (const [k, v] of Object.entries(env))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});

test("cursor:log: the log of a chat by its id; none is an empty answer; an id that is no UUID is refused", async () => {
  const h = home();
  const env = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = h;
  process.env.USERPROFILE = h;
  try {
    const id = writeLog(h);
    const host = bootHost({});
    const p = await openPage(host);
    await p.ready();
    const ask = (x) => p.window.__slCursorLog(x);
    const r = await ask(id);
    assert.deepEqual([r.outputs.length, r.edits.length], [4, 2]);
    assert.deepEqual(await ask(crypto.randomUUID()), {});
    assert.match((await ask("../../etc/passwd")).error, /bad chat id/);
    p.close();
  } finally {
    for (const [k, v] of Object.entries(env))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});

test("an older Cursor session, with no text and no chat id: Import again picks the file, reads the log, keeps the id", async () => {
  const h = home();
  const env = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = h;
  process.env.USERPROFILE = h;
  try {
    const id = writeLog(h);
    const cfg = Lens.profile("qa-python");
    const s = {
      id: "old-cursor-1",
      name: "older",
      task: "",
      profile: "qa-python",
      created: "2026-10-01T00:00:00.000Z",
      events: Lens.importAny(TRANSCRIPT, cfg),
      findings: [],
      verdicts: {},
      spec: "",
      source_text: "",
      agent: "cursor",
      importGen: Lens.IMPORT_GEN,
    };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-hookimp-old-"));
    const st = createStore({ dir: path.join(dir, "sessions") });
    await st.open();
    await st.put(s, { analyzedGen: "" });
    const host = bootHost({
      storageDir: dir,
      globalState: { storageVersion: 2, settings: { profile: "qa-python", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
    });
    const p = await openPage(host, { sessionId: s.id });
    await p.ready();
    p.window.chooseDialog = async () => "cursor";
    // what the host answers for the picked file: its text and the chat's id, no database here
    p.window.__slPickTranscript = async () => ({ name: id + ".jsonl", text: TRANSCRIPT, cursorId: id });
    const n0 = p.sent.filter((m) => m.type === "session:put").length;
    click(p, "#reimport-go");
    await until(() => p.sent.filter((m) => m.type === "session:put").length > n0);
    await p.idle();
    const st2 = createStore({ dir: path.join(dir, "sessions") });
    await st2.open();
    const got = (await st2.get(s.id)).session;
    assert.equal(got.source_cursor_id, id, "the next Import again asks the log by itself");
    assert.deepEqual(
      runs(got.events)
        .filter((r) => /pytest -q/.test(r[0]))
        .map((r) => r[1]),
      ["1/1", "2/0"],
    );
    assert.deepEqual(p.errors, []);
    p.close();
  } finally {
    for (const [k, v] of Object.entries(env))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});
