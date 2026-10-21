"use strict";
/* The tokens of a session (0.1.130, Lens.usageOf): Claude Code's usage once per reply (the same usage is on every block
   of a reply), its cached input added back; Codex's last running total; a Cursor transcript's from the hook's log
   (readLog: its stop lines); none for a format that has none. The import keeps them on the session (usage), the
   session's tab shows them in its metrics with the details on hover, and an older session without them shows none. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { root, load } = require("./helpers");
const { bootHost, openPage } = require("./host-panel");
const { createStore } = require("../store.js");
const Hook = require(path.join(root, "media", "cursor-hook.js"));
const H = require(path.join(root, "cursor-hooks.js"));

const { Lens } = load();
const J = (o) => JSON.stringify(o);
// a Claude Code reply of two blocks, each line with the reply's usage
const reply = (id, usage, model = "claude-sonnet-5-5") => [
  J({ type: "assistant", requestId: "req-" + id, message: { id, model, role: "assistant", content: [{ type: "text", text: "Writing it." }], usage } }),
  J({
    type: "assistant",
    requestId: "req-" + id,
    message: { id, model, role: "assistant", content: [{ type: "tool_use", id: "t-" + id, name: "Read", input: { file_path: "/p/a.ts" } }], usage },
  }),
];
const CLAUDE = [
  J({ type: "user", cwd: "/p", message: { role: "user", content: "Write the cart tests" } }),
  ...reply("msg_1", { input_tokens: 10, cache_read_input_tokens: 9000, cache_creation_input_tokens: 1000, output_tokens: 300 }),
  ...reply("msg_2", { input_tokens: 5, cache_read_input_tokens: 9990, cache_creation_input_tokens: 5, output_tokens: 1700 }, "claude-opus-5-5"),
  J({
    type: "assistant",
    message: {
      id: "msg_3",
      model: "<synthetic>",
      role: "assistant",
      content: [{ type: "text", text: "No response requested." }],
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  }),
].join("\n");

test("Claude Code: each reply's usage once, the cached input added back; the models of the replies", () => {
  assert.deepEqual(Lens.usageOf(CLAUDE), {
    input: 10 + 9000 + 1000 + 5 + 9990 + 5,
    cached: 18990,
    cacheWrite: 1005,
    output: 2000,
    requests: 3,
    models: ["claude-sonnet-5-5", "claude-opus-5-5"],
  });
  assert.equal(Lens.usageOf(J({ type: "user", message: { role: "user", content: "hi" } })), null, "no usage at all");
});

test("Codex: the last running total and the models of its turns; the number of requests is not known", () => {
  const codex = [
    J({ type: "session_meta", payload: { id: "x", cwd: "/p" } }),
    J({ type: "turn_context", payload: { model: "gpt-6-luna" } }),
    J({
      type: "event_msg",
      payload: { type: "token_count", info: { total_token_usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 50 } } },
    }),
    J({ type: "turn_context", payload: { model: "gpt-5.6-sol" } }),
    J({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: { total_token_usage: { input_tokens: 3444051, cached_input_tokens: 3105920, cache_write_input_tokens: 0, output_tokens: 18404 } },
      },
    }),
    J({ type: "event_msg", payload: { type: "token_count", info: null } }),
  ].join("\n");
  assert.deepEqual(Lens.usageOf(codex), {
    input: 3444051,
    cached: 3105920,
    cacheWrite: 0,
    output: 18404,
    requests: null,
    models: ["gpt-6-luna", "gpt-5.6-sol"],
  });
});

test("Cursor: none in the transcript; the hook's stop lines give them; other formats have none", () => {
  const cursor = fs.readFileSync(path.join(__dirname, "fixtures", "cursor-hooks", "transcript.jsonl"), "utf8");
  assert.equal(Lens.usageOf(cursor), null);
  const h = fs.mkdtempSync(path.join(os.tmpdir(), "sl-usage-"));
  const id = "185d7b56-71d4-447b-940b-c5790e97d391";
  for (const e of fs
    .readFileSync(path.join(__dirname, "fixtures", "cursor-hooks", "events.jsonl"), "utf8")
    .trim()
    .split("\n"))
    Hook.handle(e, { env: { SESSIONLENS_HOOK_LOG: H.paths(h).logDir } });
  const usage = H.readLog({ home: h, id }).usage;
  assert.deepEqual(usage, { input: 121087, cached: 105984, cacheWrite: 0, output: 1154, requests: 1, models: ["grok-4.7"] });
  assert.deepEqual(Lens.usageOf(cursor, { cursorUsage: usage }), usage);
  assert.equal(Lens.usageOf("User: write the tests\nAssistant: done"), null, "plain text");
  // a Cursor CLI log (stream-json): its replies look like Claude Code's; a usage on one is not read until its meaning is known
  const cli = [
    J({ type: "system", subtype: "init", cwd: "/p" }),
    J({ type: "tool_call", subtype: "started", call_id: "c1", tool_call: { readToolCall: { args: { path: "/p/a.ts" } } } }),
    J({ type: "assistant", message: { id: "m1", role: "assistant", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 5, output_tokens: 7 } } }),
  ].join("\n");
  assert.equal(Lens.usageOf(cli), null);
  assert.equal(Lens.usageOf(J([{ uuid: "c", name: "x", chat_messages: [] }])), null, "a claude.ai export");
});

async function until(fn, ms = 8000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}
const click = (p, sel) => p.document.querySelector(sel).dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));

test("the import keeps them; the session's tab shows them, with the details on hover; an older session shows none", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-usage-store-"));
  const host = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
  });
  const sb = await openPage(host);
  await sb.ready();
  sb.document.querySelector("#paste").value = CLAUDE;
  sb.document.querySelector("#paste-name").value = "tokens";
  click(sb, "#paste-go");
  await until(() => sb.sent.some((m) => m.type === "session:put"));
  await sb.idle();
  const s = sb.sent.find((m) => m.type === "session:put").payload.session;
  assert.deepEqual([s.usage.input, s.usage.output, s.usage.requests], [20010, 2000, 3]);
  sb.close();

  const tab = await openPage(host, { sessionId: s.id });
  await tab.ready();
  const chip = [...tab.document.querySelectorAll("#metrics span[title]")].find((x) => /tokens/.test(x.textContent));
  assert.equal(chip.textContent, "tokens 20k in · 2k out");
  assert.equal(
    chip.getAttribute("title"),
    [
      "20,010 input tokens, 95% of them read from the cache",
      "1,005 written to the cache",
      "2,000 output tokens",
      "3 requests to the model",
      "model: claude-sonnet-5-5, claude-opus-5-5",
    ].join("\n"),
  );
  assert.deepEqual(tab.errors, []);
  tab.close();

  // a session imported before 0.1.130 has no usage: no tokens in its metrics
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  const old = Object.assign({}, (await st.get(s.id)).session, { id: "old-1" });
  delete old.usage;
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "sl-usage-old-"));
  const st2 = createStore({ dir: path.join(dir2, "sessions") });
  await st2.open();
  await st2.put(old, { analyzedGen: "" });
  const host2 = bootHost({
    storageDir: dir2,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
  });
  const t2 = await openPage(host2, { sessionId: "old-1" });
  await t2.ready();
  assert.match(t2.document.querySelector("#metrics").textContent, /reads/, "the metrics are there");
  assert.equal(/tokens/.test(t2.document.querySelector("#metrics").textContent), false);
  t2.close();
});

test("the Markdown report has a line with the tokens; none for a session without them", async () => {
  const at = new Date(2026, 9, 1, 12).toISOString();
  const md = async (usage) => {
    const s = {
      id: "md-" + (usage ? "u" : "n"),
      name: "tokens",
      task: "",
      profile: "qa-ts",
      created: at,
      events: [],
      findings: [],
      verdicts: {},
      spec: "",
      usage,
    };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-usage-md-"));
    const st = createStore({ dir: path.join(dir, "sessions") });
    await st.open();
    await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
    const h = bootHost({
      storageDir: dir,
      globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
    });
    const p = await openPage(h, { sessionId: s.id });
    await p.ready();
    click(p, "#export-md");
    let m = null;
    await until(() => (m = p.sent.find((x) => x.type === "save:file" && /\.md$/.test(x.payload.name))));
    p.close();
    return m.payload.content;
  };
  const withTokens = await md(Lens.usageOf(CLAUDE));
  assert.match(withTokens, /^Tokens: 20k in \(95% from the cache\), 2k out, 3 requests to the model\.$/m);
  assert.equal(/Tokens:/.test(await md(undefined)), false);
  // millions, and no number of requests (Codex)
  const codex = { input: 3444051, cached: 3105920, cacheWrite: 0, output: 18404, requests: null, models: ["gpt-6-luna"] };
  assert.match(await md(codex), /^Tokens: 3\.4M in \(90% from the cache\), 18k out\.$/m);
});
