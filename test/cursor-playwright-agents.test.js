"use strict";
/* Playwright's test agents in a Cursor session (0.1.130). Cursor keeps an MCP call's own arguments one level down:
   CallDynamicTool {namespace, toolName, arguments} in a transcript, mcpToolCall {name, args} in an Agent CLI log. The
   import read the call itself, so the generator's write had no file and no code (no check saw the test), a run had no
   file list and the planner had no plan. Now the arguments of Playwright's test agents are read, as in a Claude Code
   session; another MCP tool's input stays as it was. A Cursor session imported before with such a write asks to be
   imported again. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const CODE = "import { test, expect } from '@playwright/test';\ntest('Total is shown', async ({ page }) => {\n  await page.waitForTimeout(3000);\n});\n";
const PLAN = { fileName: "specs/cart.md", name: "Cart", suites: [{ name: "Totals", tests: [{ name: "Total is shown", steps: [] }] }] };
const RUN = { locations: ["tests/cart.spec.ts"] };
const steps = (ev) => ev.filter((e) => e.kind !== "user").map((e) => [e.kind, e.file || "", e.cmd || "", !!e.plan, (e.new_content || "").length > 0]);
const EXPECTED = [
  ["write", "specs/cart.md", "", true, false],
  ["write", "tests/cart.spec.ts", "", false, true],
  ["run_tests", "", "npx playwright test tests/cart.spec.ts", false, false],
];

const line = (role, content) => JSON.stringify({ role, message: { content } });
const dyn = (namespace, toolName, args) => ({ type: "tool_use", name: "CallDynamicTool", input: { namespace, toolName, arguments: args } });
const transcript = (...calls) =>
  [line("user", [{ type: "text", text: "<user_query>Plan and write the cart tests</user_query>" }]), ...calls.map((c) => line("assistant", [c]))].join("\n");

test("a Cursor transcript: the generator's file and code, the planner's plan, the files a run takes", () => {
  const ev = Lens.importAny(
    transcript(
      dyn("playwright-test", "planner_save_plan", PLAN),
      dyn("playwright-test", "generator_write_test", { fileName: "tests/cart.spec.ts", code: CODE }),
      dyn("playwright-test", "test_run", RUN),
    ),
    cfg,
  );
  assert.deepEqual(steps(ev), EXPECTED);
  // the checks read the test it wrote
  assert.ok(Lens.runChecks(ev, cfg).some((f) => f.check === "sleep_or_skip_added"));
});

test("a Cursor Agent CLI log: the same, from mcpToolCall's args", () => {
  const call = (id, toolName, args, content = []) => ({
    type: "tool_call",
    subtype: "completed",
    call_id: id,
    tool_call: {
      mcpToolCall: { args: { name: "playwright-test-" + toolName, toolName, serverIdentifier: "playwright-test", args }, result: { success: { content } } },
    },
  });
  const log = [
    { type: "system", subtype: "init", cwd: "/w/shop" },
    { type: "user", message: { role: "user", content: [{ type: "text", text: "Plan and write the cart tests" }] } },
    call("p", "planner_save_plan", PLAN),
    call("g", "generator_write_test", { fileName: "tests/cart.spec.ts", code: CODE }),
    call("r", "test_run", RUN),
  ]
    .map((l) => JSON.stringify(l))
    .join("\n");
  assert.deepEqual(
    steps(Lens.importAny(log, cfg)).map(([kind, file, ...rest]) => [kind, file.replace(/^\/w\/shop\//, ""), ...rest]),
    EXPECTED,
  );
});

test("another MCP tool's input is left as it was", () => {
  const ev = Lens.importAny(transcript(dyn("plugin-playwright-playwright", "browser_navigate", { url: "https://shop.example.com/" })), cfg);
  const step = ev.find((e) => e.tool === "mcp__plugin-playwright-playwright__browser_navigate");
  assert.deepEqual([step.kind, step.file || ""], ["tool", ""]);
  // another server's tool with a path and a text: not read as a write of that file
  const fs = Lens.importAny(transcript(dyn("filesystem", "write_file", { path: "/w/shop/tests/a.spec.ts", content: "x" })), cfg).find(
    (e) => e.tool === "mcp__filesystem__write_file",
  );
  assert.deepEqual([fs.kind, fs.file || "", fs.new_content || ""], ["tool", "", ""]);
});

test("a Cursor session imported before with a write of the generator with no file asks to be imported again (IMPORT_GEN 10)", () => {
  const old = [
    { seq: 0, kind: "user", text: "Write" },
    { seq: 1, kind: "write", tool: "mcp__playwright-test__generator_write_test", file: "" },
  ];
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 9, events: old }), true);
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: Lens.IMPORT_GEN, events: old }), false, "imported with this version");
  const fine = [old[0], { ...old[1], file: "tests/cart.spec.ts", new_content: CODE }];
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 9, events: fine }), false, "a Claude Code session has its file");
});
