"use strict";
/* Code shown in an agent's message (0.1.127): a diff is read as the code after the change, its unchanged and added
   lines without the sign, so the removed lines are no code and "- await expect(…)" is no expression; and a fragment
   is not reported by ESLint's playwright/no-standalone-expect, since its test is left out of the message. A test
   file's expect() outside a test still is. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");
const { loadEngines } = require("../perf/snapshot-lint");

const { Lens } = load();
const LensLint = require(M("lint.js"));
const cfg = Lens.profile("qa-ts");

const message = (text) => Lens.importAny(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] } }), cfg)[0];
const DIFF = [
  "     await expect(todoPage.filterLinks).toHaveCount(0);",
  "-    await expect(todoPage.newTodo).toBeVisible();",
  "+    await expect(todoPage.newTodo).toBeEditable();",
  "     await expect(page).toHaveURL('/todomvc/#/');",
].join("\n");
const AFTER = [
  "    await expect(todoPage.filterLinks).toHaveCount(0);",
  "    await expect(todoPage.newTodo).toBeEditable();",
  "    await expect(page).toHaveURL('/todomvc/#/');",
].join("\n");

test("a diff in a message is the code after the change", () => {
  assert.equal(message("Recommended:\n```diff\n" + DIFF + "\n```\n").new_content, AFTER + "\n");
  // no language, but the lines of a diff: both a removed and an added line
  assert.equal(message("```\n" + DIFF + "\n```\n").new_content, AFTER + "\n");
  // "```diff" with added lines only: the language says it is a diff
  assert.equal(
    message("```diff\n   await page.goto('/');\n+  await expect(page).toHaveTitle('Shop');\n```\n").new_content,
    "  await page.goto('/');\n  await expect(page).toHaveTitle('Shop');\n",
  );
  // a hunk with its headers
  assert.equal(
    message("```patch\n--- a/t.spec.ts\n+++ b/t.spec.ts\n@@ -1,2 +1,2 @@\n-  expect(a).toBe(1);\n+  expect(a).toBe(2);\n```\n").new_content,
    "  expect(a).toBe(2);\n",
  );
});

test("code that is no diff stays as it is", () => {
  const code = "test('total', async () => {\n  expect(total).toBe(3);\n});\n";
  assert.equal(message("```ts\n" + code + "```\n").new_content, code);
  // indented lines and a minus at the start of one: not both kinds of change, no hunk header
  const neg = "  expect(a).toBe(1);\n-1 === b && expect(b).toBe(-1);\n";
  assert.equal(message("```\n" + neg + "```\n").new_content, neg);
});

test("ESLint: a fragment in a message is no standalone expect; a test file's is", async () => {
  await loadEngines();
  const lint = (events) =>
    LensLint.run({ events }, cfg, {})
      .findings.filter((f) => f.rule === "playwright/no-standalone-expect")
      .map((f) => f.message.split(" — ")[0]);
  const msg = message("```diff\n" + DIFF + "\n```\n");
  assert.deepEqual(lint([Object.assign({}, msg, { seq: 1 })]), []);
  assert.deepEqual(
    lint([
      {
        seq: 2,
        kind: "write",
        file: "e2e/cart.spec.ts",
        new_content: "import { test, expect } from '@playwright/test';\nexpect(1).toBe(1);\ntest('a', async () => {});\n",
      },
    ]),
    ["e2e/cart.spec.ts:2"],
  );
});

test("a session imported before with a diff in a message asks to be imported again (IMPORT_GEN 9)", () => {
  const s = (text) => ({ profile: "qa-ts", importGen: 8, events: [{ seq: 0, kind: "message", text, new_content: "x" }] });
  assert.equal(Lens.needsReimport(s("```diff\n" + DIFF + "\n```")), true);
  assert.equal(Lens.needsReimport(s("```ts\nexpect(a).toBe(1);\n```")), false);
  assert.equal(Lens.needsReimport(Object.assign(s("```diff\n" + DIFF + "\n```"), { importGen: Lens.IMPORT_GEN })), false);
});
