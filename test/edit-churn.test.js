"use strict";
/* edit_churn: more writes/edits of one file than the profile threshold (4) for one request of the person (0.1.125:
   until then for the whole session), since 0.1.139 two of them right after a red test run: trying again after a
   failure. What must not count: four writes, two files each edited a few times, edits split by a new message of the
   person, docs, and many edits with no red run before them (a plan carried out). */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

function transcript(steps) {
  const L = [JSON.stringify({ type: "user", message: { role: "user", content: "Write the tests" } })];
  steps.forEach(([kind, a, b], i) => {
    const id = "t" + i;
    if (kind === "user") return L.push(JSON.stringify({ type: "user", message: { role: "user", content: a } }));
    const [name, input] = kind === "write" ? ["Write", { file_path: a, content: b || "export const x = 1;\n" }] : ["Bash", { command: a }];
    L.push(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }));
    const out = kind === "bash" ? b || "ok" : "ok";
    L.push(JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: out }] } }));
  });
  return L.join("\n");
}
const found = (profile, steps) => {
  const cfg = Lens.profile(profile);
  return Lens.runChecks(Lens.importAny(transcript(steps), cfg), cfg)
    .filter((f) => f.check === "edit_churn")
    .map((f) => `${f.severity}: ${f.message}`);
};

const RED = ["bash", "npx playwright test", "  1 failed\n  1) [chromium] › e2e/cart.spec.ts:3:1 › total"];
const GREEN = ["bash", "npx playwright test", "  1 passed"];
// n writes of a file, each with a text of its own, the first `red` of them each right after a red run
let version = 0;
const tries = (n, red, file = "e2e/cart.spec.ts") =>
  Array.from({ length: n }, (_, i) => {
    const w = ["write", file, `export const x = ${version++};\n`];
    return i < red ? [RED, w] : [w];
  }).flat();

test("five writes of one file, two of them right after a red run: medium, counted at the fifth write", () => {
  assert.deepEqual(found("qa-ts", tries(5, 2)), ["medium: e2e/cart.spec.ts: 5 edits for one request — poking instead of understanding"]);
});

/* 0.1.139: in the owner's session a review changed eight files as its approved plan said and ran each file's tests
   green: eight findings. Over the owner's sessions 84 of 193 findings had no edit after a red run. */
test("not reported: many writes with fewer than two right after a red run, a green run between, a file put back", () => {
  assert.deepEqual(found("qa-ts", tries(6, 0)), [], "a plan carried out");
  assert.deepEqual(found("qa-ts", tries(6, 1)), [], "one try after a failure");
  const file = "e2e/cart.spec.ts";
  assert.deepEqual(found("qa-ts", [RED, GREEN, ["write", file], RED, GREEN, ...tries(4, 0)]), [], "the last run before each was green");
  // a test proven to fail: broken, red, put back; twice
  const v1 = "export const PASSWORD = 'right';\n",
    v2 = "export const PASSWORD = 'broken';\n";
  const proof = [["write", file, v2], RED, ["write", file, v1]];
  assert.deepEqual(found("qa-ts", [["write", file, v1], ...proof, ...proof]), [], "put back after a red run is no try");
});

test("not reported: four writes of one file, or five writes split across two files", () => {
  assert.deepEqual(found("qa-ts", tries(4, 4)), []);
  const ab = ["a", "b", "a", "b", "a"].flatMap((x) => [RED, ["write", `e2e/${x}.spec.ts`]]);
  assert.deepEqual(found("qa-ts", ab), []);
});

test("per request: edits split by a new message of the person start from zero; five in one request still count", () => {
  assert.deepEqual(found("qa-ts", [...tries(3, 3), ["user", "Now cover the navigation too"], ...tries(2, 2)]), []);
  assert.deepEqual(found("qa-ts", [...tries(2, 2), ["user", "Now cover the navigation too"], ...tries(5, 2)]), [
    "medium: e2e/cart.spec.ts: 5 edits for one request — poking instead of understanding",
  ]);
});

test("docs are not counted: the readme updated along with every change", () => {
  for (const file of ["README.md", "docs/notes.txt", "docs/guide.rst"]) assert.deepEqual(found("qa-ts", tries(6, 6, file)), [], file);
  // a config next to it still counts
  assert.equal(found("qa-ts", tries(5, 2, "playwright.config.ts")).length, 1);
});
