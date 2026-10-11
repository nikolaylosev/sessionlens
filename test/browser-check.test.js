"use strict";
/* browser_check_not_in_test (0.1.125): the agent looked at the page through a browser MCP (Claude in Chrome, Playwright
   MCP, Chrome DevTools MCP, Puppeteer) after its last change of a test file, and changed no test after that. What must
   not count, from the owner's sessions of 8 Oct 2026: looking at the site before writing the tests, and looking while
   finding out why a test failed, then changing the test. Nor tab housekeeping, other MCP servers, or a session that
   wrote no test. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");
const CHROME = (t) => "mcp__claude-in-chrome__" + t;
const SPEC = "e2e/search.spec.ts";
const PW =
  "import { test, expect } from '@playwright/test';\ntest('closes', async ({ page }) => {\n  await expect(page.getByRole('dialog')).toBeHidden();\n});\n";

// steps: "look:<tool>" (a browser MCP call), "tool:<name>" (any other tool, as named), "sh:<command>" (a shell command
// that runs no tests), "write:<file>", "edit:<file>", "run:<passed>/<failed>", "say:<text>"
function events(...steps) {
  return steps.map((s, seq) => {
    const [kind, arg] = s.split(/:(.*)/s);
    if (kind === "look") return { seq, kind: "tool", tool: arg.includes("__") ? arg : CHROME(arg) };
    if (kind === "tool") return { seq, kind: "tool", tool: arg };
    if (kind === "sh") return { seq, kind: "run_other", cmd: arg };
    if (kind === "write" || kind === "edit") return { seq, kind, file: arg, new_content: PW };
    if (kind === "run") {
      const [passed, failed] = arg.split("/").map(Number);
      return { seq, kind: "run_tests", cmd: "npx playwright test", tests: { passed, failed, errors: 0, failed_names: [] }, exit_code: failed ? 1 : 0 };
    }
    return { seq, kind: "message", text: arg };
  });
}
const found = (ev, c = cfg) => Lens.runChecks(ev, c).filter((f) => f.check === "browser_check_not_in_test");

test("looked at the page after the last test change and changed no test: one medium finding at the first look", () => {
  const f = found(events("write:" + SPEC, "run:1/0", "look:navigate", "look:computer", "look:get_page_text", "say:Looks right, the dialog closes."));
  assert.deepEqual(
    f.map((x) => [x.severity, x.seq, x.message]),
    [["medium", 2, "Checked the page in the browser 3 times after the last test change (seq 2–4); no test asserts what it saw"]],
  );
  assert.deepEqual(
    found(events("write:" + SPEC, "look:read_page")).map((x) => x.message),
    ["Checked the page in the browser after the last test change (seq 1); no test asserts what it saw"],
  );
});

test("not counted: looking before the tests, looking while triaging a failure and then changing the test", () => {
  // the owner's first session: explore the site, write the tests, run them
  assert.deepEqual(found(events("look:navigate", "look:read_page", "look:find", "write:" + SPEC, "run:2/0", "say:All pass.")), []);
  // the owner's second session: a red run, a look at the page, the test changed and run again
  assert.deepEqual(found(events("write:" + SPEC, "run:1/1", "look:javascript_tool", "look:computer", "edit:" + SPEC, "run:2/0")), []);
  // a look at the page, then the test changed: what it saw is in the test
  assert.deepEqual(found(events("write:" + SPEC, "look:computer", "edit:" + SPEC)), []);
});

test("not counted: tab housekeeping, other MCP servers, and a session that wrote no test", () => {
  assert.deepEqual(
    found(events("write:" + SPEC, "run:1/0", "look:tabs_context_mcp", "look:tabs_close_mcp", "look:resize_window", "look:mcp__playwright__browser_close")),
    [],
  );
  assert.deepEqual(found(events("write:" + SPEC, "look:mcp__github__create_issue", "look:mcp__filesystem__read_file", "tool:ToolSearch")), []);
  assert.deepEqual(found(events("look:navigate", "look:get_page_text", "say:The page works.")), [], "no test written: other checks");
  // a file that is not a test does not settle it
  assert.equal(found(events("write:" + SPEC, "look:computer", "write:README.md")).length, 1);
});

test("the browser MCP servers people use, with and without the mcp__ prefix", () => {
  for (const tool of [
    "mcp__claude-in-chrome__computer",
    "mcp__playwright__browser_snapshot",
    "mcp__playwright__browser_click",
    "mcp__chrome-devtools__take_snapshot",
    "mcp__puppeteer__puppeteer_screenshot",
    "mcp__browsermcp__browser_navigate",
    "playwright__browser_evaluate",
  ])
    assert.equal(found(events("write:" + SPEC, "look:" + tool)).length, 1, tool);
});

test("from a Claude Code transcript, in every profile", () => {
  const rec = (o) => JSON.stringify(o);
  const use = (id, name, input) => rec({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } });
  const done = (id) => rec({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } });
  const text = [
    rec({ type: "user", cwd: "/w", message: { role: "user", content: "Write the search tests" } }),
    use("w", "Write", { file_path: "/w/" + SPEC, content: PW }),
    done("w"),
    use("b", CHROME("computer"), { action: "screenshot" }),
    done("b"),
    rec({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "The dialog closes, done." }] } }),
  ].join("\n");
  const ev = Lens.importAny(text, cfg);
  assert.equal(found(ev).length, 1);
  for (const p of Lens.PROFILES) assert.ok(Lens.profile(p).checks.includes("browser_check_not_in_test"), p);
});

/* Cursor (0.1.125): a transcript writes an MCP call as CallDynamicTool {namespace, toolName}, an Agent CLI log as
   mcpToolCall {serverIdentifier, toolName}. Until this version a transcript's step was "CallDynamicTool" and a log's
   the bare tool name, so this check never saw a browser in a Cursor session. The servers are the ones of the owner's
   sessions of 5 and 11 Oct 2026: Microsoft's Playwright MCP as Cursor's plugin, and executeautomation's as a server
   of the person's own. */
const cursorTranscript = (...calls) => {
  const line = (role, content) => JSON.stringify({ role, message: { content } });
  return [
    line("user", [{ type: "text", text: "<user_query>Rewrite the search tests</user_query>" }]),
    line("assistant", [{ type: "tool_use", name: "Write", input: { path: "/w/shop/" + SPEC, contents: PW } }]),
    ...calls.map(([namespace, toolName]) => line("assistant", [{ type: "tool_use", name: "CallDynamicTool", input: { namespace, toolName, arguments: {} } }])),
    line("assistant", [{ type: "text", text: "Done." }]),
  ].join("\n");
};
const tools = (ev) => ev.filter((e) => e.kind === "tool").map((e) => e.tool);

test("a Cursor transcript: CallDynamicTool of a browser server is a look; Cursor's own tools keep their names", () => {
  const ev = Lens.importAny(
    cursorTranscript(["user-playwright", "playwright_evaluate"], ["cursor", "TodoWrite"], ["user-playwright", "playwright_close"]),
    cfg,
  );
  assert.deepEqual(tools(ev), ["mcp__user-playwright__playwright_evaluate", "TodoWrite", "mcp__user-playwright__playwright_close"]);
  assert.deepEqual(
    found(ev).map((f) => f.message),
    ["Checked the page in the browser after the last test change (seq 2); no test asserts what it saw"],
  );
  // closing the browser, Cursor's own tools, another server: no look
  assert.deepEqual(found(Lens.importAny(cursorTranscript(["user-playwright", "playwright_close"], ["cursor", "ReadLints"]), cfg)), []);
  assert.deepEqual(found(Lens.importAny(cursorTranscript(["user-github", "create_issue"]), cfg)), []);
  assert.equal(found(Lens.importAny(cursorTranscript(["plugin-playwright-playwright", "browser_snapshot"]), cfg)).length, 1);
  // a call without a tool name stays as it was
  assert.deepEqual(tools(Lens.importAny(cursorTranscript(["user-playwright", ""]), cfg)), ["CallDynamicTool"]);
});

test("a Cursor Agent CLI log: mcpToolCall names its server, or its name does", () => {
  const log = (args) =>
    [
      { type: "system", subtype: "init", cwd: "/w/shop" },
      { type: "user", message: { role: "user", content: [{ type: "text", text: "Rewrite the search tests" }] } },
      {
        type: "tool_call",
        subtype: "completed",
        call_id: "e",
        tool_call: { editToolCall: { args: { path: "/w/shop/" + SPEC }, result: { success: { path: "/w/shop/" + SPEC, afterFullFileContent: PW } } } },
      },
      { type: "tool_call", subtype: "completed", call_id: "m", tool_call: { mcpToolCall: { args, result: { success: { content: [] } } } } },
    ]
      .map((l) => JSON.stringify(l))
      .join("\n");
  const as = (args) => Lens.importAny(log(args), cfg);
  const server = { name: "plugin-playwright-playwright-browser_snapshot", toolName: "browser_snapshot", serverIdentifier: "plugin-playwright-playwright" };
  assert.deepEqual(tools(as(server)), ["mcp__plugin-playwright-playwright__browser_snapshot"]);
  assert.equal(found(as(server)).length, 1);
  assert.deepEqual(tools(as({ name: "plugin-playwright-playwright-browser_click", toolName: "browser_click" })), [
    "mcp__plugin-playwright-playwright__browser_click",
  ]);
  // no server anywhere: the tool's name, as before, and no look
  assert.deepEqual(tools(as({ name: "browser_click", toolName: "browser_click" })), ["browser_click"]);
  assert.deepEqual(found(as({ name: "browser_click", toolName: "browser_click" })), []);
});

test("Import again for a Cursor session imported before 0.1.125 that wrote a test and called an MCP server", () => {
  const text = cursorTranscript(["user-playwright", "playwright_click"]);
  const s = { profile: "qa-ts", importGen: 5, source_text: text, events: Lens.importAny(text, cfg) };
  assert.equal(Lens.needsReimport(s), true);
  assert.equal(Lens.needsReimport(Object.assign({}, s, { importGen: Lens.IMPORT_GEN })), false, "imported with this version");
  // only Cursor's own tools, or no test written: nothing would change
  const own = cursorTranscript(["cursor", "TodoWrite"]);
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 5, source_text: own, events: Lens.importAny(own, cfg) }), false);
  assert.equal(Lens.needsReimport(Object.assign({}, s, { events: s.events.filter((e) => e.kind !== "write") })), false);
  // without the kept text: a CallDynamicTool step of the old import
  const old = s.events.map((e) => (e.kind === "tool" ? Object.assign({}, e, { tool: "CallDynamicTool" }) : e));
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 5, source_text: "", events: old }), true);
});

/* A script of the agent's own (0.1.125): the owner's Cursor session of 11 Oct 2026 looked at the site through
   `node << 'EOF' … chromium.launch() … page.goto(…)` 12 times, all before it wrote the tests. */
const NODE_LOOK = `PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" node << 'EOF'
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://shop.example/', { waitUntil: 'domcontentloaded' });
  console.log(await page.getByRole('dialog').isVisible());
  await browser.close();
})();
EOF`;
const PY_LOOK = `python3 - <<'EOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    page = p.chromium.launch().new_page()
    page.goto("https://shop.example/")
    print(page.title())
EOF`;

test("a look through a script: Node or Python that launches a browser and opens a page", () => {
  assert.deepEqual(
    found(events("write:" + SPEC, "run:1/0", "sh:" + NODE_LOOK)).map((f) => f.message),
    ["Checked the page in the browser after the last test change (seq 2); no test asserts what it saw"],
  );
  assert.equal(found(events("write:" + SPEC, "sh:" + PY_LOOK)).length, 1, "Python");
  // a site that blocks bots, probed after the last test change (the owner's session of 4 Oct 2026): after cd and timeout
  const probe = `cd ~/shop-e2e && timeout 20 node -e "
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const r = await page.goto('https://shop.example/', { waitUntil: 'domcontentloaded' });
  console.log('status', r.status());
  await browser.close();
})();
" 2>&1`;
  assert.equal(found(events("write:" + SPEC, "sh:" + probe)).length, 1, "after cd, timeout");
  assert.equal(
    found(
      events(
        "write:" + SPEC,
        "sh:node -e \"const puppeteer=require('puppeteer');puppeteer.launch().then(async b=>{const g=await b.newPage();await g.goto('https://shop.example/')})\"",
      ),
    ).length,
    1,
    "Puppeteer",
  );
  // a script and an MCP call: one finding that counts both
  assert.deepEqual(
    found(events("write:" + SPEC, "sh:" + NODE_LOOK, "look:computer")).map((f) => f.message),
    ["Checked the page in the browser 2 times after the last test change (seq 1–2); no test asserts what it saw"],
  );
});

test("not a look through a script: before the tests, a search for the words, a launch with no page, no runner", () => {
  // the owner's session: the scripts came before the tests
  assert.deepEqual(found(events("sh:" + NODE_LOOK, "sh:" + NODE_LOOK, "write:" + SPEC, "run:6/0")), []);
  assert.deepEqual(found(events("write:" + SPEC, 'sh:rg -n "chromium.launch\\(|page.goto\\(" tests')), [], "a search");
  assert.deepEqual(found(events("write:" + SPEC, "sh:node -e \"require('playwright').chromium.launch().then((b) => b.close())\"")), [], "no page opened");
  assert.deepEqual(found(events("write:" + SPEC, "sh:cat probe.js # chromium.launch() then page.goto(url)")), [], "no runner");
  // a screenshot of a local file, and a script that only writes the Node code into a file (how this test got here)
  const local = `node -e "const { chromium } = require('playwright'); chromium.launch().then(async (b) => (await b.newPage()).goto('file:///tmp/mock.html'))"`;
  assert.deepEqual(found(events("write:" + SPEC, "sh:" + local)), [], "a local file");
  const writer = "python3 - <<'PY'\nopen('test/probe.test.js', 'w').write(r'''const NODE_LOOK = `" + NODE_LOOK + "`;''')\nPY";
  assert.deepEqual(found(events("write:" + SPEC, "sh:" + writer)), [], "code written, not run");
  // a script that changes the test after looking settles it, as an MCP look does
  assert.deepEqual(found(events("write:" + SPEC, "sh:" + NODE_LOOK, "edit:" + SPEC)), []);
});

test("a look through a script, from a Cursor transcript and a Claude Code transcript", () => {
  const line = (role, content) => JSON.stringify({ role, message: { content } });
  const cursor = [
    line("user", [{ type: "text", text: "<user_query>Rewrite the search tests</user_query>" }]),
    line("assistant", [{ type: "tool_use", name: "Write", input: { path: "/w/shop/" + SPEC, contents: PW } }]),
    line("assistant", [{ type: "tool_use", name: "Shell", input: { command: NODE_LOOK, description: "Probe the dialog" } }]),
  ].join("\n");
  assert.equal(found(Lens.importAny(cursor, cfg)).length, 1, "Cursor");
  const rec = (o) => JSON.stringify(o);
  const use = (id, name, input) => rec({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } });
  const claude = [
    rec({ type: "user", cwd: "/w", message: { role: "user", content: "Write the search tests" } }),
    use("w", "Write", { file_path: "/w/" + SPEC, content: PW }),
    use("b", "Bash", { command: PY_LOOK }),
  ].join("\n");
  assert.equal(found(Lens.importAny(claude, cfg)).length, 1, "Claude Code");
});
