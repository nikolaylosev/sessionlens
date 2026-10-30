"use strict";
/* A JS/TS test's title may hold quotes of the other kinds and escaped quotes of its own (0.1.132):
   test('TODO-01: the counter reads "1 todo left"', …), it("keeps the user's cart", …), test('can\'t log in', …).
   Until then a title could hold no quote at all, so such a test was no test: a Cursor agent in CI named five tests
   "TODO-0N: …" with a quoted UI text in each, and every requirement had "no test"; a test with an apostrophe was not
   counted for test_deleted or assert_weakened either. The title ends at its own closing quote. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");

const { Lens } = load();
const LensSpec = require(M("spec.js"));
const cfg = Lens.profile("qa-ts");

const HEAD = "import { test, expect } from '@playwright/test';\n";
const t = (title, body = "  await expect(page.getByText('Cart')).toHaveText('Cart: 3');") => `test(${title}, async ({ page }) => {\n${body}\n});\n`;
const CART = t(`"keeps the user's cart"`);
const TOTAL = t(`'total'`);
const LOGIN = t(`'can\\'t log in'`);
// one line: the title ends at its own quote, not at the last one on the line
const ONE = "test('one', async ({ page }) => { await page.goto('/one'); });\n";

test("the specification's coverage finds such tests and the keys in their titles", () => {
  const code =
    HEAD +
    t(`'TODO-01: After adding one todo, the counter reads "1 todo left"'`) +
    t('`TODO-02: The "Active" filter, the user\'s list`') +
    t(`'TODO-03: can\\'t clear an empty list'`);
  assert.deepEqual(
    LensSpec.tests(code, "typescript", "tests/footer.spec.ts").map((x) => x.name),
    ['TODO-01: After adding one todo, the counter reads "1 todo left"', `TODO-02: The "Active" filter, the user's list`, "TODO-03: can't clear an empty list"],
  );
  const spec = LensSpec.parse("## Requirements\nTODO-01. One todo\nTODO-02. Active filter\nTODO-03. Clear an empty list\n");
  const cov = LensSpec.coverage(spec, [{ seq: 1, kind: "write", file: "tests/footer.spec.ts", new_content: code }], "typescript");
  assert.deepEqual(cov.uncovered, []);
  // the title ends at its own quote: a string later on the line is no part of it
  assert.deepEqual(
    LensSpec.tests(HEAD + "test('a', async () => { const s = 'b'; });\n", "typescript", "a.spec.ts").map((x) => x.name),
    ["a"],
  );
});

test("test_deleted sees a test with an apostrophe go, in qa-ts, qa-cypress and qa-api", () => {
  const ev = (profile, file) =>
    Lens.runChecks(
      [
        { seq: 1, kind: "write", file, new_content: HEAD + CART + TOTAL },
        { seq: 2, kind: "write", file, new_content: HEAD + TOTAL, prev_content: HEAD + CART + TOTAL },
      ],
      Lens.profile(profile),
    )
      .filter((f) => f.check === "test_deleted")
      .map((f) => f.message);
  assert.deepEqual(ev("qa-ts", "e2e/cart.spec.ts"), ["e2e/cart.spec.ts: 1 test deleted: keeps the user's cart"]);
  assert.deepEqual(ev("qa-cypress", "cypress/e2e/cart.cy.ts"), ["cypress/e2e/cart.cy.ts: 1 test deleted: keeps the user's cart"]);
  assert.deepEqual(ev("qa-api", "tests/cart.test.ts"), ["tests/cart.test.ts: 1 test deleted: keeps the user's cart"]);
  // an escaped quote of its own kind: the name is said without the backslash
  const gone = Lens.runChecks(
    [
      { seq: 1, kind: "write", file: "e2e/login.spec.ts", new_content: HEAD + LOGIN + ONE + TOTAL },
      { seq: 2, kind: "write", file: "e2e/login.spec.ts", new_content: HEAD + TOTAL, prev_content: HEAD + LOGIN + ONE + TOTAL },
    ],
    cfg,
  ).filter((f) => f.check === "test_deleted");
  assert.deepEqual(
    gone.map((f) => f.message),
    ["e2e/login.spec.ts: 2 tests deleted: can't log in, one"],
  );
});

test("assert_weakened sees a weakened assertion in such a test", () => {
  const file = "/w/e2e/cart.spec.ts";
  const before = HEAD + CART;
  const after = before.replace("toHaveText('Cart: 3')", "toBeVisible()");
  const text = [
    { type: "user", message: { role: "user", content: "Fix the cart test" } },
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "tool_use", id: "e", name: "Edit", input: { file_path: file, old_string: "toHaveText('Cart: 3')", new_string: "toBeVisible()" } }],
      },
    },
    {
      type: "user",
      cwd: "/w",
      message: { role: "user", content: [{ type: "tool_result", tool_use_id: "e", content: "ok" }] },
      toolUseResult: { filePath: file, originalFile: before, oldString: "toHaveText('Cart: 3')", newString: "toBeVisible()" },
    },
  ]
    .map((l) => JSON.stringify(l))
    .join("\n");
  const ev = Lens.importAny(text, cfg);
  assert.equal(ev.find((e) => e.kind === "edit").new_content, after);
  const found = Lens.runChecks(ev, cfg).filter((f) => f.check === "assert_weakened");
  assert.equal(found.length, 1);
  assert.match(found[0].message, /keeps the user's cart/);
});
