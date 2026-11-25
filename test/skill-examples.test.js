"use strict";
/* A skill's examples/ folder (LensRules.skillExamples, 0.1.139; until then inside the panel's buildExamples, untested).
   One file at one step is one copy: in the owner's skill raw_locator/ and positional_locator/ held the same two files
   byte for byte, since both rules had a confirmed finding on them at the same step. Now the second rule refers to the
   first one's copy, and the README keeps a row per rule. A row also says when the session changed the file later: the
   example is the version at the finding's step. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { LensRules } = load();

const LOGIN = "export const form = (page) => page.locator('input[name=\"_username\"]').first();\n";
const SPEC = "test('total', async () => {\n  expect(4).toBe(4);\n});\n";
const session = (id, events) => ({ id, name: id, task: "", events });
const s1 = session("DD-004", [
  { seq: 101, kind: "write", file: "qa-ts/helpers/login.ts", new_content: LOGIN },
  { seq: 112, kind: "write", file: "qa-ts/tests/unit/totp.spec.ts", new_content: SPEC },
  { seq: 150, kind: "edit", file: "qa-ts/helpers/login.ts", new_content: LOGIN + "// changed\n" },
]);
const found = (s, seq, message) => ({ s, f: { seq, message } });
const run = (confirmed, opts = { perRule: 2, maxChars: 40000 }) => LensRules.skillExamples(Object.keys(confirmed), (k) => confirmed[k], opts);

test("one file at one step is one copy, referred to by every rule that needs it", () => {
  const r = run({
    raw_locator: [found(s1, 101, "login.ts:12 — raw locator")],
    positional_locator: [found(s1, 101, "login.ts:16 — first()")],
    magic_number: [found(s1, 112, "totp.spec.ts: 4")],
  });
  assert.deepEqual(
    r.files.map((f) => f.path),
    ["examples/README.md", "examples/raw_locator/1-login.ts", "examples/magic_number/1-totp.spec.ts"],
  );
  assert.equal(r.files[1].content, LOGIN);
  assert.deepEqual(
    r.rows.map((x) => `${x.k} → ${x.path}`),
    [
      "raw_locator → examples/raw_locator/1-login.ts",
      "positional_locator → examples/raw_locator/1-login.ts",
      "magic_number → examples/magic_number/1-totp.spec.ts",
    ],
  );
  const readme = r.files[0].content.split("\n").filter((l) => l.startsWith("| `"));
  assert.deepEqual(readme, [
    "| `raw_locator/1-login.ts` | raw_locator | DD-004 | 101 | login.ts:12 — raw locator (the session changed this file later, at step 150) |",
    "| `raw_locator/1-login.ts` | positional_locator | DD-004 | 101 | login.ts:16 — first() (the session changed this file later, at step 150) |",
    "| `magic_number/1-totp.spec.ts` | magic_number | DD-004 | 112 | totp.spec.ts: 4 |",
  ]);
});

test("the same file at another step is another version, so another copy", () => {
  const r = run({
    raw_locator: [found(s1, 101, "raw")],
    positional_locator: [found(s1, 150, "first()")],
  });
  assert.deepEqual(
    r.files.map((f) => f.path),
    ["examples/README.md", "examples/raw_locator/1-login.ts", "examples/positional_locator/1-login.ts"],
  );
  assert.equal(r.files[2].content, LOGIN + "// changed\n");
  assert.ok(
    r.files[0].content.includes("| `positional_locator/1-login.ts` | positional_locator | DD-004 | 150 | first() |"),
    "the last version has no later change",
  );
});

test("per rule: one session first, at most perRule, a finding on the same file counted once", () => {
  const s2 = session("S2", [{ seq: 7, kind: "write", file: "e2e/cart.ts", new_content: LOGIN }]);
  const r = run(
    {
      raw_locator: [found(s1, 101, "a"), found(s1, 101, "b"), found(s1, 112, "c"), found(s2, 7, "d")],
    },
    { perRule: 2, maxChars: 40000 },
  );
  assert.deepEqual(
    r.rows.map((x) => `${x.session}:${x.seq}`),
    ["DD-004:101", "S2:7"],
  );
  assert.deepEqual(
    r.files.map((f) => f.path),
    ["examples/README.md", "examples/raw_locator/1-login.ts", "examples/raw_locator/2-cart.ts"],
  );
});

test("a secret is masked once, in the one copy, and a long file is cut", () => {
  const key = "sk-ant-api03-" + "a".repeat(90);
  const s = session("S3", [{ seq: 1, kind: "write", file: "tests/api.spec.ts", new_content: `const KEY = "${key}";\n` + "x".repeat(100) }]);
  const r = run({ hardcoded_secret: [found(s, 1, "secret")], raw_locator: [found(s, 1, "raw")] }, { perRule: 2, maxChars: 60 });
  assert.equal(r.files.length, 2);
  assert.ok(!r.files[1].content.includes(key));
  assert.equal(r.masked, 1, "counted once");
  assert.equal(r.files[1].content.length <= 60, true);
  assert.match(r.files[0].content, /secret masked; cut at 60 characters/);
});

test("nothing to show: no folder", () => {
  const chat = session("S4", [{ seq: 1, kind: "message", text: "x", new_content: "a", fragment_only: true }]);
  assert.deepEqual(run({ raw_locator: [found(chat, 1, "raw")], weak_assert: [] }), { files: [], rows: [], masked: 0 });
});
