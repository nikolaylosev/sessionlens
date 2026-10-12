"use strict";
/* duplicate_assert: the same assertion line twice in one test with nothing but assertions between, low, naming the
   line. What must not count: the same assertion in two different tests, the same call with another value,
   commented-out lines (two identical commented-out assertions were reported until 0.1.120), and since 0.1.127 the same
   assertion after an action: a check that the action left it alone. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

const found = (profile, file, content) =>
  Lens.runChecks([{ seq: 1, kind: "write", file, new_content: content }], Lens.profile(profile))
    .filter((f) => f.check === "duplicate_assert")
    .map((f) => `${f.severity}: ${f.message}`);
const ts = (body, name = "total") => `test('${name}', async () => {\n${body}\n});\n`;
const F = "e2e/cart.spec.ts";

test("the same assertion twice in one test is reported, with the line", () => {
  assert.deepEqual(found("qa-ts", F, ts("  expect(total).toBe(PRICE);\n  expect(count).toBe(1);\n\n  // again\n  expect(total).toBe(PRICE);")), [
    "low: e2e/cart.spec.ts: total — identical assertion repeated: “expect(total).toBe(PRICE);” (Duplicate Assert)",
  ]);
  assert.deepEqual(found("qa-python", "tests/test_cart.py", "def test_total():\n    assert total == PRICE\n    assert total == PRICE\n"), [
    "low: tests/test_cart.py: test_total — identical assertion repeated: “assert total == PRICE” (Duplicate Assert)",
  ]);
});

test("not reported: the same assertion before and after an action, which proves the action left it alone (0.1.127)", () => {
  assert.deepEqual(found("qa-ts", F, ts("  expect(total).toBe(PRICE);\n  await page.reload();\n  expect(total).toBe(PRICE);")), []);
  assert.deepEqual(
    found(
      "qa-ts",
      F,
      ts(
        "  await expect(todoPage.todoCount).toHaveText('1 item left');\n  await todoPage.startEditing('one');\n  await todoPage.editInput.press('Enter');\n  await expect(todoPage.todoCount).toHaveText('1 item left');",
      ),
    ),
    [],
  );
  assert.deepEqual(
    found("qa-python", "tests/test_cart.py", "def test_total():\n    assert total == PRICE\n    cart.reload()\n    assert total == PRICE\n"),
    [],
  );
});

test("not reported: the same assertion in two tests, or the same call with another value", () => {
  assert.deepEqual(found("qa-ts", F, ts("  expect(total).toBe(PRICE);") + ts("  expect(total).toBe(PRICE);", "after reload")), []);
  assert.deepEqual(found("qa-ts", F, ts("  expect(total).toBe(PRICE);\n  expect(total).toBe(PRICE_WITH_TAX);")), []);
});

test("not reported: commented-out assertions (0.1.120)", () => {
  assert.deepEqual(found("qa-ts", F, ts("  // expect(total).toBe(PRICE);\n  // expect(total).toBe(PRICE);\n  expect(total).toBe(PRICE);")), []);
  assert.deepEqual(found("qa-ts", F, ts("  /* expect(total).toBe(PRICE); */\n  /* expect(total).toBe(PRICE); */")), []);
  assert.deepEqual(
    found("qa-java", "src/test/java/CartTest.java", "@Test\nvoid total() {\n  // assertEquals(PRICE, total);\n  // assertEquals(PRICE, total);\n}\n"),
    [],
  );
});
