"use strict";
/* An edit applied with its new text as it is (0.1.125). String.replace(old, new) read $&, $`, $' and $$ in the new text
   as patterns. The owner's Cursor session of 11 Oct 2026 (Tests-mcp) escaped a regular expression ('\\$&') and ended a
   template with `…${escaped}$`: the old text and the start of the file went into the file, header.page.ts was 118 lines
   instead of 64, and ESLint could not parse it ("Unexpected token Locator"). Cursor's StrReplace, Claude Code's Edit
   without a result and with one. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");
const { loadEngines } = require("../perf/snapshot-lint");

const { Lens } = load();
const LensLint = require(M("lint.js"));
const cfg = Lens.profile("qa-ts");

const FILE = "/w/shop/tests/pages/header.page.ts";
const BEFORE = `import { expect, type Locator, type Page } from '@playwright/test';

export class HeaderPage {
  constructor(readonly page: Page) {}

  async expectPath(path: string): Promise<void> {
    await expect(this.page).toHaveURL(path);
  }
}
`;
const OLD = "    await expect(this.page).toHaveURL(path);\n";
// every pattern String.replace knows: $& (the match), $\` (before it), $' (after it), $$ (one $)
const NEW = `    const escaped = path.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    await expect(this.page).toHaveURL(new RegExp(\`^https://shop\\\\.example\${escaped}$\`));
    // costs $$5, ends with $' and $\`
`;
const AFTER = BEFORE.split(OLD).join(NEW);
const last = (ev) => ev.filter((e) => e.file === "tests/pages/header.page.ts" && e.new_content).pop().new_content;

test("Cursor's StrReplace keeps $&, $`, $' and $$ of the new text", () => {
  const line = (input, name) => JSON.stringify({ role: "assistant", message: { content: [{ type: "tool_use", name, input }] } });
  const text = [
    JSON.stringify({ role: "user", message: { content: [{ type: "text", text: "<user_query>Write the page object</user_query>" }] } }),
    line({ path: FILE, contents: BEFORE }, "Write"),
    line({ path: FILE, old_string: OLD, new_string: NEW }, "StrReplace"),
  ].join("\n");
  assert.equal(last(Lens.importAny(text, cfg, { cursorProject: "w-shop" })), AFTER);
});

test("Claude Code's Edit keeps them, without a result and with one", () => {
  const rec = (o) => JSON.stringify(o);
  const use = (id, name, input) => rec({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } });
  const done = (id, tur) =>
    rec(
      Object.assign(
        { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } },
        tur ? { toolUseResult: tur } : {},
      ),
    );
  const head = [
    rec({ type: "user", cwd: "/w/shop", message: { role: "user", content: "Write the page object" } }),
    use("w", "Write", { file_path: FILE, content: BEFORE }),
    done("w"),
  ];
  const edit = use("e", "Edit", { file_path: FILE, old_string: OLD, new_string: NEW });
  assert.equal(last(Lens.importAny([...head, edit].join("\n"), cfg)), AFTER, "no result");
  assert.equal(
    last(Lens.importAny([...head, edit, done("e", { originalFile: BEFORE, oldString: OLD, newString: NEW })].join("\n"), cfg)),
    AFTER,
    "with its result",
  );
});

test("the file as the agent left it parses: ESLint runs on it", async () => {
  await loadEngines();
  const lr = LensLint.run({ events: [{ seq: 1, kind: "write", file: "tests/pages/header.page.ts", new_content: AFTER }] }, cfg, {});
  assert.equal(lr.ran, true, lr.note);
  assert.deepEqual(lr.why, []);
});

test("Import again for a session imported before whose kept text has an edit with such a $", () => {
  const edit = (neu) =>
    JSON.stringify({
      role: "assistant",
      message: { content: [{ type: "tool_use", name: "StrReplace", input: { path: FILE, old_string: OLD, new_string: neu } }] },
    });
  const s = (neu, gen = 6) => ({ profile: "qa-ts", importGen: gen, source_text: edit(neu), events: [] });
  for (const neu of [NEW, "'\\\\$&'", "costs $$5", "ends with $'", "ends with $`"]) assert.equal(Lens.needsReimport(s(neu)), true, neu);
  assert.equal(Lens.needsReimport(s(NEW, Lens.IMPORT_GEN)), false, "imported with this version");
  // $1 stays as it is (the old text is no regular expression); a plain $ too
  assert.equal(Lens.needsReimport(s("const re = /(a)/; s.replace(re, '$1')")), false);
  assert.equal(Lens.needsReimport(s("costs $5")), false);
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 6, source_text: "", events: [] }), false, "no kept text");
});
