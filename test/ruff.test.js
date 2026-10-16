"use strict";
/* Ruff in the Python engine (0.1.129): each Ruff rule SessionLens takes, under its check and severity; the rules left
   out (PLR2004 on `== 200`, S105 on a test user's password, PT015/B011 on `assert False`, S110 next to tree-sitter);
   one swallowed_exception per line; T100 replaces the regex breakpoint; without Ruff the engine runs on tree-sitter
   alone and its note says so, and while Ruff loads it is not ready; the URI of ruff.wasm reaches the page; and
   media/vendor-ruff.js, media/ruff.wasm are what scripts/vendor-ruff.js makes of the package. Real engines. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { load, M } = require("./helpers");
const { loadEngines } = require("../perf/snapshot-lint");
const { bootHost, openPage } = require("./host-panel");

const { Lens } = load();
const LensLint = require(M("lint.js"));

const F = "tests/test_orders.py";
const run = (code, profile = "qa-python") => LensLint.run({ events: [{ seq: 1, kind: "write", file: F, new_content: code }] }, Lens.profile(profile), {});
const found = (code, profile) =>
  run(code, profile)
    .findings.map((f) => `${f.line} ${f.check} ${f.severity} ${f.rule}`)
    .sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));

const CODE = `import pytest
import requests
from pprint import pprint


def test_create_order(base_url):
    r = requests.post(base_url + "/orders", json={"item": "apple"}, timeout=5)
    r.status_code == 201
    print(r.json())
    pprint(r.headers)
    assert r.json()["id"] and r.json()["item"] == "apple"


def test_errors(base_url):
    with pytest.raises(Exception):
        requests.get(base_url + "/x", timeout=5).raise_for_status()
    with pytest.raises(ValueError):
        int("x")
    breakpoint()
    try:
        requests.delete(base_url + "/orders/1", timeout=5)
        assert False
    except Exception as e:
        log(e)
    try:
        assert requests.get(base_url, timeout=5).ok
    except:
        log("x")
`;

test("each Ruff rule SessionLens takes, under its check and severity", async () => {
  await loadEngines();
  assert.deepEqual(found(CODE), [
    "8 weak_assert high ruff/B015",
    "9 debug_leftover low ruff/T201",
    "10 debug_leftover low ruff/T203",
    "11 assertion_roulette low ruff/PT018",
    "15 weak_assert medium ruff/B017",
    "15 weak_assert medium ruff/PT011",
    "19 debug_leftover medium ruff/T100",
    "23 swallowed_exception high ruff/BLE001",
    "27 swallowed_exception high ruff/E722",
  ]);
  // pytest.raises(ValueError) with no match= on line 17 is the fourth weak_assert: three per check and file are shown
  assert.deepEqual(
    run(CODE)
      .findings.filter((x) => / \(\+1 more of the same in this file\)$/.test(x.message))
      .map((x) => x.check),
    ["weak_assert"],
  );
  // qa-api's .py files get them too
  assert.deepEqual(found(CODE, "qa-api"), found(CODE));
  const f = run(CODE).findings.find((x) => x.rule === "ruff/B015");
  assert.equal(f.message, `${F}:8 — Pointless comparison. Did you mean to assign a value? Otherwise, prepend \`assert\` or remove it [ruff/B015]`);
});

test("left out: a magic status code, a test user's password, assert False; except-pass is tree-sitter's alone", async () => {
  await loadEngines();
  const code = `import requests


def test_login(base_url):
    password = "S3cret!"
    r = requests.post(base_url + "/login", json={"password": password}, timeout=5)
    assert r.status_code == 200
    assert len(r.json()) == 3
    try:
        r.raise_for_status()
    except Exception:
        pass
    assert False
`;
  assert.deepEqual(found(code), ["11 swallowed_exception high python/swallowed-exception"]);
  // a syntax error is no finding (a fragment in a message often has one): Ruff then reports nothing, tree-sitter still
  // reads what it can
  assert.deepEqual(
    run("def test_x(:\n    print(1)\n").findings.map((x) => x.rule),
    ["python/no-assertion-after-action"],
  );
});

test("test_shadowed: a second test with the same name hides the first; a helper or an import defined twice is not one", async () => {
  await loadEngines();
  const code = `from helpers import make_order
import pytest


def make_order():
    return {}


def test_create_order(client):
    assert client.post("/orders").status_code == 201


class TestOrders:
    def test_get(self, client):
        assert client.get("/orders/1").ok

    def test_get(self, client):
        assert client.get("/orders/2").ok


@pytest.mark.parametrize("x", [1, 2])
def test_create_order(client, x):
    assert client.post("/orders", json={"x": x}).status_code == 201
`;
  assert.deepEqual(found(code), ["17 test_shadowed high ruff/F811", "22 test_shadowed high ruff/F811"]);
  assert.deepEqual(found(code, "qa-api"), found(code));
  assert.equal(
    run(code).findings.find((f) => f.line === 22).message,
    `${F}:22 — \`test_create_order\` is defined again: the test of line 9 is replaced and never runs [ruff/F811]`,
  );
  // two tests with names of their own: nothing
  assert.deepEqual(
    found(
      code
        .replace(
          'def test_get(self, client):\n        assert client.get("/orders/2")',
          'def test_get_other(self, client):\n        assert client.get("/orders/2")',
        )
        .replace(/(@pytest[^\n]*\n)def test_create_order/, "$1def test_create_order_x"),
    ),
    [],
  );
});

test("Ruff's breakpoint replaces the regex finding; its print() has no regex twin", async () => {
  await loadEngines();
  const cfg = Lens.profile("qa-python");
  const events = [{ seq: 1, kind: "write", file: F, new_content: "def test_total(cart):\n    breakpoint()\n    print(cart)\n    assert cart.total() == 3\n" }];
  const lr = LensLint.run({ events }, cfg, {});
  const debug = (findings) =>
    findings
      .filter((f) => f.check === "debug_leftover")
      .map((f) => `${f.source} ${f.rule || f.kind}`)
      .sort();
  assert.deepEqual(debug(Lens.runChecks(events, cfg)), ["formal breakpoint"]);
  assert.deepEqual(debug(LensLint.merge(Lens.runChecks(events, cfg), lr.findings, Lens.lintLanguage(cfg))), ["lint ruff/T100", "lint ruff/T201"]);
});

test("without Ruff the engine runs on tree-sitter alone; while Ruff loads it is not ready", async () => {
  await loadEngines();
  const real = globalThis.LensLintRuff;
  try {
    delete globalThis.LensLintRuff;
    const lr = run(CODE);
    assert.equal(lr.note, "tree-sitter: 0 findings in 1 block");
    assert.deepEqual(lr.findings, []);
    globalThis.LensLintRuff = { settled: () => false, isReady: () => false };
    assert.equal(globalThis.LensLintPython.isReady(), false, "a result without Ruff is not taken while it loads");
    globalThis.LensLintRuff = { settled: () => true, isReady: () => false };
    assert.equal(globalThis.LensLintPython.isReady(), true, "Ruff failed: tree-sitter alone");
  } finally {
    globalThis.LensLintRuff = real;
  }
  assert.equal(run(CODE).note, "tree-sitter and Ruff: 9 findings in 1 block");
});

test("the page gets the URI of ruff.wasm, and the Python engine loads Ruff's files", async () => {
  const p = await openPage(bootHost({}));
  await p.ready();
  assert.match(p.window.SL_WASM_URIS_PYTHON.ruff, /ruff\.wasm$/);
  assert.match(p.window.SL_ENGINE_URIS["vendor-ruff.js"], /vendor-ruff\.js$/);
  assert.deepEqual(LensLint.ENGINE_FILES.python.js, ["tree-sitter.js", "vendor-ruff.js", "lint-ruff.js", "lint-python.js"]);
  p.close();
});

const PKG = path.join(__dirname, "..", "node_modules", "@astral-sh", "ruff-wasm-web", "package.json");
test("media/vendor-ruff.js and media/ruff.wasm are what scripts/vendor-ruff.js makes of the pinned package", { skip: !fs.existsSync(PKG) }, () => {
  const V = require("../scripts/vendor-ruff.js");
  const { js, wasm } = V.build();
  assert.equal(fs.readFileSync(V.OUT_JS, "utf8"), js, "run: node scripts/vendor-ruff.js");
  assert.ok(fs.readFileSync(V.OUT_WASM).equals(wasm), "run: node scripts/vendor-ruff.js");
  const pinned = require("../package.json").devDependencies["@astral-sh/ruff-wasm-web"];
  assert.equal(require(PKG).version, pinned);
  assert.match(js, new RegExp(`version: "${pinned.replace(/\./g, "\\.")}"`));
});
