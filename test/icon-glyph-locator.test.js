"use strict";
/* icon_glyph_locator (0.1.127, low, code): a locator whose text is an icon font's character, from Unicode's Private Use
   Area (U+E000–U+F8FF), written as the character, \uE9CC or \u{E9CC}. Found in the owner's Page Object session:
   getByRole('link', { name: '\uE9CC' }). Not a string of such characters outside a locator, not a name with words in
   it, not a character outside the area; in the web profiles only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

const found = (profile, code, file = "tests/pages/header.page.ts") =>
  Lens.runChecks([{ seq: 1, kind: "write", file, new_content: code }], Lens.profile(profile))
    .filter((f) => f.check === "icon_glyph_locator")
    .map((f) => `${f.severity}: ${f.message}`);

test("a locator by an icon font's character: as the character, \\uE9CC or \\u{E9CC}; one finding per file", () => {
  const code = [
    "this.search = page.getByRole('link', { name: '\\uE9CC' });",
    "this.cart = page.getByRole('button', { name: '\uE7A2' });",
    'this.menu = page.locator("a", { hasText: "\\u{F8FF}" });',
  ].join("\n");
  assert.deepEqual(found("qa-ts", code), [
    "low: tests/pages/header.page.ts: 3 locators by an icon font's character (U+E9CC) — it changes with the font; use an accessible name, a title or a test id",
  ]);
  assert.deepEqual(found("qa-cypress", "cy.contains('\\uE9CC').click();", "cypress/e2e/nav.cy.ts").length, 1);
});

test("not reported: no locator on the line, words in the name, a character outside the area, another profile", () => {
  assert.deepEqual(found("qa-ts", "const ICON = '\\uE9CC';"), []);
  assert.deepEqual(found("qa-ts", "page.getByRole('link', { name: '\\uE9CC Search' });"), []);
  assert.deepEqual(found("qa-ts", "page.getByRole('link', { name: '\\u00A9' });"), []);
  assert.deepEqual(found("qa-ts", "page.getByRole('link', { name: '\\uF900' });"), [], "U+F900 is past the area");
  assert.deepEqual(found("qa-python", "page.get_by_role('link', name='\\uE9CC')", "tests/test_nav.py"), []);
});
