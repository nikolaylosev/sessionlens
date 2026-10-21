"use strict";
/* The file before an edit in a Cursor CLI session (0.1.130). The CLI's store.db keeps no file before an edit, but it
   keeps what the agent read: a Read's result is the file with every tenth line marked "    10|". The last version the
   session saw (a whole Read, a Write's text, a StrReplace applied to it) becomes the edit's file before, the way the
   IDE's database gives it, so a test file the agent read and wrote over in one go shows the test it lost. What must not
   become a version: a Read with offset or limit, one cut short, a message that is no file, a failed call, a StrReplace
   whose old text is not there once, a file a command or another tool may have changed since. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { root, load } = require("./helpers");
const { cursorOutputs } = require(path.join(root, "cursor-db.js"));
const { S, home, transcript, cliDb, shell, result } = require("./cursor-fixtures");

const skip = !S && "node:sqlite is not available";
const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const F = "/w/e2e/cart.spec.ts";
const PW = (...names) =>
  "import { test, expect } from '@playwright/test';\n\n" +
  names.map((n) => `test('${n}', async ({ page }) => {\n  await page.goto('/cart');\n  await expect(page.getByText('${n}')).toBeVisible();\n});\n`).join("\n");
const V1 = PW("total", "discount", "empty cart");
const V2 = PW("total");
// what the CLI's Read returns: every tenth line, the one after the last newline too, marked with its number
const marked = (text) =>
  text
    .split("\n")
    .map((l, i) => ((i + 1) % 10 ? l : String(i + 1).padStart(6) + "|" + l))
    .join("\n");

let n = 0;
const call = (toolName, args) => {
  const id = "t" + ++n;
  return [
    { role: "assistant", content: [{ type: "tool-call", toolCallId: id, toolName, args }] },
    { role: "tool", content: [{ type: "tool-result", toolCallId: id, toolName, result: RESULT[toolName](args) }] },
  ];
};
const RESULT = {
  Read: () => marked(V1),
  Write: (a) => "Wrote contents to " + a.path,
  StrReplace: (a) => `The file ${a.path} has been updated.`,
  Glob: () => "e2e/cart.spec.ts",
  Delete: (a) => "Deleted " + a.path,
};
const failed = (msgs, text) => [msgs[0], { role: "tool", content: [{ ...msgs[1].content[0], result: text }] }];
const read = (args = {}) => call("Read", { path: F, ...args });
const write = (contents) => call("Write", { path: F, contents });
const replace = (old_string, new_string, more = {}) => call("StrReplace", { path: F, old_string, new_string, ...more });

function edits(...steps) {
  const h = home();
  try {
    cliDb(h, steps.flat());
    return cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} }).edits || null;
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
}

test("a whole Read gives the file before a Write and a StrReplace; a StrReplace builds on the version before it", { skip }, () => {
  assert.equal(marked(V1).split("\n")[9], "    10|  await expect(page.getByText('discount')).toBeVisible();", "the shape seen in Cursor");
  assert.deepEqual(edits(read(), write(V2)), [{ path: F, before: V1, after: V2 }]);
  const V1b = V1.replace("test('total'", "test('grand total'");
  assert.deepEqual(edits(read(), replace("test('total'", "test('grand total'"), write(V2)), [
    { path: F, before: V1, after: V1b },
    { path: F, before: V1b, after: V2 },
  ]);
  // replace_all: every place
  assert.deepEqual(edits(read(), replace("page.goto('/cart')", "page.goto('/basket')", { replace_all: true }))[0].after.match(/basket/g).length, 3);
  // a file written in the session needs no Read: a Write's text is the version an edit after it builds on
  assert.deepEqual(edits(write(V2), replace("test('total'", "test('sum'")), [{ path: F, before: V2, after: V2.replace("test('total'", "test('sum'") }]);
});

test("not a version: a part of a file, a cut one, a short text that may be a message", { skip }, () => {
  assert.equal(edits(read({ limit: 200 }), write(V2)), null, "limit");
  assert.equal(edits(read({ offset: 5 }), write(V2)), null, "offset");
  const long = marked(V1).split("\n").slice(0, 10).join("\n") + "\n... 153 lines not shown ...";
  assert.equal(edits(failed(read(), long), write(V2)), null, "cut");
  assert.equal(edits(failed(read(), "File not found: /w/e2e/cart.spec.ts"), write(V2)), null, "a message");
  assert.equal(edits(failed(read(), V1), write(V2)), null, "no line marks: not the CLI's Read");
});

test("the version is dropped: a failed call, an old text not there once, a command or a tool that may change the file", { skip }, () => {
  assert.equal(edits(read(), failed(write(V2), "Error: permission denied"), replace("test('total'", "x")), null, "a failed Write");
  assert.equal(edits(read(), failed(replace("test('total'", "x"), "String not found"), write(V2)), null, "a failed StrReplace");
  assert.equal(edits(read(), replace("'nowhere'", "'x'"), write(V2)), null, "the old text is not in the version known");
  assert.equal(edits(read(), replace("page.goto('/cart')", "x"), write(V2)), null, "there three times, not replace_all");
  for (const cmd of [
    "sed -i '' 's/total/sum/' e2e/cart.spec.ts",
    "git checkout -- .",
    "npx prettier --write .",
    "npx eslint --fix e2e",
    "cat > e2e/cart.spec.ts <<'EOF'\nx\nEOF",
    "rm -rf e2e",
    "for f in e2e/*.ts; do echo '// x' >> \"$f\"; done", // a redirect into a file the command does not name
  ])
    assert.equal(edits(read(), [shell("s" + ++n, cmd), result("s" + n, "Exit code: 0")], write(V2)), null, cmd);
  assert.equal(edits(read(), call("Delete", { path: F }), write(V2)), null, "another tool names the file");
  // a test run, its output sent to the pipe, and a tool that does not name the file leave it known
  for (const cmd of ["npx playwright test 2>&1 | tail -30", "npx playwright test > /dev/null 2>&1", "git status"])
    assert.equal(edits(read(), [shell("s" + ++n, cmd), result("s" + n, "Exit code: 0")], write(V2)).length, 1, cmd);
  assert.equal(edits(read(), call("Glob", { glob_pattern: "**/*.ts" }), write(V2)).length, 1, "Glob");
});

test("the import: a test file the agent read and wrote over shows the test it lost", { skip }, () => {
  const h = home();
  try {
    cliDb(h, [read(), write(V2), shell("c1", "npx playwright test"), result("c1", "Exit code: 0\n\nCommand output:\n  1 passed")].flat());
    const r = cursorOutputs(transcript(h), { home: h, platform: "darwin", env: {} });
    assert.deepEqual([r.source, r.outputs.length, r.edits.length], ["cli", 1, 1]);
    const line = (role, content) => JSON.stringify({ role, message: { content } });
    const text = [
      line("user", [{ type: "text", text: "<user_query>Clean up the cart tests</user_query>" }]),
      line("assistant", [{ type: "tool_use", name: "Read", input: { path: F } }]),
      line("assistant", [{ type: "tool_use", name: "Write", input: { path: F, contents: V2 } }]),
      line("assistant", [{ type: "tool_use", name: "Shell", input: { command: "npx playwright test" } }]),
    ].join("\n");
    const deleted = (opts) =>
      Lens.runChecks(Lens.importAny(text, cfg, { cursorProject: "w", ...opts }), cfg)
        .filter((f) => f.check === "test_deleted")
        .map((f) => f.message);
    assert.deepEqual(deleted({}), [], "without the database: the file before is unknown");
    const found = deleted({ cursorOutputs: r.outputs, cursorEdits: r.edits });
    assert.equal(found.length, 1);
    assert.match(found[0], /discount/);
  } finally {
    fs.rmSync(h, { recursive: true, force: true });
  }
});
