"use strict";
/* Requirement IDs as a test management tool gives them (0.1.130): NAV-01, REQ-12, CIP-T123 (Zephyr). In the spec a key
   needs a mark after it (. : ) or a dash), so "UTF-8 encoding is used" stays text, except in a section headed as
   requirements, where a space is enough. A test names a key as written or the way a name has to write it (nav_01, in
   any case), never inside a word or a longer number. And a spec that writes R IDs with the ticket's prefix (TASK-1/R1):
   a test that names R1 covers it (before, every such requirement had "no test"). */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");

load();
const LensSpec = require(M("spec.js"));

const ids = (text) => LensSpec.parse(text).requirements.map((r) => `${r.id} | ${r.text}`);
const covered = (spec, file, code, language) => LensSpec.coverage(LensSpec.parse(spec), [{ seq: 1, kind: "write", file, new_content: code }], language).covered;
const uncovered = (spec, file, code, language) =>
  LensSpec.checks(LensSpec.parse(spec), [{ seq: 1, kind: "write", file, new_content: code }], language)
    .findings.filter((f) => f.check === "spec_uncovered")
    .map((f) => f.message);

test("in the spec: a key with a mark after it, anywhere; with a space only under a requirements heading", () => {
  assert.deepEqual(
    ids(
      [
        "NAV-01. The home page opens",
        "CIP-T123: A user logs in",
        "- REQ-12 — The cart shows the total",
        "1. US-45) A guest can browse",
        "UTF-8 encoding is used everywhere",
        "ISO-8601 dates in the API",
        "R3. The old style still works",
      ].join("\n"),
    ),
    [
      "NAV-01 | The home page opens",
      "CIP-T123 | A user logs in",
      "REQ-12 | The cart shows the total",
      "US-45 | A guest can browse",
      "R3 | The old style still works",
    ],
  );
  assert.deepEqual(ids("## Requirements\nNAV-02 The menu opens\n- NAV-03 The footer has links\n"), [
    "NAV-02 | The menu opens",
    "NAV-03 | The footer has links",
  ]);
  // a space after a key outside requirements: text (a spec with no requirement at all reads every line as one instead)
  assert.deepEqual(ids("## Requirements\nR1. The home page opens\n## Notes\nNAV-02 The menu opens\n"), ["R1 | The home page opens"]);
  assert.deepEqual(
    ids("## Requirements\nR1. The home page opens\n## Out of scope\n- NAV-09: Payments\n"),
    ["R1 | The home page opens"],
    "out of scope is no requirement",
  );
});

const SPEC = "## Requirements\nNAV-01. The home page opens\nCIP-T123: A user logs in\n";

test("a test names a key: in its title, docstring or comment, or in a Python name as nav_01; any case", () => {
  const py = ["def test_nav_01_home():", "    assert page.ok", "", "def test_login():", '    """CIP-T123: a user logs in."""', "    assert user.ok", ""].join(
    "\n",
  );
  assert.deepEqual(covered(SPEC, "tests/test_site.py", py, "python"), { "NAV-01": ["test_nav_01_home"], "CIP-T123": ["test_login"] });
  const ts = [
    "test('[nav-01] the home page opens', async () => {",
    "  expect(1).toBe(1);",
    "});",
    "// CIP_T123",
    "test('login', async () => {",
    "  expect(1).toBe(1);",
    "});",
    "",
  ].join("\n");
  assert.deepEqual(covered(SPEC, "e2e/site.spec.ts", ts, "typescript"), { "NAV-01": ["[nav-01] the home page opens"], "CIP-T123": ["login"] });
  assert.deepEqual(uncovered(SPEC, "tests/test_site.py", py, "python"), []);
});

test("not a key's test: inside a word, a longer number, another number", () => {
  const py = [
    "def test_nav_010():",
    "    assert 1",
    "",
    "def test_xnav01():",
    "    assert 1",
    "",
    "def test_nav_1():",
    "    assert 1",
    "",
    "def test_cip_t1234():",
    "    assert 1",
    "",
  ].join("\n");
  assert.deepEqual(covered(SPEC, "tests/test_site.py", py, "python"), { "NAV-01": [], "CIP-T123": [] });
  assert.deepEqual(uncovered(SPEC, "tests/test_site.py", py, "python"), [
    "Requirement NAV-01 has no test: “The home page opens”",
    "Requirement CIP-T123 has no test: “A user logs in”",
  ]);
});

test("a spec with the ticket's prefix (TASK-1/R1): a test that names R1, or TASK-1/R1, covers it", () => {
  const spec = "## Requirements\nTASK-1/R1. The home page opens\nTASK-1/R2: A user logs in\n";
  const py = ["# TASK-1/R1", "def test_home():", "    assert 1", "", "# R2", "def test_login():", "    assert 1", ""].join("\n");
  assert.deepEqual(covered(spec, "tests/test_site.py", py, "python"), { "TASK-1/R1": ["test_home"], "TASK-1/R2": ["test_login"] });
  assert.deepEqual(uncovered(spec, "tests/test_site.py", py, "python"), []);
});
