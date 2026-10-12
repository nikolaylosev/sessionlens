"use strict";
/* A Cursor Agent transcript has no file the agent read, so a test file written over in one go had no earlier version.
   Cursor's IDE database keeps every edit's file before and after (cursor-db.js, 0.1.127); the import gives them to the
   edit whose text after matches, the way Claude Code's toolUseResult does, so test_deleted and assert_weakened see a
   rewrite. A test whose assertions moved into a page object (an expect…() method it now calls) has no "fewer
   assertions". A Cursor session imported before without them asks to be imported again, from the file. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const PW = (...tests) =>
  "import { test, expect } from '@playwright/test';\n" + tests.map(([n, body]) => `test('${n}', async ({ page }) => {\n${body}\n});\n`).join("");
const V1 = PW(
  ["total", "  await expect(page.getByText('Total')).toHaveText('Total: 3');"],
  ["discount", "  await expect(page.getByText('Discount')).toBeVisible();"],
);
const V2 = PW(["total", "  await expect(page.getByText('Total')).toHaveText('Total: 3');"]);

// a Cursor transcript: the agent writes /w/e2e/cart.spec.ts over in one go, the file it never read in the transcript
const line = (role, content) => JSON.stringify({ role, message: { content } });
const TRANSCRIPT = [
  line("user", [{ type: "text", text: "<user_query>Clean up the cart tests</user_query>" }]),
  line("assistant", [{ type: "tool_use", name: "Write", input: { path: "/w/e2e/cart.spec.ts", contents: V2 } }]),
  line("assistant", [{ type: "text", text: "Done." }]),
].join("\n");
const steps = (edits) => Lens.importAny(TRANSCRIPT, cfg, { cursorEdits: edits, cursorProject: "w" });
const deleted = (ev) =>
  Lens.runChecks(ev, cfg)
    .filter((f) => f.check === "test_deleted")
    .map((f) => f.message);

test("the file before a Write from Cursor's database: the test it lost is seen", () => {
  assert.deepEqual(deleted(steps(undefined)), [], "without the database: the file's earlier version is unknown");
  const ev = steps([{ path: "/w/e2e/cart.spec.ts", before: V1, after: V2 }]);
  const w = ev.find((e) => e.kind === "write");
  assert.equal(w.prev_content, V1);
  assert.equal(w.new_content, V2);
  assert.equal(deleted(ev).length, 1);
  assert.match(deleted(ev)[0], /discount/);
});

test("an edit of the database is given only to the step it matches: the same file, the same text after", () => {
  assert.equal(steps([{ path: "/w/e2e/other.spec.ts", before: V1, after: V2 }]).find((e) => e.kind === "write").prev_content, undefined, "another file");
  assert.equal(steps([{ path: "/w/e2e/cart.spec.ts", before: V1, after: V1 }]).find((e) => e.kind === "write").prev_content, undefined, "another text");
  // a new file: no earlier version
  assert.equal(steps([{ path: "/w/e2e/cart.spec.ts", before: "", after: V2 }]).find((e) => e.kind === "write").prev_content, undefined);
  // a StrReplace: the file after has its new fragment
  const edit = [
    line("user", [{ type: "text", text: "<user_query>Fix the total</user_query>" }]),
    line("assistant", [{ type: "tool_use", name: "StrReplace", input: { path: "/w/e2e/cart.spec.ts", old_string: "Total: 3", new_string: "Total: 4" } }]),
  ].join("\n");
  const after = V1.replace("Total: 3", "Total: 4");
  const ev = Lens.importAny(edit, cfg, { cursorEdits: [{ path: "/w/e2e/cart.spec.ts", before: V1, after }], cursorProject: "w" });
  const e = ev.find((x) => x.kind === "edit");
  assert.equal(e.prev_content, V1);
  assert.equal(e.new_content, after);
});

test("assertions moved into a page object are no fewer assertions; assertions just gone still are", () => {
  const before = PW([
    "search opens",
    "  await expect(page.getByRole('textbox')).toBeVisible();\n  await expect(page.getByText('Start typing')).toBeVisible();",
  ]);
  const toPO = PW(["search opens", "  await searchPage.open();\n  await searchPage.expectSearchOpen();"]);
  const none = PW(["search opens", "  await searchPage.open();"]);
  const removed = (after) => Lens.compareAsserts(before, after, cfg, "e2e/search.spec.ts").removed.map((r) => `${r.test} ${r.before}→${r.after}`);
  assert.deepEqual(removed(toPO), []);
  assert.deepEqual(removed(none), ["search opens 2→0"]);
  // a call of the same method as before is no move
  const both = (b) => PW(["search opens", `  await searchPage.expectSearchOpen();\n${b}`]);
  assert.deepEqual(
    Lens.compareAsserts(both("  await expect(page).toHaveURL('/');"), both(""), cfg, "e2e/search.spec.ts").removed.map((r) => r.test),
    ["search opens"],
  );
});

test("a Cursor session imported before with edits and no files from the database asks to be imported again (IMPORT_GEN 9)", () => {
  const s = (extra) => Object.assign({ profile: "qa-ts", importGen: 8, agent: "cursor", source_text: TRANSCRIPT, events: steps(undefined) }, extra);
  assert.equal(Lens.cursorEditsMissing(s()), true);
  assert.equal(Lens.needsReimport(s()), true);
  assert.equal(Lens.cursorEditsMissing(s({ source_edits: [{ path: "/w/e2e/cart.spec.ts", before: V1, after: V2 }] })), false);
  assert.equal(Lens.cursorEditsMissing(s({ agent: "claude-code" })), false);
  assert.equal(Lens.cursorEditsMissing(s({ source_text: '{"type":"system","subtype":"init","cwd":"/w"}' })), false, "an Agent CLI log has them itself");
  assert.equal(Lens.needsReimport(s({ importGen: Lens.IMPORT_GEN })), false);
});
