"use strict";
/* The tokens of a session (0.1.130, Lens.usageOf): Claude Code's usage once per reply (the same usage is on every block
   of a reply), its cached input added back; Codex's last running total; a Cursor transcript's from the hook's log
   (readLog: its stop lines); none for a format that has none; and the same per model. The import keeps them on the
   session (usage), the session's tab shows them in its metrics with the details on hover, and an older session
   without them shows none. The cost (Lens.usageCost) with the person's own prices (sessionlens.tokenPrices, read only:
   the page never writes them), only when every model of the session has one. */
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
    byModel: {
      "claude-sonnet-5-5": { input: 10010, cached: 9000, cacheWrite: 1000, output: 300 },
      "claude-opus-5-5": { input: 10000, cached: 9990, cacheWrite: 5, output: 1700 },
    },
  });
  assert.equal(Lens.usageOf(J({ type: "user", message: { role: "user", content: "hi" } })), null, "no usage at all");
});

test("Codex: the last running total and the models of its turns; the number of requests is not known", () => {
  const codex = [
    J({ type: "session_meta", payload: { id: "x", cwd: "/p" } }),
    J({ type: "turn_context", payload: { model: "gpt-6-luna" } }),
    J({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 50 },
          last_token_usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 50 },
        },
      },
    }),
    // the same total again (a new rate limit): no request
    J({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 50 },
          last_token_usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 50 },
        },
      },
    }),
    J({ type: "turn_context", payload: { model: "gpt-5.6-sol" } }),
    J({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { input_tokens: 3444051, cached_input_tokens: 3105920, cache_write_input_tokens: 0, output_tokens: 18404 },
          last_token_usage: { input_tokens: 3443051, cached_input_tokens: 3105120, cache_write_input_tokens: 0, output_tokens: 18354 },
        },
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
    byModel: {
      "gpt-6-luna": { input: 1000, cached: 800, cacheWrite: 0, output: 50 },
      "gpt-5.6-sol": { input: 3443051, cached: 3105120, cacheWrite: 0, output: 18354 },
    },
    limits: null,
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
  assert.deepEqual(usage, {
    input: 121087,
    cached: 105984,
    cacheWrite: 0,
    output: 1154,
    requests: 1,
    models: ["grok-4.7"],
    byModel: { "grok-4.7": { input: 121087, cached: 105984, cacheWrite: 0, output: 1154 } },
  });
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
      "Cost: put your prices per million tokens in sessionlens.tokenPrices (settings.json)",
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
  assert.equal(/cost/.test(t2.document.querySelector("#metrics").textContent), false, "no prices: no cost either");
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

// ---- the cost ----
const PRICES = {
  "claude-sonnet-*": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-opus-5-5": { input: 5, output: 25 },
};
// sonnet: 10 fresh × 3 + 9000 cached × 0.3 + 1000 written × 3.75 + 300 out × 15 = 10 980; opus (no cache prices: the
// input's): 10000 × 5 + 1700 × 25 = 92 500 → 103 480 per million
const COST = 0.10348;

test("usageCost: the cache's own prices or the input's, a prefix with * (the longest wins), no case; none without every model", () => {
  const u = Lens.usageOf(CLAUDE);
  assert.ok(Math.abs(Lens.usageCost(u, PRICES).cost - COST) < 1e-12);
  assert.deepEqual([Lens.usageCost(u, PRICES).missing, Lens.usageCost(u, PRICES).labels], [[], []]);
  // the longest prefix, whatever the order; a name in any case, on either side
  const longer = { "claude-sonnet-*": PRICES["claude-sonnet-*"], "claude-*": { input: 1000, output: 1000 }, "CLAUDE-OPUS-5-5": PRICES["claude-opus-5-5"] };
  assert.ok(Math.abs(Lens.usageCost(u, longer).cost - COST) < 1e-12, "claude-sonnet-* over claude-*, the name in any case");
  const mixed = { byModel: { "Claude-Opus-5-5": u.byModel["claude-opus-5-5"] } };
  assert.ok(Math.abs(Lens.usageCost(mixed, PRICES).cost - 0.0925) < 1e-12, "the model's name in another case");
  assert.deepEqual(Lens.usageCost(u, { "claude-sonnet-*": PRICES["claude-sonnet-*"] }), { cost: null, missing: ["claude-opus-5-5"], labels: [] });
  // a reply that names no model has no price
  assert.deepEqual(Lens.usageCost({ byModel: { "": { input: 10, cached: 0, cacheWrite: 0, output: 5 } } }, PRICES), { cost: null, missing: [""], labels: [] });
  // "*" alone is every model, that one too
  assert.deepEqual(Lens.usageCost({ byModel: { "": { input: 1e6, cached: 0, cacheWrite: 0, output: 0 } } }, { "*": { input: 2, output: 4 } }), {
    cost: 2,
    missing: [],
    labels: [],
  });
  assert.equal(Lens.usageCost({ input: 10, output: 5 }, PRICES), null, "no tokens per model: a session imported before");
});

test("normPrices: what is no price, or no model name, is left out", () => {
  assert.deepEqual(
    Lens.normPrices({
      "ok-model": { input: 1, output: 2, cacheRead: 0.1, extra: 5 },
      "no-output": { input: 1 },
      "text-price": { input: "1", output: 2 },
      negative: { input: -1, output: 2 },
      huge: { input: 1, output: 1e9 },
      " ": { input: 1, output: 2 },
      "bad\u0001name": { input: 1, output: 2 },
      " spaced * ": { input: 1, output: 2, cacheWrite: "x" },
    }),
    { "ok-model": { input: 1, output: 2, cacheRead: 0.1 }, "spaced *": { input: 1, output: 2 } },
  );
  for (const x of [null, [], "x", 5]) assert.deepEqual(Lens.normPrices(x), {});
});

test("the host gives the page the setting's prices, cleaned, and never keeps them from the page", async () => {
  const { fakeVscode, loadExtension, fakeContext, fakeWebviewView } = require("./fake-vscode");
  const f = fakeVscode({ config: { global: { "sessionlens.tokenPrices": Object.assign({ broken: { input: "x" } }, PRICES) } } });
  const ext = loadExtension(f.vscode);
  const ctx = fakeContext();
  ext.activate(ctx);
  const wv = fakeWebviewView();
  f.registered.views.sessionlensView.resolveWebviewView(wv.view);
  const got = await wv.send("storage:get", { keys: ["settings"] });
  assert.deepEqual(got.settings.tokenPrices, PRICES);
  await wv.send("storage:set", { values: { settings: { profile: "qa-ts", tokenPrices: { "page-model": { input: 1, output: 1 } } } } });
  assert.equal(ctx.globalState.get("settings").tokenPrices, undefined, "not kept in the extension's storage");
  assert.equal(
    f.calls.configUpdates.some((c) => c[0] === "sessionlens.tokenPrices"),
    false,
    "not written to the setting",
  );
});

test("with the person's prices the tab and the report show the cost; a model without a price shows none and says which", async () => {
  const at = new Date(2026, 9, 1, 12).toISOString();
  const open = async (prices) => {
    const s = {
      id: "cost-1",
      name: "cost",
      task: "",
      profile: "qa-ts",
      created: at,
      events: [],
      findings: [],
      verdicts: {},
      spec: "",
      usage: Lens.usageOf(CLAUDE),
    };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-usage-cost-"));
    const st = createStore({ dir: path.join(dir, "sessions") });
    await st.open();
    await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
    const h = bootHost({
      storageDir: dir,
      globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
      vscode: { config: { global: { "sessionlens.tokenPrices": prices } } },
    });
    const p = await openPage(h, { sessionId: s.id });
    await p.ready();
    const chip = [...p.document.querySelectorAll("#metrics span[title]")].find((x) => /^cost/.test(x.textContent));
    click(p, "#export-md");
    let m = null;
    await until(() => (m = p.sent.find((x) => x.type === "save:file" && /\.md$/.test(x.payload.name))));
    const tokens = [...p.document.querySelectorAll("#metrics span[title]")].find((x) => /^tokens/.test(x.textContent));
    p.close();
    return { chip, md: m.payload.content, tokensTip: tokens.getAttribute("title") };
  };
  const all = await open(PRICES);
  assert.equal(all.chip.textContent, "cost ≈ 0.10");
  assert.equal(all.chip.getAttribute("title"), "With your prices per million tokens (sessionlens.tokenPrices), in their money");
  assert.match(all.md, /^Cost: ≈ 0\.10, with your prices per million tokens\.$/m);
  assert.equal(/sessionlens\.tokenPrices/.test(all.tokensTip), false, "prices set: no hint on the tokens");
  const part = await open({ "claude-sonnet-*": PRICES["claude-sonnet-*"] });
  assert.equal(part.chip.textContent, "cost —");
  assert.equal(part.chip.getAttribute("title"), "No price for: claude-opus-5-5. Add it to sessionlens.tokenPrices in settings.json");
  assert.equal(/^Cost:/m.test(part.md), false, "a part of the cost is not the cost");
  // less than a hundredth
  const tiny = await open({ "claude-*": { input: 0.001, output: 0.001 } });
  assert.equal(tiny.chip.textContent, "cost ≈ <0.01");
});

// ---- on a subscription ----
test("a label on the prices goes with the cost: what the session would have cost through the API", async () => {
  const api = {
    "claude-sonnet-*": Object.assign({ label: "API equivalent" }, PRICES["claude-sonnet-*"]),
    "claude-opus-5-5": Object.assign({ label: "API equivalent" }, PRICES["claude-opus-5-5"]),
  };
  assert.deepEqual(Lens.normPrices({ m: { input: 1, output: 2, label: "  API equivalent " } }), { m: { input: 1, output: 2, label: "API equivalent" } });
  assert.deepEqual(Lens.normPrices({ m: { input: 1, output: 2, label: "x".repeat(41) }, n: { input: 1, output: 2, label: "a\u0001b" } }), {
    m: { input: 1, output: 2 },
    n: { input: 1, output: 2 },
  });
  assert.deepEqual(Lens.usageCost(Lens.usageOf(CLAUDE), api).labels, ["API equivalent"], "once for two models");
  const at = new Date(2026, 9, 1, 12).toISOString();
  const s = {
    id: "lbl-1",
    name: "cost",
    task: "",
    profile: "qa-ts",
    created: at,
    events: [],
    findings: [],
    verdicts: {},
    spec: "",
    usage: Lens.usageOf(CLAUDE),
  };
  const { chip, md } = await openWith(s, api, /^cost/);
  assert.equal(chip.textContent, "cost ≈ 0.10 (API equivalent)");
  assert.match(md, /^Cost: ≈ 0\.10 \(API equivalent\), with your prices per million tokens\.$/m);
});

const rl = (p, s, plan = "team") => ({
  limit_id: "codex",
  primary: p && { used_percent: p[0], window_minutes: 300, resets_at: p[1] },
  secondary: s && { used_percent: s[0], window_minutes: 10080, resets_at: s[1] },
  plan_type: plan,
});
const codexWith = (limits) =>
  [
    J({ type: "session_meta", payload: { id: "x", cwd: "/p" } }),
    J({ type: "turn_context", payload: { model: "gpt-6-luna" } }),
    ...limits.map((r, i) =>
      J({
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: { input_tokens: 1000 * (i + 1), output_tokens: 10 * (i + 1) },
            last_token_usage: { input_tokens: 1000, output_tokens: 10 },
          },
          rate_limits: r,
        },
      }),
    ),
  ].join("\n");

test("Codex on a subscription: the share of each limit window the session used, also over windows that reset", () => {
  // one window each: from the first record to the last; resets_at moving a second is the same window
  assert.deepEqual(Lens.usageOf(codexWith([rl([0, 1000], [0, 9000]), rl([5, 1001], [1, 9001]), rl([12, 1001], [2, 9001])])).limits, {
    plan: "team",
    windows: [
      { minutes: 300, used: 12, spans: 1, from: 0, to: 12 },
      { minutes: 10080, used: 2, spans: 1, from: 0, to: 2 },
    ],
  });
  // the 5-hour window reset twice while it ran: 40 → 90 in the first, 0 → 30 and 0 → 7 in the next ones
  const long = Lens.usageOf(codexWith([rl([40, 1000]), rl([90, 1000]), rl([30, 19000]), rl([7, 37000])])).limits;
  assert.deepEqual(long.windows, [{ minutes: 300, used: 87, spans: 3, from: 40, to: 7 }]);
  assert.equal(Lens.usageOf(codexWith([])), null, "no rate limits, no tokens either: none");
});

async function openWith(s, prices, chipRx) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-usage-sub-"));
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
  const h = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
    vscode: prices ? { config: { global: { "sessionlens.tokenPrices": prices } } } : {},
  });
  const p = await openPage(h, { sessionId: s.id });
  await p.ready();
  const chip = [...p.document.querySelectorAll("#metrics span[title]")].find((x) => chipRx.test(x.textContent));
  click(p, "#export-md");
  let m = null;
  await until(() => (m = p.sent.find((x) => x.type === "save:file" && /\.md$/.test(x.payload.name))));
  p.close();
  return { chip, md: m.payload.content };
}

test("the tab and the report show the limits a Codex session used, with the plan", async () => {
  const at = new Date(2026, 9, 1, 12).toISOString();
  const usage = Lens.usageOf(codexWith([rl([0, 1000], [0, 9000]), rl([12, 1001], [2, 9001])]));
  const s = { id: "lim-1", name: "limits", task: "", profile: "qa-ts", created: at, events: [], findings: [], verdicts: {}, spec: "", usage };
  const { chip, md } = await openWith(s, null, /^limits/);
  assert.equal(chip.textContent, "limits +12% 5 h · +2% week");
  assert.equal(
    chip.getAttribute("title"),
    [
      "The share of the subscription's limits used while this session ran (Codex, team plan):",
      "5 h window: +12% (0% → 12%)",
      "week window: +2% (0% → 2%)",
      "Other sessions running at the same time count too.",
    ].join("\n"),
  );
  assert.match(md, /^Subscription limits used: \+12% 5 h, \+2% week \(Codex, team plan\)\.$/m);
  const long = Lens.usageOf(codexWith([rl([40, 1000]), rl([90, 1000]), rl([30, 19000]), rl([7, 37000])]));
  const l2 = await openWith(Object.assign({}, s, { id: "lim-2", usage: long }), null, /^limits/);
  assert.equal(l2.chip.textContent, "limits +87% 5 h (3 windows)");
  assert.match(l2.chip.getAttribute("title"), /5 h windows: 87% of a window in all, over 3 windows that reset while it ran/);
});
