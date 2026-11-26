"use strict";
/* The method and process checks that only the demo session counted: fix_after_fail_without_triage,
   peeked_at_src_before_plan, assumption_instead_of_question, scope_creep, stop_markers_missing. Paths are relative to
   the session's folder, as the import makes them. What must not count is next to each case. Until 0.1.119 a src
   folder deeper in the path was not seen by peeked_at_src_before_plan, scope_creep compared paths with the plan's
   exactly and did not see a plan that named only e2e/ files, and an upper-case word that contains PLAN counted as a
   plan. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

// steps: ["user", text] | ["say", text] (the agent) | ["write", file, content] | ["edit", file, old, new]
//        | ["read", file] | ["grep", path] | ["bash", command, output]
function transcript(steps) {
  const L = [];
  steps.forEach(([kind, a, b, c], i) => {
    const id = "t" + i;
    if (kind === "say") return L.push(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: a }] } }));
    if (kind === "user") return L.push(JSON.stringify({ type: "user", message: { role: "user", content: a } }));
    const tools = {
      write: ["Write", { file_path: a, content: b }],
      edit: ["Edit", { file_path: a, old_string: b, new_string: c }],
      read: ["Read", { file_path: a }],
      grep: ["Grep", { pattern: "total", path: a }],
      bash: ["Bash", { command: a }],
    };
    const [name, input] = tools[kind];
    L.push(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }));
    L.push(
      JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: kind === "bash" ? b : "ok" }] } }),
    );
  });
  return L.join("\n");
}
const findings = (steps, check) => {
  const cfg = Lens.profile("qa-ts");
  return Lens.runChecks(Lens.importAny(transcript(steps), cfg), cfg).filter((f) => f.check === check);
};
const found = (steps, check) => findings(steps, check).map((f) => `${f.severity}: ${f.message}`);

const TASK = ["user", "Write tests for the cart"];
const PLAN = ["say", "PLAN\n| Requirement | Test |\n|---|---|\n| R1 | tests/cart.spec.ts |"];
const APPROVED = ["user", "Approved"];
const SPEC = "tests/cart.spec.ts";
const WRITE = ["write", SPEC, "test('total', async () => {\n  expect(cart.total()).toBe(3);\n});\n"];
const RED = ["bash", "npx playwright test", "  1 passed\n  1 failed\n  1) [chromium] › tests/cart.spec.ts:3:1 › total"];
const FIX = ["edit", SPEC, "toBe(3)", "toBe(4)"];

test("fix_after_fail_without_triage: an edit right after a red run, once per run", () => {
  const f = findings([TASK, WRITE, RED, FIX, ["edit", SPEC, "toBe(4)", "toBe(5)"]], "fix_after_fail_without_triage");
  assert.deepEqual(
    f.map((x) => `${x.severity}: ${x.message}`),
    ["high: Edited tests/cart.spec.ts right after a failure (seq 2) with no triage: product bug / test bug / spec defect"],
  );
  assert.equal(f[0].seq, 3, "the first edit after the run");
});

test("fix_after_fail_without_triage, not reported: triage first (English or Russian), the user speaks first, a green run, a non-code file", () => {
  assert.deepEqual(found([TASK, WRITE, RED, ["say", "Hypothesis: a test bug, the total includes tax."], FIX], "fix_after_fail_without_triage"), []);
  assert.deepEqual(found([TASK, WRITE, RED, ["say", "Гипотеза: ошибка теста."], FIX], "fix_after_fail_without_triage"), []);
  assert.deepEqual(found([TASK, WRITE, RED, ["user", "It is a test bug, fix it"], FIX], "fix_after_fail_without_triage"), []);
  assert.deepEqual(found([TASK, WRITE, ["bash", "npx playwright test", "  2 passed"], FIX], "fix_after_fail_without_triage"), []);
  assert.deepEqual(found([TASK, WRITE, RED, ["write", "NOTES.md", "todo\n"]], "fix_after_fail_without_triage"), []);
});

/* 0.1.132: a wrong assertion named as such is a triage too (a Cursor agent in CI: "Two assertion bugs: the counter
   should be …"), in English and in Russian. */
test("fix_after_fail_without_triage, not reported: the assertion named as the mistake", () => {
  for (const said of [
    'Two assertion bugs: the counter should be "2 items left".',
    "The tests are wrong: TodoMVC uses the class completed.",
    "Wrong assertion, the total is 4.",
    "An incorrect assertion: the app shows 4.",
    "The assertion is wrong here.",
    "Both assertions are wrong.",
    "A wrong expectation in the test.",
    "This is a broken test.",
    "Неверная проверка: итог равен 4.",
    "Неверный ассерт в тесте.",
    "Ошибка в ассерте: ждём 4.",
    "Ошибка в проверке итога.",
    "Тесты неверны: класс completed.",
  ])
    assert.deepEqual(found([TASK, WRITE, RED, ["say", said], FIX], "fix_after_fail_without_triage"), [], said);
  // said before the red run, it is no triage of it
  assert.equal(found([TASK, WRITE, ["say", "Looks like assertion bugs."], RED, FIX], "fix_after_fail_without_triage").length, 1);
});

/* 0.1.136, as the agents of the CI lab's pilot 5 wrote it: a task with a wrong test, where all 12 named the tests as wrong
   before the edit and 11 got a high finding. In bold, with a typographic apostrophe, in the words the rules file asks for. */
test("fix_after_fail_without_triage, not reported: whose mistake it is, as agents write it", () => {
  for (const said of [
    "The failures are the **test's** mistake: the app correctly shows `2 items left`.",
    "The failures are the tests’ mistake: the counter should be 2.",
    "**Whose mistake:** the test’s mistake.",
    "It is the app's mistake.",
    "This is the requirement's mistake.",
    "That is the test's fault.",
    "There is a mistake in the test.",
    "Two tests assert the wrong state after the first todo is completed.",
    "Identifying incorrect test expectations: the demo behaves correctly.",
    "Fixing incorrect expectations.",
    "So the counter and Active-filter expectations are wrong.",
    "The expectation is wrong.",
    "Two footer assertions don't match the setup.",
    "The assertions do not match the requirement.",
    "The expectations don’t match the setup.",
    "Неверные ожидания в тесте.",
  ])
    assert.deepEqual(found([TASK, WRITE, RED, ["say", said], FIX], "fix_after_fail_without_triage"), [], said);
  // what still says nothing of whose mistake it is
  for (const said of ["Updating the test.", "Let me fix the assertions.", "Fixing the tests now.", "The assertions need another look."])
    assert.match(found([TASK, WRITE, RED, ["say", said], FIX], "fix_after_fail_without_triage")[0], /^high: /, said);
  // a mismatch named is half of the triage, as a cause is
  assert.match(
    found([TASK, WRITE, RED, ["say", "Identifying a mismatch between the setup and two tests."], FIX], "fix_after_fail_without_triage")[0],
    /^medium: /,
  );
  assert.match(found([TASK, WRITE, RED, ["say", "Вижу расхождение между подготовкой и тестами."], FIX], "fix_after_fail_without_triage")[0], /^medium: /);
});

/* 0.1.139: a new test file that is not one of the failed ones is new work, not a fix. In the owner's session the agent
   wrote the next scenario's spec after another spec's red run, and got a high finding on it; over the owner's local
   sessions 27 such findings, all on new test files. */
test("fix_after_fail_without_triage, not reported: a new test file after the red run is new work, not a fix", () => {
  const NEXT = ["write", "tests/checkout.spec.ts", "test('pay', async () => {\n  expect(paid).toBe(true);\n});\n"];
  const check = "fix_after_fail_without_triage";
  assert.deepEqual(found([TASK, WRITE, RED, NEXT], check), []);
  assert.deepEqual(found([TASK, WRITE, RED, ["write", "tests/test_checkout.py", "def test_pay():\n    assert paid\n"]], check), [], "Python");
  // the edit after it is still the fix of the red run
  const f = findings([TASK, WRITE, RED, NEXT, FIX], check);
  assert.deepEqual(
    f.map((x) => `${x.severity}: ${x.message}`),
    ["high: Edited tests/cart.spec.ts right after a failure (seq 2) with no triage: product bug / test bug / spec defect"],
  );
  assert.equal(f[0].seq, 4);
  // still a fix: a new helper (one that was missing may be what failed), also in a tests folder
  assert.equal(found([TASK, WRITE, RED, ["write", "tests/helpers/cart.ts", "export const cart = {};\n"]], check).length, 1);
  // still a fix: a test file the run named, one the session saw before (read, a shell read, written), or of a known version
  const MISSING = ["bash", "npx playwright test", "  1 failed\n  1) [chromium] › tests/checkout.spec.ts:1:1 › pay"];
  assert.equal(found([TASK, MISSING, NEXT], check).length, 1, "the failed file");
  assert.equal(found([TASK, ["read", "tests/checkout.spec.ts"], WRITE, RED, NEXT], check).length, 1, "read before");
  assert.equal(found([TASK, ["bash", "cat tests/checkout.spec.ts", "x"], WRITE, RED, NEXT], check).length, 1, "a shell read before");
  assert.equal(found([TASK, NEXT, WRITE, RED, NEXT], check).length, 1, "written before");
  assert.equal(found([TASK, WRITE, RED, ["write", SPEC, "test('total', () => {});\n"]], check).length, 1, "the failed file written anew");
  // an edit is of a file that is there, also one the session did not see before
  assert.equal(found([TASK, WRITE, RED, ["edit", "tests/old.spec.ts", "a", "b"]], check).length, 1, "an edit of an older test");
});

/* Since 0.1.139 putting a file back as it was before the agent's last change of it, made before the red run, is no fix:
   the owner asks agents to prove that tests can fail (break the password, see red, put it back), and in the owner's
   session both put-backs were high findings. Taking back a new assertion still shows as a weakened test. */
test("fix_after_fail_without_triage, not reported: a file put back as it was before the change that made the run red", () => {
  const check = "fix_after_fail_without_triage";
  const HELPER = "helpers/stand.ts"; // outside the tests folders, as in qa-ts: no prev_content kept
  const STAND = ["write", HELPER, "export const PASSWORD = 'right';\n"];
  const BREAK = ["edit", HELPER, "'right'", "'broken'"];
  const BACK = ["edit", HELPER, "'broken'", "'right'"];
  assert.deepEqual(found([TASK, STAND, WRITE, BREAK, RED, BACK], check), [], "a helper put back");
  assert.deepEqual(found([TASK, WRITE, FIX, RED, ["edit", SPEC, "toBe(4)", "toBe(3)"]], check), [], "the spec put back");
  // the run's failure is over: the next break and its own put-back are not fixes of it either
  const BREAK_SPEC = ["edit", SPEC, "toBe(3)", "toBe(9)"];
  assert.deepEqual(found([TASK, STAND, WRITE, BREAK, RED, BACK, BREAK_SPEC, RED, ["edit", SPEC, "toBe(9)", "toBe(3)"]], check), []);
  // still a fix: another text than before, a fix made first, a file the agent did not change before the run
  assert.equal(found([TASK, STAND, WRITE, BREAK, RED, ["edit", HELPER, "'broken'", "'other'"]], check).length, 1, "another text");
  assert.equal(found([TASK, WRITE, RED, FIX, ["edit", SPEC, "toBe(4)", "toBe(3)"]], check).length, 1, "a fix, then put back: the fix counts");
  assert.equal(found([TASK, STAND, WRITE, RED, BREAK], check).length, 1, "no change before the run");
  // taking back a new assertion after a red run is a weakened test
  const MORE = ["edit", SPEC, "toBe(3);", "toBe(3);\n  expect(cart.tax()).toBe(1);"];
  const LESS = ["edit", SPEC, "toBe(3);\n  expect(cart.tax()).toBe(1);", "toBe(3);"];
  assert.deepEqual(found([TASK, WRITE, MORE, RED, LESS], check), []);
  assert.equal(found([TASK, WRITE, MORE, RED, LESS], "assert_weakened").length, 1, "assert_weakened still sees it");
});

test("peeked_at_src_before_plan: product code read or searched before the plan was approved", () => {
  const peeked = (file) => `high: Read ${file} before the plan was approved — product code is off-limits during generation`;
  assert.deepEqual(found([TASK, ["read", "src/cart.ts"], WRITE], "peeked_at_src_before_plan"), [peeked("src/cart.ts")], "no plan at all");
  assert.deepEqual(found([TASK, PLAN, ["read", "src/cart.ts"], APPROVED], "peeked_at_src_before_plan"), [peeked("src/cart.ts")], "a plan, not yet approved");
  assert.deepEqual(found([TASK, ["grep", "src"], PLAN, APPROVED], "peeked_at_src_before_plan"), [peeked("src")]);
  assert.deepEqual(found([TASK, ["read", "./src/cart.ts"], PLAN, APPROVED], "peeked_at_src_before_plan"), [peeked("./src/cart.ts")]);
});

test("peeked_at_src_before_plan, not reported: after the approval, test code, a folder that only starts with src", () => {
  assert.deepEqual(found([TASK, PLAN, APPROVED, ["read", "src/cart.ts"]], "peeked_at_src_before_plan"), []);
  assert.deepEqual(found([TASK, ["read", SPEC], PLAN, APPROVED], "peeked_at_src_before_plan"), []);
  assert.deepEqual(found([TASK, ["read", "srcgen/cart.ts"], PLAN, APPROVED], "peeked_at_src_before_plan"), []);
});

test("peeked_at_src_before_plan, not reported: reading back a file the agent wrote or edited earlier (0.1.125)", () => {
  const PO = "src/pages/SearchPage.ts";
  const page = ["write", PO, "export class SearchPage {}\n"];
  // the owner's Cursor session with the page objects in src/pages: written, then read back with Read, cat, ./ or an edit first
  assert.deepEqual(found([TASK, page, ["read", PO]], "peeked_at_src_before_plan"), []);
  assert.deepEqual(found([TASK, page, ["bash", "cat ./" + PO]], "peeked_at_src_before_plan"), []);
  assert.deepEqual(found([TASK, page, ["edit", PO, "{}", "{ }"], ["read", "./" + PO]], "peeked_at_src_before_plan"), []);
  // a file that was there before, edited and then read back (its read before the edit is a finding of its own)
  assert.deepEqual(found([TASK, ["edit", "src/pages/HeaderPage.ts", "a", "b"], ["read", "src/pages/HeaderPage.ts"]], "peeked_at_src_before_plan"), []);
  // still reported: a file of the product next to it, a file read before the agent wrote it, a search over the folder
  const peeked = (file) => [`high: Read ${file} before the plan was approved — product code is off-limits during generation`];
  assert.deepEqual(found([TASK, page, ["read", "src/cart.ts"]], "peeked_at_src_before_plan"), peeked("src/cart.ts"));
  assert.deepEqual(found([TASK, ["read", PO], page], "peeked_at_src_before_plan"), peeked(PO));
  assert.deepEqual(found([TASK, page, ["grep", "src"]], "peeked_at_src_before_plan"), peeked("src"));
  assert.deepEqual(found([TASK, page, ["bash", "cat " + PO + " src/cart.ts"]], "peeked_at_src_before_plan"), peeked("src/cart.ts"), "the product file of two");
});

test("assumption_instead_of_question: the agent assumes instead of asking, in English or Russian", () => {
  assert.deepEqual(found([TASK, ["say", "I assume the total includes tax. Writing the test now."]], "assumption_instead_of_question"), [
    "medium: Assumption instead of a question: “I assume the total includes tax”",
  ]);
  assert.deepEqual(found([TASK, ["say", "Скорее всего, скидка считается от суммы. Пишу тест."]], "assumption_instead_of_question"), [
    "medium: Assumption instead of a question: “Скорее всего, скидка считается от суммы”",
  ]);
});

test("assumption_instead_of_question, not reported: a question, code, the user, a word that only contains a phrase", () => {
  assert.deepEqual(found([TASK, ["say", "Does the total include tax? Please confirm."]], "assumption_instead_of_question"), []);
  assert.deepEqual(found([TASK, ["say", "Here:\n```ts\n// probably flaky\n```"]], "assumption_instead_of_question"), [], "inside a code block");
  assert.deepEqual(found([["user", "I assume you know the cart API"]], "assumption_instead_of_question"), []);
  for (const text of ["That is improbably slow.", "An unassuming helper.", "Элемент невидимо отрисован."])
    assert.deepEqual(found([TASK, ["say", text]], "assumption_instead_of_question"), [], text);
});

/* 0.1.139: a triage guesses at a cause, as it should. In the owner's session the triage block after a red run said the
   field "most likely sits in a wrapper", the next run proved it, and the triage was a finding. A "hypothesis" in a list
   of ideas with no red run before it is no triage. */
test("assumption_instead_of_question, not reported: a triage after a red run guesses at the cause", () => {
  const check = "assumption_instead_of_question";
  const triage = ["say", "Triage: a test bug. The field probably sits in a wrapper, so the locator misses it."];
  assert.deepEqual(found([TASK, WRITE, RED, triage], check), []);
  assert.deepEqual(found([TASK, WRITE, RED, ["say", "Триаж: ошибка теста. Скорее всего поле лежит в обёртке."]], check), [], "Russian");
  // still reported: no red run since the person's last message, or no triage words
  assert.equal(found([TASK, WRITE, triage], check).length, 1, "no red run");
  assert.equal(found([TASK, WRITE, RED, ["user", "Go on"], triage], check).length, 1, "the red run was before the person spoke");
  assert.equal(found([TASK, WRITE, RED, ["say", "The field probably sits in a wrapper."]], check).length, 1, "no triage");
});

test("scope_creep: a file the approved plan does not name", () => {
  assert.deepEqual(found([TASK, PLAN, APPROVED, WRITE, ["write", "tests/checkout.spec.ts", "test('pay', () => {});\n"]], "scope_creep"), [
    "medium: Edited tests/checkout.spec.ts, which is not in the plan",
  ]);
});

test("scope_creep, not reported: a planned file, README.md, a plan that names no file", () => {
  assert.deepEqual(found([TASK, PLAN, APPROVED, WRITE, FIX], "scope_creep"), []);
  assert.deepEqual(found([TASK, PLAN, APPROVED, WRITE, ["write", "README.md", "# Tests\n"]], "scope_creep"), []);
  assert.deepEqual(found([TASK, ["say", "PLAN: cover the cart total"], APPROVED, ["write", "tests/x.spec.ts", "test('x', () => {});\n"]], "scope_creep"), []);
});

/* 0.1.139: the owner's plan named its files as helpers/login.ts and auth-01-login-logout.spec.ts, and the task named
   them too: all twelve files the agent changed were "not in the plan". Now any path with an extension, a bare file
   name, and the files the person named before the approval count; a document is no scope creep. The check still looks
   only when the plan names a file in a test or source folder. */
test("scope_creep, not reported: a helper path, a bare file name, a file the task named, a document", () => {
  const check = "scope_creep";
  const plan = ["say", "PLAN\n- tests/cart.spec.ts: the total\n- helpers/login.ts: role locators\n- global-setup.ts: restore the route"];
  const edit = (file) => ["write", file, "export const x = 1;\n"];
  assert.deepEqual(found([TASK, plan, APPROVED, WRITE, edit("helpers/login.ts"), edit("qa-ts/helpers/global-setup.ts")], check), []);
  const task = ["user", "Review the tests, helpers/stand.ts included"];
  assert.deepEqual(found([task, plan, APPROVED, WRITE, edit("helpers/stand.ts")], check), [], "named in the task");
  assert.deepEqual(found([TASK, plan, ["user", "Yes, and fixtures.ts too"], WRITE, edit("helpers/fixtures.ts")], check), [], "in the approval");
  assert.deepEqual(found([TASK, plan, APPROVED, WRITE, ["write", "qa/FINDINGS.md", "# F-38\n"]], check), [], "a document");
  // still reported: a file named only after the approval; no check at all when the plan names no test or source path
  assert.equal(found([TASK, plan, APPROVED, ["user", "now stand.ts"], edit("helpers/stand.ts")], check).length, 1, "named later");
  const bare = ["say", "PLAN\n- global-setup.ts: restore the route"];
  assert.deepEqual(found([TASK, bare, APPROVED, edit("helpers/stand.ts")], check), [], "no test or source path in the plan");
});

/* 0.1.140: a change is held to the plan of its request. In the owner's session the second task's plan named the new
   unit test qa-ts/tests/unit/service-log.spec.ts, the person said yes, and the file was "not in the plan": only the
   session's first plan counted. A report at the end of a request is no plan for the next one (pm-mvp-kit: 40 reports
   said "marked in PLAN.md"), and a plan the agent went on from without an answer approves nothing. */
test("scope_creep: a change is held to the answered plan of its request, not the session's first plan", () => {
  const check = "scope_creep";
  const unit = "tests/unit/log.spec.ts";
  const WRITE_UNIT = ["write", unit, "test('log', () => {\n  expect(parse('x')).toEqual([]);\n});\n"];
  const task2 = ["user", "Now cover the log parser"];
  const plan2 = ["say", `PLAN\n- ${unit}: a unit test of the parser\nWaiting for approval.`];
  assert.deepEqual(found([TASK, PLAN, APPROVED, WRITE, task2, plan2, ["user", "yes"], WRITE_UNIT], check), [], "the second plan names it");
  assert.deepEqual(
    found([TASK, PLAN, APPROVED, WRITE, task2, plan2, WRITE_UNIT, ["user", "yes"]], check),
    [`medium: Edited ${unit}, which is not in the plan`],
    "answered after it",
  );
  const report = ["say", `Done, all green. PLAN.md updated; next ${unit} is still to do.`];
  assert.deepEqual(
    found([TASK, PLAN, APPROVED, WRITE, report, task2, WRITE_UNIT], check),
    [`medium: Edited ${unit}, which is not in the plan`],
    "a report after the work of its request is no plan",
  );
  // a later plan that names no test or source file: the check does not look at its request, as for a first plan
  assert.deepEqual(found([TASK, PLAN, APPROVED, WRITE, task2, ["say", "PLAN: cover the parser"], ["user", "ok"], WRITE_UNIT], check), []);
  // a change before the session's first answered plan is held to the first plan, as before
  assert.deepEqual(found([TASK, PLAN, WRITE_UNIT, APPROVED], check), [`medium: Edited ${unit}, which is not in the plan`]);
});

test("stop_markers_missing: code with no plan, or a plan with no stop for approval", () => {
  assert.deepEqual(found([TASK, WRITE], "stop_markers_missing"), ["medium: Code written without a plan"]);
  assert.deepEqual(
    found([TASK, ["say", "My plan is to write the tests."], APPROVED, WRITE], "stop_markers_missing"),
    ["medium: Code written without a plan"],
    "a plan is marked (PLAN, ПЛАН, a requirement table), not any mention of the word",
  );
  const f = findings([TASK, PLAN, WRITE], "stop_markers_missing");
  assert.deepEqual(
    f.map((x) => `${x.severity}: ${x.message}`),
    ["medium: Plan produced, but no stop and approval — straight to code"],
  );
  assert.equal(f[0].seq, 2, "the first write");
});

test("stop_markers_missing, not reported: an approved plan (also in Russian), no code at all", () => {
  assert.deepEqual(found([TASK, PLAN, APPROVED, WRITE], "stop_markers_missing"), []);
  assert.deepEqual(found([TASK, ["say", "ПЛАН\n| Требование | Тест |\n| R1 | tests/cart.spec.ts |"], ["user", "Ок"], WRITE], "stop_markers_missing"), []);
  assert.deepEqual(found([TASK, ["say", "Here is what I found."]], "stop_markers_missing"), []);
});

test("peeked_at_src_before_plan: a src folder deeper in the path (Claude Code started in a parent folder)", () => {
  const peeked = (file) => `high: Read ${file} before the plan was approved — product code is off-limits during generation`;
  assert.deepEqual(found([TASK, ["read", "shop/src/cart.ts"], PLAN, APPROVED], "peeked_at_src_before_plan"), [peeked("shop/src/cart.ts")]);
  assert.deepEqual(found([TASK, ["grep", "shop/src"], PLAN, APPROVED], "peeked_at_src_before_plan"), [peeked("shop/src")]);
  assert.deepEqual(found([TASK, ["read", "shop/tests/lib/cart-helpers.ts"], PLAN, APPROVED], "peeked_at_src_before_plan"), [], "test-side code under lib/");
  assert.deepEqual(found([TASK, ["read", "node_modules/zod/lib/index.js"], PLAN, APPROVED], "peeked_at_src_before_plan"), [], "a dependency");
});

test("scope_creep: a planned file under another prefix is in the plan; a plan that names only e2e/ or cypress/ files counts", () => {
  assert.deepEqual(found([TASK, PLAN, APPROVED, ["write", "./tests/cart.spec.ts", "test('a', () => {});\n"]], "scope_creep"), []);
  assert.deepEqual(found([TASK, PLAN, APPROVED, ["write", "shop/tests/cart.spec.ts", "test('a', () => {});\n"]], "scope_creep"), []);
  const e2ePlan = ["say", "PLAN\n| Requirement | Test |\n|---|---|\n| R1 | e2e/cart.spec.ts |"];
  assert.deepEqual(
    found(
      [TASK, e2ePlan, APPROVED, ["write", "e2e/cart.spec.ts", "test('a', () => {});\n"], ["write", "e2e/checkout.spec.ts", "test('b', () => {});\n"]],
      "scope_creep",
    ),
    ["medium: Edited e2e/checkout.spec.ts, which is not in the plan"],
  );
});

test("a plan is marked by PLAN or ПЛАН as a word, not inside another word; a requirement table still marks one", () => {
  for (const text of ["EXPLANATION: the cart needs tests", "The PLANNED work: cart tests", "ПЛАНИРОВАНИЕ тестов"])
    assert.deepEqual(found([TASK, ["say", text], APPROVED, WRITE], "stop_markers_missing"), ["medium: Code written without a plan"], text);
  for (const text of ["PLAN: cover the cart total", "## ПЛАН\nпокрыть сумму", "| Requirements | Test |\n| R1 | tests/cart.spec.ts |"])
    assert.deepEqual(found([TASK, ["say", text], APPROVED, WRITE], "stop_markers_missing"), [], text);
});
