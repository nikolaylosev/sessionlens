"use strict";
/* Assertions in a file with no test in it (0.1.125): a page object, a helper. Its functions and methods are the blocks,
   so a weakened or removed assertion there is assert_weakened, as in a test. Until then only the lines inside
   test('…') / it('…') / def test_… counted: in the owner's Cursor session of 11 Oct 2026 (Tests-mcp), where every
   expect() lives in two page objects, each edit was 0 assertions before and after. Also expect.soft() and expect.poll()
   count in Playwright. TypeScript, Python and Java; a file in another language is one block. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

// two versions of one file, written by the agent one after the other (Claude Code), → the assert_weakened messages
function weakened(profile, file, before, after) {
  const cfg = Lens.profile(profile);
  const use = (id, content) =>
    JSON.stringify({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id, name: "Write", input: { file_path: "/w/" + file, content } }] },
    });
  const text = [JSON.stringify({ type: "user", cwd: "/w", message: { role: "user", content: "Fix the tests" } }), use("a", before), use("b", after)].join("\n");
  return Lens.runChecks(Lens.importAny(text, cfg), cfg)
    .filter((f) => f.check === "assert_weakened")
    .map((f) => `${f.severity}: ${f.message}`);
}

const PO = `import { expect, type Page } from '@playwright/test';

export class SearchPage {
  constructor(
    readonly page: Page,
    readonly strict = true,
  ) {}

  async openSearch(): Promise<void> {
    await this.page.getByRole('link', { name: 'Search' }).click();
  }

  async expectSearchOpen(): Promise<void> {
    await expect(this.page.getByRole('textbox')).toBeVisible();
    await expect(this.page.getByText('Start typing')).toBeVisible();
    if (this.strict) {
      await expect(this.page.getByLabel('Close search form')).toBeVisible();
    }
  }

  async expectResults(query: string): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 2 }).first()).toHaveText(query);
  }
}
`;

test("a TypeScript page object: a weakened assertion and a removed one, named by the method", () => {
  const F = "tests/pages/search.page.ts";
  assert.deepEqual(weakened("qa-ts", F, PO, PO.replace("toHaveText(query)", "toBeVisible()")), [
    `high: ${F}: expectResults — assertion weakened (….toHaveText(query); → ….toBeVisible();)`,
  ]);
  assert.deepEqual(weakened("qa-ts", F, PO, PO.replace("    await expect(this.page.getByText('Start typing')).toBeVisible();\n", "")), [
    `high: ${F}: expectSearchOpen — fewer assertions (3 → 2)`,
  ]);
  // not reported: an edit that keeps the assertions (an action changed), and the if inside a method is no block of its own
  assert.deepEqual(weakened("qa-ts", F, PO, PO.replace("name: 'Search'", "name: 'Find'")), []);
});

test("a TypeScript helper written as an arrow function, and expect.soft / expect.poll counted", () => {
  const H = `import { expect, type Page } from '@playwright/test';\n\nexport const expectPaid = async (page: Page) => {\n  await expect.soft(page.getByRole('status')).toHaveText('Paid');\n  await expect.poll(() => page.title()).toBe('Shop');\n};\n`;
  assert.deepEqual(weakened("qa-ts", "tests/helpers/pay.ts", H, H.replace("toHaveText('Paid')", "toBeVisible()")), [
    "high: tests/helpers/pay.ts: expectPaid — assertion weakened (….toHaveText('Paid'); → ….toBeVisible();)",
  ]);
  assert.deepEqual(weakened("qa-ts", "tests/helpers/pay.ts", H, H.replace("  await expect.poll(() => page.title()).toBe('Shop');\n", "")), [
    "high: tests/helpers/pay.ts: expectPaid — fewer assertions (2 → 1)",
  ]);
  // a soft assertion in a test counts too
  const T = `import { test, expect } from '@playwright/test';\ntest('menu', async ({ page }) => {\n  await expect.soft(page.getByRole('link', { name: 'News' })).toBeVisible();\n  await expect.soft(page.getByRole('link', { name: 'Shop' })).toBeVisible();\n});\n`;
  assert.deepEqual(weakened("qa-ts", "tests/menu.spec.ts", T, T.replace(/^.*'Shop'.*\n/m, "")), ["high: tests/menu.spec.ts: menu — fewer assertions (2 → 1)"]);
});

test("a Python page object and a Java one", () => {
  const PY = `class CartPage:\n    def __init__(self, page):\n        self.page = page\n\n    def expect_total(self, total):\n        assert self.page.total() == total\n`;
  assert.deepEqual(
    weakened("qa-python", "tests/pages/cart_page.py", PY, PY.replace("assert self.page.total() == total", "assert total in self.page.total()")),
    ["high: tests/pages/cart_page.py: expect_total — assertion weakened (assert self.page.total() == total → assert total in self.page.total())"],
  );
  const J = `public class CartPage {\n  private final Page page;\n\n  public void expectTotal(String total) {\n    assertEquals(total, page.total());\n  }\n}\n`;
  assert.deepEqual(
    weakened("qa-java", "src/test/java/pages/CartPage.java", J, J.replace("assertEquals(total, page.total());", "assertNotNull(page.total());")),
    ["high: src/test/java/pages/CartPage.java: expectTotal — assertion weakened (assertEquals(total, page.total()); → assertNotNull(page.total());)"],
  );
});

test("a file with tests is still compared test by test; a file in another language is one block", () => {
  const T = `import { test, expect } from '@playwright/test';\ntest('total', async ({ page }) => {\n  await expect(page.getByTestId('total')).toHaveText('42');\n});\n`;
  assert.deepEqual(weakened("qa-ts", "tests/cart.spec.ts", T, T.replace("toHaveText('42')", "toBeVisible()")), [
    "high: tests/cart.spec.ts: total — assertion weakened (await expect(page.getByTestId('total')).toHaveText('42'); → await expect(page.getByTestId('total')).toBeVisible();)",
  ]);
  const cfg = Lens.profile("qa-ts");
  assert.deepEqual(Lens.compareAsserts("expect(a).toBe(1);\nexpect(b).toBe(2);\n", "expect(a).toBe(1);\n", cfg, "checks.txt").removed, [
    { test: "<file>", before: 2, after: 1 },
  ]);
});

test("Import again for a session imported before whose page object edits were counted as 0 assertions", () => {
  const cfg = Lens.profile("qa-ts");
  const use = (id, content) =>
    JSON.stringify({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id, name: "Write", input: { file_path: "/w/tests/pages/search.page.ts", content } }] },
    });
  const events = Lens.importAny([use("a", PO), use("b", PO.replace("toHaveText(query)", "toBeVisible()"))].join("\n"), cfg);
  const edit = events.find((e) => e.assert_delta);
  assert.equal(edit.assert_delta.old, 4, "counted now");
  // what an import before this version stored
  const before = events.map((e) => (e === edit ? Object.assign({}, e, { assert_delta: { old: 0, new: 0, weakened: [], removed: [] } }) : e));
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 7, events: before }), true);
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: Lens.IMPORT_GEN, events: before }), false, "imported with this version");
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 7, events }), false, "counted already");
  // a file with no assertion at all was 0 before and is 0 now: nothing to ask
  const plain = before.map((e) => (e.assert_delta ? Object.assign({}, e, { new_content: "export const x = 1;\n" }) : e));
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 7, events: plain }), false);
});
