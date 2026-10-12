"use strict";
/* Playwright's test agents (npx playwright init-agents: planner, generator, healer) work through Playwright's MCP server
   "playwright-test" (0.1.127). generator_write_test {fileName, code} is a write of that test, planner_save_plan a write
   of the plan's file, test_run and test_debug are test runs with the list reporter's output; the server's
   browser_* tools are a look at the page, its setup, log and list tools are not. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const T = (s) => `2026-10-12T09:${String(s).padStart(2, "0")}:00.000Z`;
const line = (o) => JSON.stringify(o);
const user = (t, text) => line({ type: "user", timestamp: T(t), cwd: "/p", message: { role: "user", content: text } });
const said = (t, text) => line({ type: "assistant", timestamp: T(t), cwd: "/p", message: { role: "assistant", content: [{ type: "text", text }] } });
const use = (t, id, name, input) =>
  line({ type: "assistant", timestamp: T(t), cwd: "/p", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } });
const result = (t, id, content) =>
  line({ type: "user", timestamp: T(t), cwd: "/p", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content }] } });
const PW = (tool) => `mcp__playwright-test__${tool}`;

const CODE =
  "test('add', async ({ page }) => {\n  await page.goto('https://shop-acme.io/todo');\n  await expect(page.getByTestId('todo-item')).toHaveCount(1);\n});\n";
const RUN_FAIL =
  "\nRunning 1 test using 1 worker\n  ✘  1 [id=1] [project=chromium] › tests/add.spec.ts:1:1 › add (5.1s)\n\n  1 failed\n    [chromium] › tests/add.spec.ts:1:1 › add\n";
const RUN_PASS = "\nRunning 1 test using 1 worker\n  ✓  1 [id=1] [project=chromium] › tests/add.spec.ts:1:1 › add (1.2s)\n  1 passed (2.5s)\n";
const PLAN = {
  name: "TodoMVC plan",
  fileName: "specs/plan.md",
  overview: "Adding todos.",
  suites: [
    {
      name: "Adding",
      tests: [
        { name: "Add one", file: "tests/add.spec.ts", steps: [{ perform: "Type 'milk', press Enter.", expect: ["One item 'milk'", "Counter '1 item left'"] }] },
      ],
    },
  ],
};

const events = (lines) => Lens.importAny(lines.join("\n"), cfg);

test("the generator's write is a write of the test, its run a test run with the result; paths from the project folder", () => {
  const ev = events([
    user(1, "Generate the tests"),
    use(2, "a", PW("generator_setup_page"), { plan: "Add one", seedFile: "tests/seed.spec.ts" }),
    result(3, "a", "### Paused at end of test. ready for interaction"),
    use(4, "b", PW("browser_type"), { element: "New todo", text: "milk" }),
    result(5, "b", "### Ran Playwright code"),
    use(6, "c", PW("generator_write_test"), { fileName: "tests/add.spec.ts", code: CODE }),
    result(7, "c", "Test written to tests/add.spec.ts"),
    use(8, "d", PW("test_run"), { locations: ["tests/add.spec.ts"] }),
    result(9, "d", RUN_FAIL),
    use(10, "e", PW("test_debug"), { test: { id: "1", title: "add" } }),
    result(11, "e", "### Paused on error:\nError: expect(locator).toHaveCount(expected) failed"),
    use(12, "f", "Edit", { file_path: "/p/tests/add.spec.ts", old_string: "todo-item", new_string: "todo-row" }),
    result(13, "f", "ok"),
    use(14, "g", PW("test_run"), { locations: [] }),
    result(15, "g", RUN_PASS),
  ]);
  assert.deepEqual(
    ev.map((e) => [e.kind, e.file || e.cmd || ""]),
    [
      ["user", ""],
      ["tool", ""],
      ["tool", ""],
      ["write", "tests/add.spec.ts"],
      ["run_tests", "npx playwright test tests/add.spec.ts"],
      ["run_tests", 'npx playwright test --debug "add"'],
      ["edit", "tests/add.spec.ts"],
      ["run_tests", "npx playwright test"],
    ],
  );
  assert.equal(ev[3].new_content, CODE);
  assert.deepEqual([ev[4].tests.passed, ev[4].tests.failed], [0, 1]);
  assert.deepEqual([ev[7].tests.passed, ev[7].tests.failed], [1, 0]);
  // the Edit (an absolute path) changes the file the generator wrote (a path from the project folder)
  assert.match(ev[6].new_content, /todo-row/);
  assert.match(ev[6].new_content, /page\.goto/);
  // the checks read the generated test
  const found = Lens.runChecks(ev, cfg).map((f) => f.check);
  assert.ok(found.includes("hardcoded_base_url"), found.join(", "));
  assert.ok(!found.includes("tests_never_run"), found.join(", "));
});

test("the planner's plan is a write of its file", () => {
  const ev = events([user(1, "Plan the tests"), use(2, "a", PW("planner_save_plan"), PLAN), result(3, "a", "Test plan saved to specs/plan.md")]);
  assert.deepEqual([ev[1].kind, ev[1].file], ["write", "specs/plan.md"]);
});

test("a look at the page is the server's browser tool, not its setup, its log or its test tools", () => {
  const looked = (tool) =>
    Lens.runChecks(
      events([
        user(1, "Write the test"),
        use(2, "w", "Write", { file_path: "/p/tests/add.spec.ts", content: CODE }),
        result(3, "w", "ok"),
        use(4, "r", "Bash", { command: "npx playwright test" }),
        result(5, "r", RUN_PASS),
        use(6, "x", PW(tool), {}),
        result(7, "x", "ok"),
        said(8, "Done."),
      ]),
      cfg,
    ).some((f) => f.check === "browser_check_not_in_test");
  assert.equal(looked("browser_snapshot"), true);
  for (const t of ["generator_setup_page", "planner_setup_page", "generator_read_log", "test_list", "test_run", "test_debug"])
    assert.equal(looked(t), false, t);
  // another server's tool of the same name is not Playwright's
  assert.equal(Lens.importAny([user(1, "x"), use(2, "a", "mcp__notes__test_run", {})].join("\n"), cfg)[1].kind, "tool");
});

test("a fix after a failure: a green run in between ends that failure (0.1.127)", () => {
  const fixAfter = (between) =>
    Lens.runChecks(
      events([
        user(1, "Write the test"),
        use(2, "w", "Write", { file_path: "/p/tests/add.spec.ts", content: CODE }),
        result(3, "w", "ok"),
        use(4, "r", "Bash", { command: "npx playwright test" }),
        result(5, "r", RUN_FAIL),
        ...between,
        use(8, "e", "Write", { file_path: "/p/tests/other.spec.ts", content: CODE }),
        result(9, "e", "ok"),
      ]),
      cfg,
    ).filter((f) => f.check === "fix_after_fail_without_triage").length;
  assert.equal(fixAfter([]), 1);
  assert.equal(fixAfter([use(6, "g", "Bash", { command: "npx playwright test" }), result(7, "g", RUN_PASS)]), 0);
  assert.ok(fixAfter([use(6, "g", "Bash", { command: "npx playwright test" }), result(7, "g", RUN_FAIL)]) > 0, "still failing");
});

test("a green run ends a failure only when it ran the failed tests, or as many tests as the failed run (0.1.127)", () => {
  // two tests ran, one failed
  const FAIL2 = "\nRunning 2 tests using 1 worker\n\n  1) [chromium] › tests/add.spec.ts:1:1 › add\n\n  1 failed\n  1 passed (6.0s)\n";
  const PASS = (n) => `\nRunning ${n} tests using 1 worker\n  ${n} passed (2.0s)\n`;
  const fixAfter = (cmd, out) =>
    Lens.runChecks(
      events([
        user(1, "Write the test"),
        use(2, "w", "Write", { file_path: "/p/tests/add.spec.ts", content: CODE }),
        result(3, "w", "ok"),
        use(4, "r", "Bash", { command: "npx playwright test" }),
        result(5, "r", FAIL2),
        use(6, "g", "Bash", { command: cmd }),
        result(7, "g", out),
        use(8, "e", "Write", { file_path: "/p/tests/add.spec.ts", content: CODE + "\n" }),
        result(9, "e", "ok"),
      ]),
      cfg,
    ).filter((f) => f.check === "fix_after_fail_without_triage").length;
  assert.equal(fixAfter("npx playwright test tests/other.spec.ts", PASS(1)), 1, "another test passed: the failure is not over");
  assert.equal(fixAfter("npx playwright test tests/add.spec.ts", PASS(1)), 0, "the failed file passed");
  assert.equal(fixAfter("npx playwright test", PASS(2)), 0, "as many tests as the failed run");
});

test("a session imported before with such a step stored as a plain tool asks to be imported again (IMPORT_GEN 9)", () => {
  const s = (tool) => ({
    profile: "qa-ts",
    importGen: 8,
    events: [
      { seq: 0, kind: "user", text: "x" },
      { seq: 1, kind: "tool", tool },
    ],
  });
  assert.equal(Lens.needsReimport(s(PW("generator_write_test"))), true);
  assert.equal(Lens.needsReimport(s(PW("test_run"))), true);
  assert.equal(Lens.needsReimport(s(PW("browser_click"))), false);
  assert.equal(Lens.needsReimport(Object.assign(s(PW("test_run")), { importGen: Lens.IMPORT_GEN })), false);
});

test("an edit of a document after a failure is no fix of it (0.1.127)", () => {
  const after = (file) =>
    Lens.runChecks(
      events([
        user(1, "Write the test"),
        use(2, "w", "Write", { file_path: "/p/tests/add.spec.ts", content: CODE }),
        result(3, "w", "ok"),
        use(4, "r", "Bash", { command: "npx playwright test" }),
        result(5, "r", "\nRunning 1 test using 1 worker\n\n  1 failed\n"), // no test named: any edit after it counted
        use(6, "e", "Write", { file_path: file, content: "notes\n" }),
        result(7, "e", "ok"),
      ]),
      cfg,
    )
      .filter((f) => f.check === "fix_after_fail_without_triage")
      .map((f) => f.message.split(" right after")[0]);
  for (const f of ["/p/README.md", "/p/local/TODO.md", "/p/docs/notes.txt", "/p/docs/guide.rst"]) assert.deepEqual(after(f), [], f);
  assert.deepEqual(after("/p/tests/add.spec.ts"), ["Edited tests/add.spec.ts"]);
});
