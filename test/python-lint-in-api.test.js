"use strict";
/* qa-api's Python files go to the Python engine (0.1.129, lint_language / lint_ext): an API test on pytest gets a test
   with no assertion and an exception swallowed, next to the API checks. Its files in other languages, and code shown
   in a message, are not linted: qa-api has no engine for them. Real engines, as lint-mapped-checks.test.js. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");
const { loadEngines } = require("../perf/snapshot-lint");

const { Lens } = load();
const LensLint = require(M("lint.js"));

const PY = `import requests

def test_create_order():
    requests.post("/orders", json={"item": "apple"})

def test_get_order():
    try:
        r = requests.get("/orders/1")
        assert r.status_code == 200
    except Exception:
        pass
`;

test("qa-api lints its .py files with the Python engine", async () => {
  await loadEngines();
  const cfg = Lens.profile("qa-api");
  assert.equal(Lens.lintLanguage(cfg), "python");
  const lr = LensLint.run({ events: [{ seq: 1, kind: "write", file: "tests/test_orders.py", new_content: PY }] }, cfg, {});
  assert.equal(lr.ran, true, lr.note);
  assert.deepEqual(lr.findings.map((f) => `${f.check} ${f.severity}`).sort(), ["no_assertion_after_action high", "swallowed_exception high"]);
});

test("qa-api leaves its other files and code in a message alone; qa-python is as before", async () => {
  await loadEngines();
  const cfg = Lens.profile("qa-api");
  const ts = { seq: 1, kind: "write", file: "tests/orders.test.ts", new_content: "test('x', async () => {\n  await fetch('/orders');\n});\n" };
  const msg = { seq: 2, kind: "message", text: "", new_content: PY };
  assert.deepEqual(LensLint.run({ events: [ts, msg] }, cfg, {}).findings, []);
  assert.equal(Lens.lintLanguage(Lens.profile("qa-python")), "python");
  assert.equal(Lens.lintLanguage(Lens.profile("qa-ts")), "typescript");
  const py = LensLint.run({ events: [{ seq: 1, kind: "write", file: "tests/test_orders.py", new_content: PY }] }, Lens.profile("qa-python"), {});
  assert.equal(py.findings.length, 2);
});
