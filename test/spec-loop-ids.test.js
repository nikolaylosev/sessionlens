"use strict";
/* A test made in a loop over the cases (0.1.130): test(`${item.id}: …`) inside for (const item of LINKS) or
   LINKS.forEach((item) => …), with the IDs in the array. The title names no ID, so every such requirement had "no
   test" (Tests-mcp: 19 of 26). Now such a test covers the IDs written as strings in the array its title takes a value
   from; only that array, only a title that names the loop variable, only an ID written in full. Made-up content
   only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");

load();
const LensSpec = require(M("spec.js"));

const SPEC = "## Requirements\nNAV-01. The menu is visible\nNAV-02. About opens\nNAV-03. News opens\nNAV-04. Shop opens\n";
const covered = (code) =>
  LensSpec.coverage(LensSpec.parse(SPEC), [{ seq: 1, kind: "write", file: "tests/nav.spec.ts", new_content: code }], "typescript").covered;
const HEAD = "import { test, expect } from '@playwright/test';\n";

test("for…of over a named array: each ID written in it is covered by the test its title makes", () => {
  const code =
    HEAD +
    "const links = [\n  { id: 'NAV-02', name: 'About' },\n  {\n    id: \"NAV-03\",\n    name: 'News',\n  },\n];\n" +
    "const other = [{ id: 'NAV-04' }];\n" +
    "test('NAV-01: the menu is visible', async ({ page }) => {});\n" +
    "for (const item of links) {\n  test(`${item.id}: ${item.name} opens`, async ({ page }) => {\n    await page.goto('/');\n  });\n}\n";
  assert.deepEqual(covered(code), {
    "NAV-01": ["NAV-01: the menu is visible"],
    "NAV-02": ["${item.id}: ${item.name} opens"],
    "NAV-03": ["${item.id}: ${item.name} opens"],
    "NAV-04": [],
  });
});

test("forEach over a named array, and for…of over an array written in the loop", () => {
  const each = HEAD + "const LINKS = [{ id: 'NAV-02' }, { id: 'NAV-04' }];\nLINKS.forEach((link) => {\n  test(`opens ${link.id}`, async () => {});\n});\n";
  assert.deepEqual(covered(each)["NAV-02"], ["opens ${link.id}"]);
  assert.deepEqual(covered(each)["NAV-04"], ["opens ${link.id}"]);
  assert.deepEqual(covered(each)["NAV-03"], []);
  // two loops: the one right above the test is its own
  const both =
    HEAD +
    "const first = [{ id: 'NAV-02' }];\nconst second = [{ id: 'NAV-03' }];\n" +
    "for (const a of first) {\n  test(`${a.id} opens`, async () => {});\n}\n" +
    "second.forEach((b) => {\n  test(`${b.id} shows`, async () => {});\n});\n";
  assert.deepEqual([covered(both)["NAV-02"], covered(both)["NAV-03"]], [["${a.id} opens"], ["${b.id} shows"]]);
  const inline = HEAD + "for (const id of ['NAV-03', 'NAV-04']) {\n  test(`${id} opens`, async () => {});\n}\n";
  assert.deepEqual([covered(inline)["NAV-03"], covered(inline)["NAV-04"], covered(inline)["NAV-02"]], [["${id} opens"], ["${id} opens"], []]);
});

test("not covered: a title without the loop variable, a loop over another array, an ID not written in full", () => {
  const notVar = HEAD + "const links = [{ id: 'NAV-02' }];\nconst who = 'x';\nfor (const item of links) {\n  test(`opens for ${who}`, async () => {});\n}\n";
  assert.deepEqual(covered(notVar)["NAV-02"], [], "the title names another value");
  const plain = HEAD + "const links = [{ id: 'NAV-02' }];\nfor (const item of links) {\n  test('opens the page', async () => {});\n}\n";
  assert.deepEqual(covered(plain)["NAV-02"], [], "a plain title");
  const longer = HEAD + "const links = [{ id: 'NAV-020' }, { id: 'XNAV-03' }];\nfor (const item of links) {\n  test(`${item.id} opens`, async () => {});\n}\n";
  assert.deepEqual([covered(longer)["NAV-02"], covered(longer)["NAV-03"]], [[], []], "a longer ID, an ID inside a word");
  const missing = HEAD + "for (const item of fromElsewhere) {\n  test(`${item.id} opens`, async () => {});\n}\n";
  assert.deepEqual(covered(missing)["NAV-02"], [], "the array is not in the file");
});

test("spec_uncovered and test_without_requirement as before for everything else", () => {
  const code =
    HEAD +
    "const links = [{ id: 'NAV-02' }];\nfor (const item of links) {\n  test(`${item.id} opens`, async () => {});\n}\ntest('the footer', async () => {});\n";
  const r = LensSpec.checks(LensSpec.parse(SPEC), [{ seq: 1, kind: "write", file: "tests/nav.spec.ts", new_content: code }], "typescript");
  assert.deepEqual(
    r.findings.map((f) => [f.check, (/Requirement (\S+)/.exec(f.message) || [])[1] || ""]),
    [
      ["spec_uncovered", "NAV-01"],
      ["spec_uncovered", "NAV-03"],
      ["spec_uncovered", "NAV-04"],
      ["test_without_requirement", ""],
    ],
  );
  assert.match(r.findings[3].message, /the footer/);
});
