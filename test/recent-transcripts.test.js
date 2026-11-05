"use strict";
/* The list of the newest transcripts that Choose file shows first (0.1.138). The files are made up in a temporary home, in
   the layouts found on the owner's machine on 5 Nov 2026: a transcript can be over 100 MB, Codex's first lines are its own,
   a Cursor chat has a folder of its own, a subagent's steps are in a folder under the session. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { recentTranscripts, whenText } = require("../recent-transcripts.js");
const { fakeVscode, loadExtension, fakeContext, fakeWebviewView } = require("./fake-vscode");

const ID1 = "11111111-1111-4111-8111-111111111111",
  ID2 = "22222222-2222-4222-8222-222222222222";
const home = () => fs.mkdtempSync(path.join(os.tmpdir(), "sl-recent-"));
function put(h, rel, lines, ageMin = 0) {
  const f = path.join(h, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  const t = new Date(Date.now() - ageMin * 60000);
  fs.utimesSync(f, t, t);
  return f;
}
const claudeUser = (content, extra) => ({ type: "user", cwd: "/work/shop-web", message: { role: "user", content }, ...extra });
const cursorUser = (text) => ({
  role: "user",
  message: { content: [{ type: "text", text: `<timestamp>Monday, Oct 5, 2026, 1:06 AM (UTC+5)</timestamp>\n<user_query>\n${text}\n</user_query>` }] },
});
const codexUser = (text) => ({ type: "response_item", payload: { type: "message", role: "user", content: [{ type: "input_text", text }] } });
const names = (list) => list.map((r) => path.basename(r.file));

test("Claude Code: the sessions, newest first, with the folder's name and the person's first message; no subagent's file", async () => {
  const h = home();
  put(h, `.claude/projects/-work-shop-web/${ID1}.jsonl`, [{ type: "queue-operation" }, claudeUser("Write tests for the cart")], 60);
  put(h, `.claude/projects/-work-billing/${ID2}.jsonl`, [claudeUser([{ type: "text", text: "Cover refunds" }], { cwd: "/work/billing/" })], 5);
  put(h, `.claude/projects/-work-shop-web/${ID1}/subagents/agent-a.jsonl`, [claudeUser("a subagent's task")], 1);
  put(h, `.claude/projects/-work-shop-web/agent-old.jsonl`, [claudeUser("an older subagent's file")], 1);
  const list = await recentTranscripts("claude", { home: h });
  assert.deepEqual(names(list), [`${ID2}.jsonl`, `${ID1}.jsonl`]);
  assert.deepEqual(
    list.map((r) => [r.project, r.task]),
    [
      ["billing", "Cover refunds"],
      ["shop-web", "Write tests for the cart"],
    ],
  );
});

test("Claude Code: what the editor adds to a turn is not the task, nor a skill's text or a subagent's record", async () => {
  const h = home();
  put(h, `.claude/projects/-w/${ID1}.jsonl`, [
    claudeUser("<command-name>/clear</command-name>"),
    claudeUser("Skill text", { isMeta: true }),
    claudeUser("From a sidechain", { isSidechain: true }),
    claudeUser([{ type: "text", text: '<system-reminder>be nice</system-reminder>\n<pasted_content id="1">\n  Fix\nthe   login\n</pasted_content>' }]),
  ]);
  const [r] = await recentTranscripts("claude", { home: h });
  assert.equal(r.task, "Fix the login");
});

test("Codex: rollout files in the date folders; its own wrapped messages are skipped; the folder comes from session_meta", async () => {
  const h = home();
  put(h, `.codex/sessions/2026/11/05/rollout-a.jsonl`, [
    { type: "session_meta", payload: { cwd: "/work/api" } },
    codexUser("<environment_context><cwd>/work/api</cwd></environment_context>"),
    codexUser("<external_codex_apps_open_page>{}</external_codex_apps_open_page>"),
    codexUser("Add API tests"),
  ]);
  put(h, `.codex/sessions/2026/11/05/other.jsonl`, [codexUser("not a rollout")]);
  const list = await recentTranscripts("codex", { home: h });
  assert.deepEqual(
    list.map((r) => [path.basename(r.file), r.project, r.task]),
    [["rollout-a.jsonl", "api", "Add API tests"]],
  );
});

test("Cursor: a chat in its folder or directly in agent-transcripts, no subagent's; the query without its wrapping", async () => {
  const h = home();
  const slug = h
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const p = `.cursor/projects/${slug}-Projects-shop-web/agent-transcripts`;
  put(h, `${p}/${ID1}/${ID1}.jsonl`, [cursorUser("Cover the search page")], 10);
  put(h, `${p}/${ID1}/subagents/${ID2}.jsonl`, [cursorUser("subagent")], 1);
  put(h, `${p}/old.jsonl`, [cursorUser("A flat one")], 20);
  put(h, `.cursor/projects/Other-place/agent-transcripts/${ID2}/${ID2}.jsonl`, [cursorUser("Elsewhere")], 30);
  const list = await recentTranscripts("cursor", { home: h });
  assert.deepEqual(
    list.map((r) => [r.project, r.task]),
    [
      ["Projects-shop-web", "Cover the search page"],
      ["Projects-shop-web", "A flat one"],
      ["Other-place", "Elsewhere"],
    ],
  );
});

test("Cursor: an open workspace is called by its own name, since the folder's name cannot show where a name starts", async () => {
  const h = home();
  put(h, `.cursor/projects/work-shop-web/agent-transcripts/${ID1}/${ID1}.jsonl`, [cursorUser("x")]);
  const [r] = await recentTranscripts("cursor", { home: h, workspaces: ["/other", "/work/shop-web"] });
  assert.equal(r.project, "shop-web");
});

test("only the start of a file is read, and a long first line does not break the list", async () => {
  const h = home();
  const big = put(h, `.claude/projects/-w/${ID1}.jsonl`, [claudeUser("Early"), JSON.stringify({ type: "x", pad: "y".repeat(400 * 1024) }), claudeUser("Late")]);
  const reads = [];
  const open = fs.promises.open;
  fs.promises.open = async (...a) => {
    const fh = await open(...a);
    const read = fh.read.bind(fh);
    fh.read = (b, o, n, p) => (reads.push(n), read(b, o, n, p));
    return fh;
  };
  try {
    const [r] = await recentTranscripts("claude", { home: h });
    assert.equal(r.task, "Early");
  } finally {
    fs.promises.open = open;
  }
  assert.ok(fs.statSync(big).size > 400 * 1024);
  assert.deepEqual(reads, [256 * 1024]);
  // no complete line in the part that is read: still listed, without a task
  put(h, `.claude/projects/-w/${ID1}.jsonl`, [JSON.stringify({ type: "x", pad: "y".repeat(400 * 1024) }), claudeUser("Late")]);
  const [r2] = await recentTranscripts("claude", { home: h });
  assert.equal(r2.task, "");
  assert.equal(r2.project, "w");
});

test("the text is one plain line of at most 120 characters, and $(…) cannot draw an icon", async () => {
  const h = home();
  put(h, `.claude/projects/-w/${ID1}.jsonl`, [claudeUser(`$(alert) line one\n\u001b[31mred\u001b[0m\ttab ${"z".repeat(300)}`, { cwd: "/w/$(x)bad" })]);
  const [r] = await recentTranscripts("claude", { home: h });
  assert.equal(r.task.length, 120);
  assert.match(r.task, /^\$ \(alert\) line one \[31mred \[0m tab z+$/);
  assert.equal(r.project, "$ (x)bad");
});

test("at most `limit`, the newest; empty, unreadable and bad files do no harm; no folder or Somewhere else is an empty list", async () => {
  const h = home();
  for (let i = 0; i < 5; i++) put(h, `.claude/projects/-w/s${i}.jsonl`, [claudeUser("t" + i)], i);
  assert.deepEqual(names(await recentTranscripts("claude", { home: h, limit: 2 })), ["s0.jsonl", "s1.jsonl"]);
  fs.writeFileSync(path.join(h, ".claude/projects/-w/empty.jsonl"), "");
  put(h, `.claude/projects/-w/bad.jsonl`, ["{not json", "[1,2]", "null"], 0);
  const all = names(await recentTranscripts("claude", { home: h }));
  assert.ok(!all.includes("empty.jsonl"));
  assert.ok(all.includes("bad.jsonl"));
  assert.deepEqual(await recentTranscripts("codex", { home: h }), []);
  assert.deepEqual(await recentTranscripts("cursor", { home: h }), []);
  assert.deepEqual(await recentTranscripts(undefined, { home: h }), []);
  assert.deepEqual(await recentTranscripts("constructor", { home: h }), []);
});

test("when: minutes, today, yesterday, a date, a date of another year", () => {
  const now = new Date(2026, 10, 5, 19, 30).getTime();
  const at = (...a) => new Date(...a).getTime();
  assert.equal(whenText(now - 20000, now), "just now");
  assert.equal(whenText(now - 60000, now), "1 minute ago");
  assert.equal(whenText(now - 59 * 60000, now), "59 minutes ago");
  assert.equal(whenText(at(2026, 10, 5, 9, 5), now), "today, 09:05");
  assert.equal(whenText(at(2026, 10, 4, 18, 40), now), "yesterday, 18:40");
  assert.equal(whenText(at(2026, 10, 3, 16, 22), now), "3 Nov, 16:22");
  assert.equal(whenText(at(2025, 11, 31, 8, 0), now), "31 Dec 2025, 08:00");
  // the first of a month: yesterday is in the month before
  assert.equal(whenText(at(2026, 9, 31, 23, 0), at(2026, 10, 1, 10, 0)), "yesterday, 23:00");
});

// the host: what Choose file does with the list
async function pick(h, source, quickPickAnswer) {
  const env = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = h;
  process.env.USERPROFILE = h;
  try {
    const { vscode, registered, calls } = fakeVscode({
      quickPickAnswer,
      openDialogAnswer: [{ scheme: "file", fsPath: path.join(h, "browsed.jsonl"), toString: () => "file://browsed" }],
    });
    loadExtension(vscode).activate(fakeContext({ globalState: { settings: {}, sessions: {} } }));
    const wv = fakeWebviewView();
    registered.views.sessionlensView.resolveWebviewView(wv.view);
    const reply = await wv.send("open:transcript", source ? { source } : {});
    return { reply, calls };
  } finally {
    for (const k of Object.keys(env))
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
  }
}

test("host: a picked row is read, with no file dialog; the list says project, time and task, and can be filtered by them", async () => {
  const h = home();
  const f = put(h, `.claude/projects/-work-shop/${ID1}.jsonl`, [claudeUser("Write tests")], 5);
  const { reply, calls } = await pick(h, "claude", (items) => items[0]);
  assert.equal(calls.openDialog.length, 0);
  assert.equal(reply.name, `${ID1}.jsonl`);
  assert.equal(reply.text, fs.readFileSync(f, "utf8"));
  const { items, o } = calls.quickPick[0];
  assert.equal(o.title, "Claude Code: recent transcripts");
  assert.equal(o.matchOnDescription && o.matchOnDetail, true);
  assert.deepEqual([items[0].label, items[0].description, items[0].detail], ["shop-web", "5 minutes ago", "Write tests"]);
  assert.equal(items.at(-1).alwaysShow, true);
  assert.match(items.at(-1).label, /Browse…/);
});

test("host: Browse… opens the file dialog at that source's folder; Escape reads nothing and opens nothing", async () => {
  const h = home();
  put(h, `.cursor/projects/w/agent-transcripts/${ID1}/${ID1}.jsonl`, [cursorUser("x")]);
  fs.writeFileSync(path.join(h, "browsed.jsonl"), "browsed text");
  const b = await pick(h, "cursor", (items) => items.at(-1));
  assert.equal(b.calls.openDialog[0].defaultUri.fsPath, path.join(h, ".cursor", "projects"));
  assert.equal(b.reply.text, "browsed text");
  const e = await pick(h, "cursor", () => undefined);
  assert.equal(e.reply, null);
  assert.equal(e.calls.openDialog.length, 0);
});

test("host: no transcripts, or Somewhere else: the file dialog straight away, as before", async () => {
  const h = home();
  fs.writeFileSync(path.join(h, "browsed.jsonl"), "browsed text");
  const none = await pick(h, "codex", () => assert.fail("no list"));
  assert.equal(none.calls.quickPick.length, 0);
  assert.equal(none.calls.openDialog.length, 1);
  put(h, `.claude/projects/-w/${ID1}.jsonl`, [claudeUser("x")]);
  const other = await pick(h, undefined, () => assert.fail("no list"));
  assert.equal(other.calls.quickPick.length, 0);
  assert.equal(other.calls.openDialog[0].defaultUri.fsPath, h);
});

test("host: the Output channel has the count and the time, nothing from the transcript", async () => {
  const h = home();
  put(h, `.claude/projects/-w/${ID1}.jsonl`, [claudeUser("SECRET-TASK-TEXT")]);
  const { calls } = await pick(h, "claude", () => undefined);
  const log = calls.output.join("\n");
  assert.match(log, /recent transcripts: 1 in \d+ ms/);
  assert.equal(log.includes("SECRET-TASK-TEXT"), false);
});
