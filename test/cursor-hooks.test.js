"use strict";
/* Record Cursor agent runs / Stop recording (0.1.130, cursor-hooks.js and its two commands in extension.js), in a
   temporary home: the person's ~/.cursor/hooks.json gets five entries of ours and keeps its own, once, with the file as
   it was saved next to it; a hooks.json that is not JSON is never written over; Stop removes only ours, and the file
   when SessionLens made it; the copy of the hook follows the extension's version; logs older than 30 days go. On macOS
   and Linux the wrapper is run the way Cursor runs it (from ~/.cursor, the command as hooks.json has it) and writes a
   log line. The commands: in Cursor only, a question before anything is written, not in a remote window. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { root } = require("./helpers");
const H = require(path.join(root, "cursor-hooks.js"));
const { fakeVscode, loadExtension, fakeContext } = require("./fake-vscode");

const SOURCE = fs.readFileSync(path.join(root, "media", "cursor-hook.js"), "utf8");
const home = () => fs.mkdtempSync(path.join(os.tmpdir(), "sl-home-"));
const P = (h) => H.paths(h);
const json = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const ours = (j) => H.HOOK_EVENTS.map((ev) => (j.hooks[ev] || []).filter(H.isOurs).length);
const THEIRS = {
  version: 1,
  hooks: {
    afterFileEdit: [{ command: "./hooks/format.sh" }],
    beforeShellExecution: [{ command: "python3 ./hooks/guard.py", timeout: 5 }],
  },
  team: "kept",
};

test("into an empty home: hooks.json with one entry of ours on each of the five events, the script and its wrapper", () => {
  const h = home(),
    p = P(h);
  const r = H.install({ home: h, hookSource: SOURCE, exe: "/Applications/Cursor.app/Contents/MacOS/Cursor", platform: "darwin" });
  assert.deepEqual([r.ok, r.created, r.backup], [true, true, false]);
  const j = json(p.hooksFile);
  assert.equal(j.version, 1);
  assert.deepEqual(Object.keys(j.hooks), H.HOOK_EVENTS);
  for (const ev of H.HOOK_EVENTS) assert.deepEqual(j.hooks[ev], [{ command: "./sessionlens/hook.sh", timeout: H.TIMEOUT_S }], ev);
  assert.equal(fs.readFileSync(p.script, "utf8"), SOURCE);
  assert.equal(
    fs.readFileSync(p.wrapper, "utf8"),
    '#!/bin/sh\n# SessionLens: runs the Cursor hook (hook.js next to this file). Written by Record Cursor agent runs.\nELECTRON_RUN_AS_NODE=1 exec "/Applications/Cursor.app/Contents/MacOS/Cursor" "$(dirname "$0")/hook.js"\n',
  );
  if (process.platform !== "win32") assert.equal(fs.statSync(p.wrapper).mode & 0o111, 0o111, "executable");
  assert.equal(fs.existsSync(p.backup), false);
});

test("the person's own hooks are kept, the file before ours is saved, a second install adds nothing", () => {
  const h = home(),
    p = P(h);
  fs.mkdirSync(p.cursor, { recursive: true });
  const before = JSON.stringify(THEIRS, null, 2);
  fs.writeFileSync(p.hooksFile, before);
  const r = H.install({ home: h, hookSource: SOURCE, exe: "/usr/local/bin/node", platform: "linux" });
  assert.deepEqual([r.ok, r.created, r.backup], [true, false, true]);
  const j = json(p.hooksFile);
  assert.equal(j.team, "kept");
  assert.deepEqual(j.hooks.beforeShellExecution, THEIRS.hooks.beforeShellExecution);
  assert.deepEqual(j.hooks.afterFileEdit, [{ command: "./hooks/format.sh" }, { command: "./sessionlens/hook.sh", timeout: 10 }], "theirs first");
  assert.equal(fs.readFileSync(p.backup, "utf8"), before);
  // again: no second entry, and the saved file stays the one from before SessionLens
  assert.equal(H.install({ home: h, hookSource: SOURCE, exe: "/usr/local/bin/node", platform: "linux" }).backup, false);
  assert.deepEqual(ours(json(p.hooksFile)), [1, 1, 1, 1, 1]);
  assert.equal(fs.readFileSync(p.backup, "utf8"), before);
});

test("a hooks.json that is not a JSON object is left as it is, and nothing is installed", () => {
  for (const text of ["{ not json", "[]", '{"hooks": []}', '"text"']) {
    const h = home(),
      p = P(h);
    fs.mkdirSync(p.cursor, { recursive: true });
    fs.writeFileSync(p.hooksFile, text);
    const r = H.install({ home: h, hookSource: SOURCE, exe: "node", platform: "linux" });
    assert.equal(r.ok, false, text);
    assert.match(r.error, /hooks\.json/);
    assert.equal(fs.readFileSync(p.hooksFile, "utf8"), text);
    assert.equal(fs.existsSync(p.dir), false, "no script either");
    assert.equal(H.uninstall({ home: h, platform: "linux" }).ok, false);
    assert.equal(fs.readFileSync(p.hooksFile, "utf8"), text);
  }
  // a byte order mark is still JSON
  const h = home();
  fs.mkdirSync(P(h).cursor, { recursive: true });
  fs.writeFileSync(P(h).hooksFile, "\uFEFF" + JSON.stringify(THEIRS));
  assert.equal(H.install({ home: h, hookSource: SOURCE, exe: "node", platform: "linux" }).ok, true);
});

test("Stop recording takes out only ours; a file SessionLens made goes, one with the person's hooks stays", () => {
  const h = home(),
    p = P(h);
  H.install({ home: h, hookSource: SOURCE, exe: "node", platform: "linux" });
  assert.deepEqual(H.uninstall({ home: h, platform: "linux" }), { ok: true, removedFile: true, was: true });
  assert.equal(fs.existsSync(p.hooksFile), false);
  assert.deepEqual(H.uninstall({ home: h, platform: "linux" }), { ok: true, removedFile: false, was: false }, "nothing to stop");

  const h2 = home(),
    p2 = P(h2);
  fs.mkdirSync(p2.cursor, { recursive: true });
  fs.writeFileSync(p2.hooksFile, JSON.stringify(THEIRS));
  H.install({ home: h2, hookSource: SOURCE, exe: "node", platform: "linux" });
  assert.deepEqual(H.uninstall({ home: h2, platform: "linux" }), { ok: true, removedFile: false, was: true });
  assert.deepEqual(json(p2.hooksFile), THEIRS, "as it was before");
  // SessionLens made the file, then the person added a hook of their own to it: it stays, with theirs
  const h3 = home(),
    p3 = P(h3);
  H.install({ home: h3, hookSource: SOURCE, exe: "node", platform: "linux" });
  const j3 = json(p3.hooksFile);
  j3.hooks.stop.push({ command: "./hooks/notify.sh" });
  fs.writeFileSync(p3.hooksFile, JSON.stringify(j3));
  assert.deepEqual(H.uninstall({ home: h3, platform: "linux" }), { ok: true, removedFile: false, was: true });
  assert.deepEqual(json(p3.hooksFile), { version: 1, hooks: { stop: [{ command: "./hooks/notify.sh" }] } });
  // a hook of another tool whose path only ends like ours is not ours
  assert.equal(H.isOurs({ command: "~/tools/mysessionlens/hook.sh" }), false);
  assert.equal(H.isOurs({ command: ".\\sessionlens\\hook.cmd" }), true);
});

test("the copy of the hook follows the extension's version while recording is on; logs older than 30 days go", () => {
  const h = home(),
    p = P(h);
  assert.equal(H.refresh({ home: h, hookSource: SOURCE, exe: "node", platform: "linux" }), false, "not recording: nothing written");
  assert.equal(fs.existsSync(p.dir), false);
  H.install({ home: h, hookSource: "old", exe: "node", platform: "linux" });
  assert.equal(H.refresh({ home: h, hookSource: SOURCE, exe: "node", platform: "linux" }), true);
  assert.equal(fs.readFileSync(p.script, "utf8"), SOURCE);
  assert.equal(H.refresh({ home: h, hookSource: SOURCE, exe: "node", platform: "linux" }), false, "the same: not written again");
  assert.equal(H.refresh({ home: h, hookSource: SOURCE, exe: "/opt/node", platform: "linux" }), true, "another Cursor path");

  fs.mkdirSync(p.logDir, { recursive: true });
  const now = Date.now();
  const file = (n, days) => {
    const f = path.join(p.logDir, n);
    fs.writeFileSync(f, "{}\n");
    fs.utimesSync(f, (now - days * 86400000) / 1000, (now - days * 86400000) / 1000);
  };
  file("old.jsonl", 31);
  file("recent.jsonl", 29);
  file("notes.txt", 90);
  assert.equal(H.cleanLogs({ home: h, now, platform: "linux" }), 1);
  assert.deepEqual(fs.readdirSync(p.logDir).sort(), ["notes.txt", "recent.jsonl"]);
});

test("Windows: hook.cmd runs hook.js next to it with Cursor as Node; the command is relative to ~/.cursor", () => {
  const p = H.paths("C:\\Users\\me", "win32");
  assert.equal(p.command, ".\\sessionlens\\hook.cmd");
  assert.equal(
    H.wrapperText('C:\\Users\\me\\AppData\\Local\\Programs\\cursor\\Cur"sor.exe', "win32"),
    [
      "@echo off",
      "rem SessionLens: runs the Cursor hook (hook.js next to this file). Written by Record Cursor agent runs.",
      "set ELECTRON_RUN_AS_NODE=1",
      '"C:\\Users\\me\\AppData\\Local\\Programs\\cursor\\Cursor.exe" "%~dp0hook.js"',
      "",
    ].join("\r\n"),
  );
  // sh: a path with a quote, a dollar or a backquote stays one word
  assert.match(H.wrapperText('/A "b" $c `d`', "linux"), /exec "\/A \\"b\\" \\\$c \\`d\\`" /);
});

test(
  "as Cursor runs it (macOS, Linux): from ~/.cursor, the command hooks.json has, writes a log line and answers {}",
  { skip: process.platform === "win32" },
  () => {
    const h = home(),
      p = P(h);
    H.install({ home: h, hookSource: SOURCE, exe: process.execPath });
    const command = json(p.hooksFile).hooks.afterShellExecution[0].command;
    const event = { hook_event_name: "afterShellExecution", conversation_id: "c-1", command: "pytest -q", output: "1 failed, 1 passed in 0.1s" };
    const r = spawnSync("/bin/sh", ["-c", command], {
      cwd: p.cursor,
      input: JSON.stringify(event),
      env: Object.assign({}, process.env, { HOME: h }),
      encoding: "utf8",
    });
    assert.deepEqual([r.status, r.stdout], [0, "{}\n"], r.stderr);
    const line = JSON.parse(fs.readFileSync(path.join(p.logDir, "c-1.jsonl"), "utf8"));
    assert.deepEqual([line.event, line.command, line.output], ["shell", "pytest -q", "1 failed, 1 passed in 0.1s"]);
  },
);

// ---- the commands ----
async function cursorHost(opts = {}) {
  const f = fakeVscode({ appName: opts.appName || "Cursor", warningAnswer: opts.warningAnswer, infoAnswer: opts.infoAnswer, remoteName: opts.remoteName });
  const ext = loadExtension(f.vscode);
  const h = opts.home || home();
  ext._test.setHome(() => h);
  ext.activate(fakeContext());
  return Object.assign(f, { home: h, p: P(h), run: (id) => f.registered.commands[id]() });
}
const contextKey = (f) => f.calls.commands.filter((c) => c[0] === "setContext" && c[1] === "sessionlens.inCursor").map((c) => c[2]);

test("Record asks first: Record installs, Escape writes nothing; Reload Window reloads; Stop removes it", async () => {
  const no = await cursorHost({ warningAnswer: undefined });
  await no.run("sessionlens.recordCursorRuns");
  assert.equal(no.calls.warning.length, 1);
  assert.equal(no.calls.warning[0][1].modal, true);
  assert.match(no.calls.warning[0][1].detail, /hooks\.json.*hook\.sh.*log.*30 days/s);
  assert.equal(fs.existsSync(no.p.hooksFile), false);
  assert.equal(fs.existsSync(no.p.dir), false);

  const yes = await cursorHost({ warningAnswer: "Record", infoAnswer: "Reload Window" });
  assert.deepEqual(contextKey(yes), [true], "the commands are in the palette");
  await yes.run("sessionlens.recordCursorRuns");
  assert.deepEqual(ours(json(yes.p.hooksFile)), [1, 1, 1, 1, 1]);
  assert.equal(fs.readFileSync(yes.p.script, "utf8"), SOURCE);
  assert.match(fs.readFileSync(yes.p.wrapper, "utf8"), new RegExp(process.execPath.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")));
  assert.ok(yes.calls.commands.some((c) => c[0] === "workbench.action.reloadWindow"));
  // again: already on, no second question
  await yes.run("sessionlens.recordCursorRuns");
  assert.equal(yes.calls.warning.length, 1);
  assert.match(yes.calls.info.at(-1), /already recorded/);

  await yes.run("sessionlens.stopRecordingCursorRuns");
  assert.equal(fs.existsSync(yes.p.hooksFile), false);
  assert.match(yes.calls.info.at(-1), /recording stopped.*kept for import/);
  await yes.run("sessionlens.stopRecordingCursorRuns");
  assert.match(yes.calls.info.at(-1), /not recorded/);
});

test("not in Cursor the commands are hidden; in a remote window Record refuses; a bad hooks.json is an error", async () => {
  const vs = await cursorHost({ appName: "Visual Studio Code" });
  assert.deepEqual(contextKey(vs), [], "an unset key is false; activation in VS Code sets none");
  const remote = await cursorHost({ remoteName: "ssh-remote", warningAnswer: "Record" });
  await remote.run("sessionlens.recordCursorRuns");
  assert.match(remote.calls.warning[0][0], /local window only/);
  assert.equal(fs.existsSync(remote.p.hooksFile), false);

  const h = home();
  fs.mkdirSync(P(h).cursor, { recursive: true });
  fs.writeFileSync(P(h).hooksFile, "{ broken");
  const bad = await cursorHost({ home: h, warningAnswer: "Record" });
  await bad.run("sessionlens.recordCursorRuns");
  assert.match(bad.calls.error[0][0], /could not turn recording on: .*not valid JSON/);
  assert.equal(fs.readFileSync(P(h).hooksFile, "utf8"), "{ broken");
});

test("at each start in Cursor: an old copy of the hook is replaced while recording is on, old logs go", async () => {
  const h = home(),
    p = P(h);
  H.install({ home: h, hookSource: "// the hook of an older SessionLens", exe: process.execPath });
  fs.mkdirSync(p.logDir, { recursive: true });
  const old = path.join(p.logDir, "old.jsonl");
  fs.writeFileSync(old, "{}\n");
  const t = (Date.now() - 40 * 86400000) / 1000;
  fs.utimesSync(old, t, t);
  const f = await cursorHost({ home: h });
  assert.equal(fs.readFileSync(p.script, "utf8"), SOURCE);
  assert.equal(fs.existsSync(old), false);
  assert.ok(f.calls.output.some((l) => /cursor hook: updated to this version/.test(l)));
  // in VS Code nothing in ~/.cursor is touched
  H.install({ home: h, hookSource: "// older", exe: process.execPath });
  await cursorHost({ home: h, appName: "Visual Studio Code" });
  assert.equal(fs.readFileSync(p.script, "utf8"), "// older");
});
