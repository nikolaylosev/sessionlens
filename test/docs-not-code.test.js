"use strict";
/* A document the agent writes is no code (0.1.130). "Code written without a plan" (stop_markers_missing) was reported
   at the first write of any file, so a session that only wrote test cases or a README had it, and a session that
   wrote a document first had it at the document. Now the first write of a file that is not a document counts: .md,
   .markdown, .txt, .rst, .adoc are documents; a config is not. The finding keeps its verdict when it moves to the code.
   Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const write = (id, file, content) => [
  { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name: "Write", input: { file_path: "/w/shop/" + file, content } }] } },
  { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } },
];
const session = (...writes) =>
  Lens.importAny(
    [{ type: "user", message: { role: "user", content: "Write the cart tests" } }, ...writes.flat()].map((l) => JSON.stringify(l)).join("\n"),
    cfg,
    {},
  );
const stop = (ev) =>
  Lens.runChecks(ev, cfg)
    .filter((f) => f.check === "stop_markers_missing")
    .map((f) => [ev.find((e) => e.seq === f.seq).file.replace(/^.*\/shop\//, ""), f.message]);
const SPEC = "import { test, expect } from '@playwright/test';\ntest('total', async ({ page }) => {\n  await expect(page.getByText('3')).toBeVisible();\n});\n";

test("a session that only wrote documents has no code written without a plan", () => {
  for (const file of ["docs/test-cases.md", "README.markdown", "notes.txt", "docs/plan.rst", "docs/cases.adoc"])
    assert.deepEqual(stop(session(write("d", file, "# Cases\nNAV-01. The menu\n"))), [], file);
});

test("a document first, then code: the finding is at the code", () => {
  assert.deepEqual(stop(session(write("d", "docs/test-cases.md", "# Cases\n"), write("c", "e2e/cart.spec.ts", SPEC))), [
    ["e2e/cart.spec.ts", "Code written without a plan"],
  ]);
  // a config is no document: it counts as before
  assert.deepEqual(stop(session(write("j", "package.json", "{}\n"), write("c", "e2e/cart.spec.ts", SPEC))), [["package.json", "Code written without a plan"]]);
});

test("a verdict on the finding moves with it from the document to the code", () => {
  const ev = session(write("d", "docs/test-cases.md", "# Cases\n"), write("c", "e2e/cart.spec.ts", SPEC));
  const f = Lens.runChecks(ev, cfg).find((x) => x.check === "stop_markers_missing");
  const doc = ev.find((e) => /test-cases/.test(e.file));
  const before = Lens.fkey({ ...f, seq: doc.seq }); // where it was before 0.1.130
  const s = { findings: [f], verdicts: { [before]: { v: "ok", note: "" } } };
  assert.equal(Lens.carryVerdicts(s), 1);
  assert.deepEqual(Object.keys(s.verdicts), [Lens.fkey(f)]);
});
