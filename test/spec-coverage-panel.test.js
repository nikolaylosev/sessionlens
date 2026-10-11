"use strict";
/* The coverage table on a session's tab (0.1.125). A specification without IDs (R1, R2… numbered by the parser) cannot
   be named by a test: no spec finding is made about it, and since this version the tab says so instead of showing every
   requirement as "none" in red with every test as having no reference. The owner's case: a code review that the
   segmentation took for the spec, whose five headings no test could cover, while the high no_spec was gone. A
   specification with IDs is shown as before. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { bootHost, openPage } = require("./host-panel");

async function until(fn, ms = 10000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}
const click = (p, sel) => p.document.querySelector(sel).dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
const puts = (p) => p.sent.filter((m) => m.type === "session:put");

const SPEC_FILE = "/w/shop/tests/search.spec.ts";
const CODE = `import { test, expect } from '@playwright/test';
// R1
test('opens the search overlay', async ({ page }) => {
  await expect(page.getByRole('textbox')).toBeVisible();
});
test('closes the search overlay', async ({ page }) => {
  await expect(page.getByRole('textbox')).toBeHidden();
});
`;
const TRANSCRIPT = [
  { type: "user", message: { role: "user", content: "Write the search tests" } },
  {
    type: "assistant",
    message: { role: "assistant", content: [{ type: "tool_use", id: "w", name: "Write", input: { file_path: SPEC_FILE, content: CODE } }] },
  },
  { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "w", content: "ok" }] } },
]
  .map((l) => JSON.stringify(l))
  .join("\n");

async function tabWithSpec(spec) {
  const host = bootHost({ globalState: { settings: { profile: "qa-ts", rulesTarget: "claude", modelPool: [], defaultModelId: null, lint: false } } });
  const sb = await openPage(host);
  await sb.ready();
  sb.document.querySelector("#paste").value = TRANSCRIPT;
  sb.document.querySelector("#paste-name").value = "search";
  click(sb, "#paste-go");
  await until(() => puts(sb).length);
  await sb.idle();
  const id = puts(sb).pop().payload.session.id;
  sb.close();
  const tab = await openPage(host, { sessionId: id });
  await tab.ready();
  tab.document.querySelector("#spec").value = spec;
  const n = puts(tab).length;
  click(tab, "#spec-save");
  await until(() => puts(tab).length > n);
  await tab.idle();
  const q = (sel) => tab.document.querySelector(sel);
  const out = {
    count: q("#spec-count").textContent,
    note: [...q("#coverage").querySelectorAll("p")].map((p) => p.textContent),
    cells: [...q("#coverage").querySelectorAll("td:last-child")].map((td) => `${td.className}:${td.textContent}`),
    findings: puts(tab)
      .pop()
      .payload.session.findings.filter((f) => f.source === "spec")
      .map((f) => f.check),
  };
  tab.close();
  return out;
}

test("a specification without IDs: the tab says coverage is not checked, and an empty cell is no failure", async () => {
  const r = await tabWithSpec("1. Open the search overlay 2. Close the search overlay");
  assert.equal(r.count, "(2 requirements) · numbered automatically, coverage not checked");
  assert.deepEqual(r.note, [
    "These requirements have no IDs, so no test can name one: their coverage is not checked, and no finding is made about it. To check it, number them R1., R2. … and name the ID in each test's title or in a comment above it.",
  ]);
  // the comment "// R1" names the parser's R1 by chance: shown, as before; the other cell is neutral, not "none" in red
  assert.deepEqual(r.cells, ["yes:opens the search overlay", ":—"]);
  assert.deepEqual(r.findings, [], "no spec finding, as before");
});

test("a specification with IDs: as before, an uncovered requirement in red and the tests that name none", async () => {
  const r = await tabWithSpec("R1. Open the search overlay\nR2. Close the search overlay");
  assert.equal(r.count, "(2 requirements)");
  assert.deepEqual(r.note, ["No requirement reference: closes the search overlay"]);
  assert.deepEqual(r.cells, ["yes:opens the search overlay", "no:none"]);
  assert.deepEqual(r.findings, ["spec_uncovered", "test_without_requirement"]);
});
