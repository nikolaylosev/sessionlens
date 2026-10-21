"use strict";
/* What the agent wrote as a specification, offered on the session's tab (0.1.130). A plan of Playwright's planner
   (planner_save_plan) is kept on its step as Playwright writes it to its file, and read as a specification: each
   scenario "#### 1.1. Name" a requirement that a test covers by its title, since the generator names the test as its
   scenario and puts no number in it; the plan's seed tests are no tests without a requirement. A document of test
   cases the agent wrote (.md with two IDs or more) is offered too. Only while the session has no specification, and
   only on the person's click. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");
const { bootHost, openPage } = require("./host-panel");

const { Lens } = load();
const LensSpec = require(M("spec.js"));
const cfg = Lens.profile("qa-ts");

const PLAN_INPUT = {
  fileName: "specs/cart.md",
  name: "Cart Test Plan",
  overview: "The cart of https://shop.example.com: totals and discounts.",
  suites: [
    {
      name: "Totals",
      seedFile: "tests/seed.spec.ts",
      tests: [
        { name: "Total is shown", file: "tests/cart/total.spec.ts", steps: [{ perform: "Open the cart with two items.", expect: ["The total reads 3"] }] },
        { name: "Discount applies.", file: "tests/cart/discount.spec.ts", steps: [{ perform: "Enter SAVE10.", expect: ["The total drops by 10%"] }] },
      ],
    },
  ],
};
const PLAN_MD = [
  "# Cart Test Plan",
  "",
  "## Application Overview",
  "",
  "The cart of https://shop.example.com: totals and discounts.",
  "",
  "## Test Scenarios",
  "",
  "### 1. Totals",
  "",
  "**Seed:** `tests/seed.spec.ts`",
  "",
  "#### 1.1. Total is shown",
  "",
  "**File:** `tests/cart/total.spec.ts`",
  "",
  "**Steps:**",
  "  1. Open the cart with two items.",
  "    - expect: The total reads 3",
  "",
  "#### 1.2. Discount applies.",
  "",
  "**File:** `tests/cart/discount.spec.ts`",
  "",
  "**Steps:**",
  "  1. Enter SAVE10.",
  "    - expect: The total drops by 10%",
  "",
].join("\n");

const pw = (name, body = "  await expect(page.getByText('3')).toBeVisible();") => `test('${name}', async ({ page }) => {\n${body}\n});\n`;
const write = (seq, file, code) => ({ seq, kind: "write", file, new_content: code });

test("a planner's plan: a requirement per scenario, by its number, covered by a test of the same title", () => {
  const spec = LensSpec.parse(PLAN_MD);
  assert.deepEqual(
    spec.requirements.map((r) => `${r.id} | ${r.text}`),
    ["1.1 | Total is shown", "1.2 | Discount applies."],
  );
  assert.deepEqual(spec.seeds, ["tests/seed.spec.ts"]);
  const ev = [
    write(1, "tests/seed.spec.ts", pw("seed", "  await page.goto('/cart');")),
    write(2, "tests/cart/total.spec.ts", pw("total  is SHOWN")), // case and spaces aside
    write(3, "tests/cart/other.spec.ts", pw("Checkout opens")),
  ];
  const r = LensSpec.checks(spec, ev, "typescript");
  assert.deepEqual(r.coverage.covered, { 1.1: ["total  is SHOWN"], 1.2: [] });
  assert.deepEqual(
    r.findings.map((f) => f.check),
    ["spec_uncovered", "test_without_requirement"],
  );
  assert.equal(r.findings[0].message, "Requirement 1.2 has no test: “Discount applies.”");
  assert.match(r.findings[1].message, /Checkout opens/, "the seed test is not one without a requirement");
  // the final period of a scenario is no part of the title
  assert.deepEqual(LensSpec.coverage(spec, [write(1, "tests/cart/d.spec.ts", pw("Discount applies"))], "typescript").covered["1.2"], ["Discount applies"]);
});

test("not a plan: headings without the scenario numbers, or numbers without Test Scenarios", () => {
  // "## Test Scenarios" with no "#### 1.1." scenario: read as before (Scenarios is a requirements heading)
  assert.deepEqual(
    LensSpec.parse("## Test Scenarios\n- R1. Login works\n").requirements.map((r) => r.id),
    ["R1"],
  );
  // "#### 1.1." outside a plan: no requirement with that number
  assert.ok(!LensSpec.parse("## Notes\n#### 1.1. Something\n").requirements.some((r) => r.id === "1.1"));
});

test("the import keeps a planner's plan on its step, as Playwright writes it; it is no code", () => {
  const text = [
    { type: "user", message: { role: "user", content: "Plan the cart tests" } },
    {
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id: "p", name: "mcp__playwright-test__planner_save_plan", input: PLAN_INPUT }] },
    },
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "p", content: "Test plan saved to specs/cart.md" }] } },
  ]
    .map((l) => JSON.stringify(l))
    .join("\n");
  const ev = Lens.importAny(text, cfg, {});
  const step = ev.find((e) => e.plan);
  assert.equal(step.file, "specs/cart.md");
  assert.equal(step.plan, PLAN_MD);
  assert.ok(!step.new_content, "no code: no check reads the plan (its host is no hard-coded base URL)");
  assert.ok(!Lens.runChecks(ev, cfg).some((f) => f.check === "hardcoded_base_url"));
  assert.deepEqual(
    LensSpec.offers(ev).map((o) => [o.file, o.kind, o.n]),
    [["specs/cart.md", "plan", 2]],
  );
});

test("offers: a document with two IDs or more, its last version, newest first; not code, not a fragment", () => {
  const doc = (n) => "# Test cases\n" + Array.from({ length: n }, (_, i) => `### NAV-0${i + 1}. Case ${i + 1}\nSteps.\n`).join("");
  assert.deepEqual(
    LensSpec.offers([
      write(1, "docs/test-cases.md", doc(2)),
      { seq: 2, kind: "write", file: "specs/cart.md", plan: PLAN_MD },
      write(3, "docs/test-cases.md", doc(3)),
    ]).map((o) => [o.file, o.kind, o.n]),
    [
      ["docs/test-cases.md", "cases", 3],
      ["specs/cart.md", "plan", 2],
    ],
  );
  assert.deepEqual(LensSpec.offers([write(1, "docs/test-cases.md", doc(1))]), [], "one ID");
  assert.deepEqual(LensSpec.offers([write(1, "README.md", "# Shop\nRun npm test.\n- one\n- two\n")]), [], "no IDs");
  assert.deepEqual(LensSpec.offers([write(1, "tests/nav.spec.ts", "/*\nNAV-01. The menu opens\nNAV-02. The footer has links\n*/\n")]), [], "code");
  assert.deepEqual(LensSpec.offers([{ ...write(1, "docs/test-cases.md", doc(3)), kind: "edit", fragment_only: true }]), [], "a fragment");
});

async function until(fn, ms = 10000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}
const click = (p, el) => (typeof el === "string" ? p.document.querySelector(el) : el).dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
const puts = (p) => p.sent.filter((m) => m.type === "session:put");

test("the tab offers the plan while the session has no specification; a click makes it the specification", async () => {
  const TOTAL = "/w/shop/tests/cart/total.spec.ts";
  const text = [
    { type: "user", message: { role: "user", content: "Plan and write the cart tests" } },
    {
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id: "p", name: "mcp__playwright-test__planner_save_plan", input: PLAN_INPUT }] },
    },
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "p", content: "Test plan saved to specs/cart.md" }] } },
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "w",
            name: "Write",
            input: { file_path: TOTAL, content: "import { test, expect } from '@playwright/test';\n" + pw("Total is shown") },
          },
        ],
      },
    },
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "w", content: "ok" }] } },
  ]
    .map((l) => JSON.stringify(l))
    .join("\n");
  const host = bootHost({ globalState: { settings: { profile: "qa-ts", rulesTarget: "claude", modelPool: [], defaultModelId: null, lint: false } } });
  const sb = await openPage(host);
  await sb.ready();
  sb.document.querySelector("#paste").value = text;
  sb.document.querySelector("#paste-name").value = "cart";
  click(sb, "#paste-go");
  await until(() => puts(sb).length);
  await sb.idle();
  const id = puts(sb).pop().payload.session.id;
  sb.close();
  const tab = await openPage(host, { sessionId: id });
  await tab.ready();
  const q = (sel) => tab.document.querySelector(sel);
  assert.equal(q("#spec-offer").hidden, false);
  assert.equal(q("#spec-offer").textContent, "The agent saved a test plan, specs/cart.md: 2 scenarios.Use as specification");
  assert.equal(q("#spec").value, "", "nothing taken before the click");
  const n = puts(tab).length;
  click(tab, q("#spec-offer [data-offer='0']"));
  await until(() => puts(tab).length > n);
  await tab.idle();
  const s = puts(tab).pop().payload.session;
  assert.equal(s.spec, PLAN_MD);
  assert.deepEqual(
    s.findings.filter((f) => f.source === "spec").map((f) => f.message),
    ["Requirement 1.2 has no test: “Discount applies.”"],
  );
  assert.equal(q("#spec-offer").hidden, true, "a session with a specification is offered nothing");
  assert.equal(q("#spec-count").textContent, "(2 requirements)");
  tab.close();
});

test("a document of test cases written in a real import is offered: the import keeps its text, for no check", () => {
  const doc = "# Test cases\n\nSite: https://shop.example.org/\n\n### NAV-01. The menu is visible\n\nSteps. Open the home page.\n\n### NAV-02. About opens\n";
  const text = [
    { type: "user", message: { role: "user", content: "Write the test cases" } },
    {
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id: "w", name: "Write", input: { file_path: "/w/shop/docs/test-cases.md", content: doc } }] },
    },
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "w", content: "ok" }] } },
  ]
    .map((l) => JSON.stringify(l))
    .join("\n");
  const ev = Lens.importAny(text, cfg, {});
  const w = ev.find((e) => e.kind === "write");
  assert.deepEqual([w.new_content, w.doc_content], [undefined, doc], "no code; the document's text");
  assert.deepEqual(
    LensSpec.offers(ev).map((o) => [o.file, o.kind, o.n, o.text === doc]),
    [[w.file, "cases", 2, true]],
  );
  // a README the agent wrote: kept, offered as nothing (no IDs)
  const readme = text.replace("docs/test-cases.md", "README.md").replace(JSON.stringify(doc).slice(1, -1), "# Shop\\nRun npm test.\\n");
  assert.deepEqual(LensSpec.offers(Lens.importAny(readme, cfg, {})), []);
  // a config is no document: its text is not kept
  const json = text.replace("docs/test-cases.md", "package.json");
  assert.equal(Lens.importAny(json, cfg, {}).find((e) => e.kind === "write").doc_content, undefined);
});
