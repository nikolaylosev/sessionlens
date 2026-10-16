"use strict";
/* The note under the findings names the engine that ran, as What this profile checks does (0.1.129): until then it
   said "ESLint: …" for tree-sitter and the Robot Framework parser too, "ESLint could not parse…" when tree-sitter
   could not, and "static analysis: qa-ts only" for a profile with no engine. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");
const { loadEngines } = require("../perf/snapshot-lint");

const { Lens } = load();
const LensLint = require(M("lint.js"));

const note = (profile, file, code) => LensLint.run({ events: [{ seq: 1, kind: "write", file, new_content: code }] }, Lens.profile(profile), {}).note;
const PY = "def test_order():\n    client.post('/orders')\n";

test("the note names ESLint, tree-sitter or the Robot Framework parser", async () => {
  await loadEngines();
  assert.equal(
    note("qa-ts", "e2e/cart.spec.ts", "import { test } from '@playwright/test';\ntest('a', async ({ page }) => {\n  await page.goto('/');\n});\n"),
    "ESLint: 1 finding in 1 block",
  );
  // the Python engine with Ruff (0.1.129); without it, test/ruff.test.js
  assert.equal(note("qa-python", "tests/test_orders.py", PY), "tree-sitter and Ruff: 1 finding in 1 block");
  assert.equal(note("qa-api", "tests/test_orders.py", PY), "tree-sitter and Ruff: 1 finding in 1 block");
  assert.equal(
    note("qa-java", "src/test/java/CartTest.java", "class CartTest {\n  @Test\n  void pays() {\n    cart.pay();\n  }\n}\n"),
    "tree-sitter: 1 finding in 1 block",
  );
  assert.equal(
    note("qa-robot", "tests/cart.robot", "*** Test Cases ***\nPays\n    Click Button    pay\n"),
    "built-in Robot Framework parser: 1 finding in 1 block",
  );
  assert.equal(note("qa-mobile", "tests/cart.spec.ts", "it('a', () => {});\n"), "static analysis: none for this profile");
});

test("an engine that could not parse anything is named too", async () => {
  await loadEngines();
  const real = globalThis.LensLintPython;
  globalThis.LensLintPython = { lint: () => ({ error: "unexpected token" }) };
  try {
    assert.equal(
      note("qa-python", "tests/test_orders.py", PY),
      "tree-sitter could not parse any code block (1 in all) — regex checks kept. First error: tests/test_orders.py: unexpected token",
    );
  } finally {
    globalThis.LensLintPython = real;
  }
});
