"use strict";
/* The developer's log (0.1.141): while sessionlens.devLog is on, what the person does in SessionLens and what it does in
   reply go to ~/.sessionlens/dev/<day>-<editor>.jsonl, so the owner can hand a run over by its file instead of retelling
   it. The module (devlog.js) on its own, then the host under the fake "vscode" (the setting, the commands, the status
   bar, the requests to a model), then the real panel (its events, and nothing sent while the log is off). Made-up
   content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const DevLog = require("../devlog.js");
const { fakeVscode, loadExtension, fakeContext, fakeWebviewView } = require("./fake-vscode");
const { bootHost, openPage } = require("./host-panel");
const { makeFixture } = require("../perf/fixtures");
const PKG = require("../package.json");

const KEY = "sk-ant-" + "LEAKCHECK".padEnd(30, "x");
const leaks = (x) => /LEAKCHECK/.test(typeof x === "string" ? x : JSON.stringify(x));
const lines = (file) =>
  fs.existsSync(file)
    ? fs
        .readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
const day = (ms) => {
  const d = new Date(ms),
    p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), name));
async function until(fn, ms = 5000) {
  for (const t = Date.now(); !fn();) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
}

test("devlog.js: one JSON line per event, secrets masked, key fields dropped, long strings cut", async () => {
  const dir = tmp("sl-dev-");
  const at = new Date(2026, 10, 27, 12).getTime();
  const log = DevLog.createDevLog({ dir, editor: "Cursor", win: "w1", now: () => at, redact: (s) => s.replace(/sk-ant-\S+/g, "[REDACTED]") });
  assert.equal(log.file(), path.join(dir, "2026-11-27-cursor.jsonl"));
  log.write("model", {
    user: "key " + KEY,
    apiKey: KEY,
    nested: { password: "x", authorization: "y", keep: 1, list: ["a", KEY] },
    big: "x".repeat(DevLog.MAX_FIELD + 10),
    fn: () => 1,
    nothing: undefined,
  });
  log.write("note", { text: "second" });
  await log.flush();
  const [a, b] = lines(log.file());
  assert.deepEqual(Object.keys(a).slice(0, 3), ["t", "win", "kind"]);
  assert.equal(a.t, new Date(at).toISOString());
  assert.equal(a.win, "w1");
  assert.equal(a.kind, "model");
  assert.equal(a.user, "key [REDACTED]");
  assert.deepEqual(a.nested, { keep: 1, list: ["a", "[REDACTED]"] });
  assert.ok(!("apiKey" in a) && !("fn" in a) && !("nothing" in a));
  assert.equal(a.big.length, DevLog.MAX_FIELD + `… [cut: ${DevLog.MAX_FIELD + 10} characters in all]`.length);
  assert.ok(a.big.endsWith(`… [cut: ${DevLog.MAX_FIELD + 10} characters in all]`));
  assert.equal(b.text, "second", "in the order written");
  assert.equal(leaks(fs.readFileSync(log.file(), "utf8")), false);
});

test("devlog.js: a day's file stops at its limit with one line that says so; the next day starts again", async () => {
  const dir = tmp("sl-dev-");
  let at = new Date(2026, 10, 27, 23).getTime();
  const log = DevLog.createDevLog({ dir, editor: "vscode", now: () => at, maxDayBytes: 400 });
  for (let i = 0; i < 10; i++) log.write("host", { text: "line " + i + " " + "x".repeat(60) });
  await log.flush();
  const got = lines(log.file());
  assert.ok(got.length >= 2 && got.length < 10, String(got.length));
  assert.equal(got[got.length - 1].kind, "cap");
  assert.match(got[got.length - 1].text, /reached 400 bytes/);
  assert.equal(got.filter((l) => l.kind === "cap").length, 1);
  at += 2 * 3600 * 1000;
  log.write("host", { text: "the next day" });
  await log.flush();
  assert.deepEqual(
    lines(log.file()).map((l) => l.text),
    ["the next day"],
  );
});

test("devlog.js: files of days before the last 14 are removed, anything else in the folder is kept", () => {
  const dir = tmp("sl-dev-");
  const at = new Date(2026, 10, 27, 9).getTime();
  const ago = (n) => day(at - n * 86400000);
  for (const n of [`${ago(20)}-vscode.jsonl`, `${ago(14)}-cursor.jsonl`, `${ago(13)}-vscode.jsonl`, `${ago(0)}-vscode.jsonl`, "notes.txt"])
    fs.writeFileSync(path.join(dir, n), "{}\n");
  const log = DevLog.createDevLog({ dir, now: () => at });
  assert.equal(log.clean(), 2);
  assert.deepEqual(fs.readdirSync(dir).sort(), [`${ago(0)}-vscode.jsonl`, `${ago(13)}-vscode.jsonl`, "notes.txt"].sort());
  assert.equal(DevLog.createDevLog({ dir: path.join(dir, "none") }).clean(), 0, "no folder yet");
});

// the host alone: a sidebar view under the fake "vscode", the log's folder in a temporary home
function boot(opts = {}) {
  const home = tmp("sl-devhome-");
  const { vscode, registered, calls, config, setConfig } = fakeVscode(opts);
  const ext = loadExtension(vscode);
  ext._test.setDevHome(() => home);
  const context = fakeContext({
    globalState: Object.assign({ settings: { profile: "qa-ts", provider: "anthropic", apiKey: KEY, keys: { anthropic: KEY } } }, opts.globalState),
  });
  ext.activate(context);
  const wv = fakeWebviewView();
  registered.views.sessionlensView.resolveWebviewView(wv.view);
  const dir = path.join(home, ".sessionlens", "dev");
  const file = () => {
    const d = ext._test.dev();
    return d.log ? d.log.file() : path.join(dir, fs.existsSync(dir) ? fs.readdirSync(dir)[0] || "none" : "none");
  };
  const read = async () => {
    const d = ext._test.dev();
    if (d.log) await d.log.flush();
    return lines(file());
  };
  return { ext, context, wv, registered, calls, config, setConfig, home, dir, file, read, cmd: (id, ...a) => registered.commands["sessionlens." + id](...a) };
}

test("off by default: no file, no status bar item, a page's events are dropped", async () => {
  const h = boot();
  assert.equal(await h.wv.send("dev:event", { kind: "view", data: { tab: "calib" } }), true);
  assert.equal(fs.existsSync(h.dir), false);
  assert.deepEqual(h.calls.statusItems, []);
  assert.ok(!/data-dev-log/.test(h.wv.webview.html));
  assert.equal(PKG.contributes.configuration.properties["sessionlens.devLog"].default, false);
  // a workspace's settings cannot turn it on
  assert.equal(PKG.contributes.configuration.properties["sessionlens.devLog"].scope, "application");
});

test("Start dev log: the setting, the status bar, the start line without keys, and every page told", async () => {
  const h = boot();
  await h.cmd("devLogStart");
  assert.deepEqual(h.calls.configUpdates.at(-1), ["sessionlens.devLog", true, 1]);
  const item = h.calls.statusItems[0];
  assert.ok(item && item.visible);
  assert.equal(item.command, "sessionlens.devLogMenu");
  assert.match(item.text, /SessionLens dev log/);
  assert.ok(
    h.wv.posted.some((m) => m.__slDev && m.on === true),
    "the open page starts sending",
  );
  // a page opened now starts with it on
  const later = fakeWebviewView();
  h.registered.views.sessionlensView.resolveWebviewView(later.view);
  assert.match(later.webview.html, /<body [^>]*data-dev-log/);
  assert.match(h.calls.info.at(-1), /the dev log is on\. .* go to .*\.sessionlens\/dev\/\d{4}-\d{2}-\d{2}-vscode\.jsonl, on this computer only/);
  await h.wv.send("storage:get", { keys: ["settings"] }); // the migrations have run
  const start = (await h.read()).find((l) => l.kind === "start");
  assert.equal(start.why, "command");
  assert.equal(start.version, PKG.version);
  assert.equal(start.platform, process.platform);
  assert.equal(start.settings.profile, "qa-ts");
  assert.ok(!("apiKey" in start.settings) && !("keys" in start.settings));
  assert.equal(leaks(fs.readFileSync(h.file(), "utf8")), false);
  // twice: already on, one start line
  await h.cmd("devLogStart");
  assert.match(h.calls.info.at(-1), /already on/);
  assert.equal((await h.read()).filter((l) => l.kind === "start").length, 1);
});

test("a page's events: written with the page they came from; unknown kinds and non-objects are refused", async () => {
  const h = boot();
  await h.cmd("devLogStart");
  assert.equal(await h.wv.send("dev:event", { kind: "verdict", data: { session: "s1", fkey: "a@1@m", after: { v: "fp" } } }), true);
  const bad = await h.wv.send("dev:event", { kind: "shell", data: {} });
  assert.match(bad.error, /unknown dev log event/);
  assert.match((await h.wv.send("dev:event", { kind: "view", data: [1] })).error, /data must be an object/);
  const got = await h.read();
  const v = got.find((l) => l.kind === "verdict");
  assert.deepEqual([v.page, v.session, v.fkey, v.after.v], ["sidebar", "s1", "a@1@m", "fp"]);
  assert.ok(!got.some((l) => l.kind === "shell"));
  // the refusal is an Output channel line, and so a line of the log too
  assert.ok(got.some((l) => l.kind === "host" && /^refused dev:event: unknown dev log event/.test(l.text)));
});

test("a model request and its answer, with how long it took; the page's address is left out", async () => {
  const s = await new Promise((r) => {
    const srv = http.createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ choices: [{ message: { content: '{"skill_name":"x"}' } }] }));
      });
    });
    srv.listen(0, "127.0.0.1", () => r(srv));
  });
  try {
    const h = boot({ globalState: { hostBaseUrls: { local: `http://127.0.0.1:${s.address().port}/v1` } } });
    await h.cmd("devLogStart");
    const r = await h.wv.send("ai:call", {
      provider: "local",
      model: "l",
      system: "You write skills.",
      user: "# Rules",
      maxTokens: 8000,
      schema: { type: "object" },
      baseUrl: "http://x.invalid",
    });
    assert.deepEqual(r, { text: '{"skill_name":"x"}' });
    const m = (await h.read()).find((l) => l.kind === "model");
    assert.deepEqual(
      [m.page, m.provider, m.model, m.system, m.user, m.maxTokens, m.schema, m.text],
      ["sidebar", "local", "l", "You write skills.", "# Rules", 8000, true, '{"skill_name":"x"}'],
    );
    assert.equal(typeof m.ms, "number");
    assert.ok(!("baseUrl" in m));
    // an error is logged as the page got it
    s.close();
    await h.wv.send("ai:call", { provider: "local", model: "l", system: "s", user: "u" });
    const e = (await h.read()).filter((l) => l.kind === "model")[1];
    assert.ok(e.error && typeof e.error.message === "string" && !("text" in e), JSON.stringify(e));
  } finally {
    s.close();
  }
});

test("a change of settings: only what changed, without keys", async () => {
  const h = boot();
  await h.cmd("devLogStart");
  await h.wv.send("storage:get", { keys: ["settings"] });
  await h.wv.send("storage:set", { values: { settings: { profile: "qa-python", provider: "anthropic", apiKey: KEY } } });
  await h.wv.send("storage:set", { values: { settings: { profile: "qa-python", provider: "anthropic" } } }); // nothing changed
  await h.wv.send("storage:set", { values: { ruleOverrides: { raw_locator: "off" }, calibLog: [] } });
  const st = (await h.read()).filter((l) => l.kind === "storage");
  assert.deepEqual(
    st.map((l) => [l.keys, l.settings, l.ruleOverrides]),
    [
      [["settings"], { profile: "qa-python" }, undefined],
      [["ruleOverrides", "calibLog"], undefined, { raw_locator: "off" }],
    ],
  );
  assert.equal(leaks(fs.readFileSync(h.file(), "utf8")), false);
});

test("Note for review: the text, the session in front and the last verdict; off, it offers to start", async () => {
  const h = boot({ inputBoxAnswer: (o) => (/About DD-011/.test(o.prompt) ? "  raw_locator is wrong here: a role exists  " : "no session") });
  await h.cmd("devLogNote"); // off: the question, no answer
  assert.match(h.calls.info.at(-1), /the dev log is off\. A note goes into it\./);
  assert.equal(fs.existsSync(h.dir), false);
  await h.cmd("devLogStart");
  await h.wv.send("dev:event", { kind: "view", data: { tab: "review", session: "s1", name: "DD-011" } });
  await h.wv.send("dev:event", { kind: "verdict", data: { session: "s1", fkey: "k", after: { v: "ok" } } });
  await h.cmd("devLogNote");
  const n = (await h.read()).find((l) => l.kind === "note");
  assert.equal(n.text, "raw_locator is wrong here: a role exists");
  assert.deepEqual([n.view.session, n.view.name, n.view.page, n.lastVerdict.fkey], ["s1", "DD-011", "sidebar", "k"]);
  assert.match(h.calls.info.at(-1), /noted in .*\.jsonl/);
  assert.ok(h.calls.inputBox.at(-1).validateInput("x".repeat(5001)));
});

test("the status bar's menu; Open folder and today's log; Stop: the setting, the item hidden, nothing more written", async () => {
  const picks = [];
  const h = boot({
    quickPickAnswer: (items) => {
      picks.push(items.map((i) => i.label.replace(/^\$\([^)]+\) /, "")));
      return items.find((i) => /Stop dev log/.test(i.label));
    },
  });
  await h.cmd("devLogStart");
  await h.cmd("devLogOpenFolder");
  assert.deepEqual(h.calls.openExternal, [h.dir]);
  await h.ext._test.dev().log.flush();
  await h.registered.commands["sessionlens.devLogMenu"]();
  assert.deepEqual(picks[0], ["Note for review…", "Open today's log", "Open dev log folder", "Stop dev log"]);
  assert.deepEqual(h.calls.configUpdates.at(-1), ["sessionlens.devLog", false, 1]);
  assert.equal(h.calls.statusItems[0].visible, false);
  assert.ok(h.wv.posted.some((m) => m.__slDev && m.on === false));
  await h.wv.send("dev:event", { kind: "view", data: { tab: "rules" } });
  await new Promise((r) => setTimeout(r, 20));
  const got = lines(h.file());
  assert.equal(got.at(-1).kind, "stop");
  assert.ok(!got.some((l) => l.kind === "view"));
  assert.match(h.calls.info.at(-1), /the dev log is off\. Its files stay in .* for 14 days/);
});

test("Open today's log opens the file in the editor", async () => {
  const h = boot();
  await h.cmd("devLogStart");
  await h.registered.commands["sessionlens.devLogMenu"](); // no pick: nothing
  const quick = boot({ quickPickAnswer: (items) => items.find((i) => /Open today's log/.test(i.label)) });
  await quick.cmd("devLogStart");
  await quick.registered.commands["sessionlens.devLogMenu"]();
  const open = quick.calls.commands.find((c) => c[0] === "vscode.open");
  assert.equal(open[1].fsPath, quick.file());
  assert.ok(fs.existsSync(quick.file()), "written before it is opened");
});

test("the setting on at the start of a window, and changed by hand; a setting that cannot be written keeps this window's pick", async () => {
  const home = tmp("sl-devhome-");
  const host = bootHost({ vscode: { config: { global: { "sessionlens.devLog": true } } }, beforeActivate: (ext) => ext._test.setDevHome(() => home) });
  const d = host.ext._test.dev();
  assert.ok(d.log, "on from the start");
  await d.log.flush();
  const file = d.log.file();
  assert.equal(lines(file)[0].why, "start of the window");
  const log = d.log;
  host.setConfig("sessionlens.devLog", false);
  assert.equal(d.log, null);
  await log.flush();
  assert.equal(lines(file).at(-1).why, "setting");
  // a .vsix installed into an open window cannot write its new setting yet: the command still works here
  const h = boot({ configFails: true });
  await h.cmd("devLogStart");
  assert.ok(h.ext._test.dev().log);
  assert.ok(h.calls.statusItems[0].visible);
  assert.ok((await h.read()).some((l) => l.kind === "host" && /could not write the setting sessionlens\.devLog/.test(l.text)));
});

test("in the real panel: a tab's view, the analysis and a verdict go to the log; with the log off the page sends nothing", async () => {
  const FX = makeFixture({ n: 2, bytes: 8 * 1024, seed: 5 });
  const state = () => JSON.parse(JSON.stringify(Object.assign({ sessions: FX.sessions }, FX.storage)));
  const id = Object.keys(FX.sessions)[0];
  // off: not one dev:event
  const off = bootHost({ globalState: state() });
  const quiet = await openPage(off, { sessionId: id });
  await quiet.ready();
  quiet.document.querySelector("#findings .f .v-fp").dispatchEvent(new quiet.window.MouseEvent("click", { bubbles: true }));
  await quiet.idle();
  assert.ok(quiet.sent.some((m) => m.type === "session:put"));
  // the bridge holds back what any code of the page would send
  assert.equal(await quiet.window.__slDevLog("view", { tab: "calib" }), false);
  assert.ok(!quiet.sent.some((m) => m.type === "dev:event"));
  quiet.close();

  const home = tmp("sl-devhome-");
  const host = bootHost({
    globalState: state(),
    vscode: { config: { global: { "sessionlens.devLog": true } } },
    beforeActivate: (ext) => ext._test.setDevHome(() => home),
  });
  const tab = await openPage(host, { sessionId: id });
  await tab.ready();
  assert.equal(tab.window.SL_DEV_LOG, true);
  // a finding with no verdict yet, and then one that has one
  const row = [...tab.document.querySelectorAll("#findings .f")].find((x) => !x.classList.contains("done"));
  const done = tab.document.querySelector("#findings .f.done");
  row.querySelector(".note").value = "a role exists";
  row.querySelector(".v-fp").dispatchEvent(new tab.window.MouseEvent("click", { bubbles: true }));
  await tab.idle();
  const doneKey = done.dataset.k;
  tab.document
    .querySelector(`#findings .f[data-k="${doneKey.replace(/["\\]/g, "\\$&")}"] .v-later`)
    .dispatchEvent(new tab.window.MouseEvent("click", { bubbles: true }));
  await tab.idle();
  // an error of the page itself
  tab.window.dispatchEvent(new tab.window.ErrorEvent("error", { message: "boom", filename: "app.js", lineno: 7 }));
  await tab.idle();
  const d = host.ext._test.dev();
  await until(() => d.log && fs.existsSync(d.log.file()) && lines(d.log.file()).some((l) => l.kind === "error"));
  await d.log.flush();
  const got = lines(d.log.file());
  const view = got.find((l) => l.kind === "view");
  assert.deepEqual([view.page, view.tab, view.session], ["tab", "review", id]);
  const [v, v2] = got.filter((l) => l.kind === "verdict");
  assert.deepEqual([v2.fkey, v2.before.v, v2.after.v], [doneKey, "ok", "later"]);
  assert.equal(v.session, id);
  assert.equal(v.fkey, row.dataset.k);
  assert.equal(v.before, null);
  assert.deepEqual([v.after.v, v.after.note], ["fp", "a role exists"]);
  assert.equal(`${v.finding.check}@${v.finding.seq}@${v.finding.message.slice(0, 40)}`, row.dataset.k);
  const e = got.find((l) => l.kind === "error");
  assert.deepEqual([e.page, e.message, e.source, e.line], ["tab", "boom", "app.js", 7]);
  assert.deepEqual(tab.errors, ["boom"]);
  // Stop from the palette: the page stops sending
  await host.registered.commands["sessionlens.devLogStop"]();
  await tab.idle();
  assert.equal(tab.window.SL_DEV_LOG, false);
  const before = tab.sent.filter((m) => m.type === "dev:event").length;
  tab.document.querySelector("#findings .f .v-ok").dispatchEvent(new tab.window.MouseEvent("click", { bubbles: true }));
  await tab.idle();
  assert.equal(tab.sent.filter((m) => m.type === "dev:event").length, before);
  tab.close();
});

test("in the real panel: an import of a file and the analysis of what came of it", async () => {
  const T = (n) => `2026-11-27T09:${String(n).padStart(2, "0")}:00.000Z`;
  const rec = (n, role, content) => JSON.stringify({ type: role, timestamp: T(n), cwd: "/p", message: { role, content } });
  const text = [
    rec(1, "user", "Write the tour test"),
    rec(2, "assistant", [
      { type: "tool_use", id: "w1", name: "Write", input: { file_path: "/p/e2e/tour.spec.ts", content: "await page.waitForTimeout(3000);\n" } },
    ]),
    rec(3, "user", [{ type: "tool_result", tool_use_id: "w1", content: "ok" }]),
    rec(4, "assistant", [{ type: "text", text: "Done." }]),
  ].join("\n");
  const home = tmp("sl-devhome-");
  const file = path.join(tmp("sl-devtr-"), "tour.jsonl");
  fs.writeFileSync(file, text);
  const host = bootHost({
    storageDir: tmp("sl-devst-"),
    globalState: {
      storageVersion: 2,
      settings: { profile: "qa-ts", transcriptSource: "claude", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null },
    },
    vscode: { config: { global: { "sessionlens.devLog": true } }, openDialogAnswer: [{ scheme: "file", fsPath: file, toString: () => "file://" + file }] },
    beforeActivate: (ext) => ext._test.setDevHome(() => home),
  });
  const sb = await openPage(host);
  await sb.ready();
  sb.document.querySelector("#file").dispatchEvent(new sb.window.MouseEvent("click", { bubbles: true }));
  await until(() => !sb.document.querySelector("#name-row").hidden);
  sb.document.querySelector("#name-input").value = "DD-011";
  sb.document.querySelector("#name-go").click();
  const d = host.ext._test.dev();
  await until(() => fs.existsSync(d.log.file()) && lines(d.log.file()).some((l) => l.kind === "import"));
  await sb.idle();
  await d.log.flush();
  const got = lines(d.log.file());
  const imp = got.find((l) => l.kind === "import");
  assert.deepEqual(
    [imp.page, imp.file, imp.chars, imp.profile, imp.agent, imp.conversations, imp.kept, imp.sessions.length, imp.sessions[0].name],
    ["sidebar", "DD-011", text.length, "qa-ts", "claude-code", 1, true, 1, "DD-011"],
  );
  const an = got.find((l) => l.kind === "analyze" && l.session === imp.sessions[0].session);
  assert.deepEqual([an.event, an.profile, an.findings, an.events], ["import", "qa-ts", imp.sessions[0].findings, imp.sessions[0].events]);
  assert.ok(an.findings > 0 && an.checks.sleep_or_skip_added === 1, JSON.stringify(an.checks));
  assert.equal(
    Object.values(an.severity).reduce((a, b) => a + b, 0),
    an.findings,
  );
  assert.equal(typeof an.ms, "number");
  // the tab that opened is the sidebar's view line, then the import's
  assert.ok(got.some((l) => l.kind === "view" && l.tab === "sessions"));
  assert.deepEqual(sb.errors, []);
  sb.close();
});

test("in the real panel: Generate skill, Compress, Import verdicts and Import again say what came of them", async () => {
  const { load } = require("./helpers");
  const { createStore } = require("../store.js");
  const { Lens } = load();
  const at = new Date(2026, 10, 27, 12).toISOString();
  const f = { check: "raw_locator", severity: "low", seq: 4, message: "e2e/tour.spec.ts:1 — raw locator", source: "lint" };
  const f2 = { ...f, seq: 6, message: "e2e/tour.spec.ts:2 — raw locator" };
  const T = (n) => `2026-11-27T09:${String(n).padStart(2, "0")}:00.000Z`;
  const rec = (n, role, content) => JSON.stringify({ type: role, timestamp: T(n), cwd: "/p", message: { role, content } });
  const text = [rec(1, "user", "Write the tour test"), rec(2, "assistant", [{ type: "text", text: "Done." }])].join("\n");
  const s = {
    id: "dv1",
    name: "tour",
    profile: "qa-ts",
    created: at,
    events: Lens.importAny(text, Lens.profile("qa-ts")),
    source_text: text,
    importGen: 1,
    findings: [f, f2],
    verdicts: { [Lens.fkey(f)]: { v: "ok", note: "", at }, [Lens.fkey(f2)]: { v: "ok", note: "", at } },
    spec: "",
  };
  const dir = tmp("sl-devst-");
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
  const home = tmp("sl-devhome-");
  const host = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
    vscode: { config: { global: { "sessionlens.devLog": true } } },
    beforeActivate: (ext) => ext._test.setDevHome(() => home),
  });
  const d = host.ext._test.dev();
  const logged = async (kind) => {
    await until(() => fs.existsSync(d.log.file()) && lines(d.log.file()).some((l) => l.kind === kind));
    await d.log.flush();
    return lines(d.log.file()).filter((l) => l.kind === kind);
  };
  const p = await openPage(host);
  await p.ready();
  p.window.LensAI.missingKey = () => null;
  p.window.LensAI.generateSkill = async () => ({
    skill_name: "tour-tests",
    files: [
      { path: "SKILL.md", content: "---\nname: tour-tests\n---\n\n## Rules\n\n- P-01 — Role locators.\n" },
      { path: "references/rules.md", content: "## P-01: Role locators\n\n**Bad:** `page.locator('#a')`\n" },
    ],
    raw: "",
  });
  p.window.LensAI.compressRules = async () => ({ markdown: "# Rules\n\n- short\n", raw: "" });
  p.document.querySelector('.tab[data-view="calib"]').dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  await p.idle();
  p.document.querySelector("#gen-skill").click();
  const [skill] = await logged("skill");
  assert.deepEqual(
    [skill.page, skill.update, skill.name, skill.rules, skill.sessions, skill.wrote, skill.check.stats.files],
    ["sidebar", false, "tour-tests", ["raw_locator"], 1, ["SKILL.md", "references/rules.md"], 2],
  );
  assert.ok(skill.files.some((x) => x.path === "skill-history/reviews.md" && x.chars > 0));
  assert.ok(Array.isArray(skill.check.issues));
  p.document.querySelector("#compress-rules").click();
  const [comp] = await logged("compress");
  assert.deepEqual([comp.target, comp.result, comp.overwrite], ["CLAUDE.md", "# Rules\n\n- short\n".length, false]);
  assert.ok(comp.chars > 0);
  // a file of verdicts: one for a finding of the session (already decided: kept), one for a session there is not
  const input = p.document.querySelector("#import-file");
  const rows = [
    { check: "raw_locator", message: f.message, session: "tour", verdict: "fp" },
    { check: "magic_number", message: "x", session: "elsewhere", verdict: "ok" },
  ];
  Object.defineProperty(input, "files", { value: [new p.window.File([JSON.stringify(rows)], "verdicts.json")], configurable: true });
  input.dispatchEvent(new p.window.Event("change"));
  const [iv] = await logged("import-verdicts");
  assert.deepEqual([iv.rows, iv.merged, iv.external, iv.duplicates], [2, 0, 1, 0]);
  p.close();
  // Import again, in the session's tab, from the text kept at import
  const tab = await openPage(host, { sessionId: "dv1" });
  await tab.ready();
  tab.document.querySelector("#reimport-go").click();
  const [re] = await logged("reimport");
  assert.deepEqual([re.page, re.session, re.fromFile, re.lost, re.before.importGen, re.after.importGen], ["tab", "dv1", false, 0, 1, Lens.IMPORT_GEN]);
  assert.equal(re.before.events, s.events.length);
  assert.deepEqual([...p.errors, ...tab.errors], []);
  tab.close();
});
