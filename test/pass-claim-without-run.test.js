"use strict";
/* pass_claim_without_run: the agent says the tests pass, and in the 6 steps before that message there is no test run
   with a result, or the last one was red. What must not count: a claim after a green last run, a user who asks for
   passing tests, a message without a claim, a claim phrase inside another word ("bypassing", "проходить"; reported
   until 0.1.119). Since 0.1.121 the 6 steps leave out the ones that change no code: reads, searches, other tools (a
   browser, MCP), git and other commands. Since 0.1.129 also a claim after a green run when a code, test or runner config
   file changed after it and nothing ran since; a note or a doc changed after it does not count. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

// steps: ["write", file, content] | ["bash", command, output] | ["read", file] | ["tool", name] | ["say", text] (the agent)
// | ["user", text]
function transcript(steps) {
  const L = [JSON.stringify({ type: "user", message: { role: "user", content: "Write the tests" } })];
  steps.forEach(([kind, a, b], i) => {
    const id = "t" + i;
    if (kind === "say") return L.push(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: a }] } }));
    if (kind === "user") return L.push(JSON.stringify({ type: "user", message: { role: "user", content: a } }));
    const [name, input] =
      kind === "write"
        ? ["Write", { file_path: a, content: b }]
        : kind === "read"
          ? ["Read", { file_path: a }]
          : kind === "tool"
            ? [a, {}]
            : ["Bash", { command: a }];
    L.push(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }));
    L.push(
      JSON.stringify({
        type: "user",
        message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: kind === "bash" ? b || "" : "ok" }] },
      }),
    );
  });
  return L.join("\n");
}
const findings = (steps, profile = "qa-ts") => {
  const cfg = Lens.profile(profile);
  return Lens.runChecks(Lens.importAny(transcript(steps), cfg), cfg).filter((f) => f.check === "pass_claim_without_run");
};
const found = (steps, profile) => findings(steps, profile).map((f) => `${f.severity}: ${f.message}`);

const SPEC = ["write", "e2e/cart.spec.ts", "test('total', async () => {\n  expect(cart.total()).toBe(3);\n});\n"];
const RED = ["bash", "npx playwright test", "  1 passed\n  1 failed"];
const GREEN = ["bash", "npx playwright test", "  2 passed"];
const NO_RUN = "high: Claims tests pass, but no test run in the preceding steps";
const RED_RUN = "high: Claims tests pass while the last run was 1 passed / 1 failed";
const other = (n) => Array.from({ length: n }, (_, i) => ["write", `src/notes${i}.md`, "x\n"]);

test("a claim with no run before it: high, at the claim's step", () => {
  const f = findings([SPEC, ["say", "Done, all tests pass."]]);
  assert.deepEqual(
    f.map((x) => `${x.severity}: ${x.message}`),
    [NO_RUN],
  );
  assert.equal(f[0].seq, 2, "the message, not the write");
  assert.deepEqual(found([["say", "Готово, все тесты проходят."]]), [NO_RUN], "Russian claims are recognized");
});

test("a claim while the last run was red, also when an earlier run was green", () => {
  assert.deepEqual(found([SPEC, RED, ["say", "All tests pass now."]]), [RED_RUN]);
  assert.deepEqual(found([GREEN, RED, ["say", "Looks good, tests pass."]]), [RED_RUN], "the last run decides");
});

test("a run counts only within the 6 steps before the claim, and only with a result", () => {
  assert.deepEqual(found([GREEN, ...other(5), ["say", "All tests pass."]]), [], "the run is 6 steps back");
  assert.deepEqual(found([GREEN, ...other(6), ["say", "All tests pass."]]), [NO_RUN], "the run is 7 steps back");
  assert.deepEqual(
    found([
      ["bash", "npx playwright test", "Error: something went wrong"],
      ["say", "All tests pass."],
    ]),
    [NO_RUN],
    "no result to show",
  );
});

test("the window leaves out the steps that change no code (0.1.121)", () => {
  const quiet = [
    ["read", "e2e/cart.spec.ts"],
    ["tool", "Grep"],
    ["tool", "mcp__browser__navigate"],
    ["tool", "mcp__browser__screenshot"],
    ["bash", "ls -la"],
    ["bash", "git status"],
    ["bash", "git push"],
  ];
  assert.deepEqual(found([GREEN, ...quiet, ...quiet, ["say", "All tests pass."]]), [], "14 quiet steps after the run");
  assert.deepEqual(found([GREEN, ...other(5), ...quiet, ["say", "All tests pass."]]), [], "5 writes and the quiet steps");
  assert.deepEqual(found([GREEN, ...other(6), ...quiet, ["say", "All tests pass."]]), [NO_RUN], "6 writes push the run out");
  assert.deepEqual(found([RED, ...quiet, ["say", "All tests pass."]]), [RED_RUN], "the red run is still the last one");
  assert.deepEqual(
    found([GREEN, ...other(4), ["say", "Let me check the rest."], ["user", "ok"], ["say", "All tests pass."]]),
    [NO_RUN],
    "the agent's and the user's messages count as steps",
  );
});

test("not reported: a claim after a green last run, a user asking for it, no claim at all", () => {
  assert.deepEqual(found([SPEC, GREEN, ["say", "All tests pass now."]]), []);
  assert.deepEqual(found([RED, GREEN, ["say", "Fixed, tests pass."]]), [], "red, then green: the last run decides");
  assert.deepEqual(found([["user", "Make sure all tests pass."]]), [], "the user's message is not the agent's claim");
  assert.deepEqual(found([SPEC, ["say", "I wrote the test, now I will run it."]]), []);
});

test("green, then a code file changed and nothing ran since: the claim is about code no run has seen (0.1.129)", () => {
  const SPEC2 = ["write", "e2e/cart.spec.ts", SPEC[2] + "test('total again', async () => {\n  expect(cart.total()).toBe(3);\n});\n"];
  const after = (file) => `high: Claims tests pass, but ${file} changed at seq 3, after the last run, and nothing ran since`;
  assert.deepEqual(found([SPEC, GREEN, SPEC2, ["say", "Added one more test, all tests pass."]]), [after("e2e/cart.spec.ts")]);
  assert.deepEqual(found([SPEC, GREEN, SPEC2, ["say", "Добавила ещё тест, все проходят."]]), [after("e2e/cart.spec.ts")], "in Russian");
  assert.deepEqual(found([SPEC, GREEN, ["write", "src/cart.ts", "export const total = () => 3;\n"], ["say", "All tests pass."]]), [after("src/cart.ts")]);
  assert.deepEqual(
    found([SPEC, GREEN, ["write", "playwright.config.ts", "export default {};\n"], ["say", "All tests pass."]]),
    [after("playwright.config.ts")],
    "a runner's config",
  );
  // not reported: a run after the change, a note or a doc changed, a change before the green run
  assert.deepEqual(found([SPEC, GREEN, SPEC2, GREEN, ["say", "All tests pass."]]), []);
  assert.deepEqual(found([SPEC, GREEN, ["write", "README.md", "# Tests\n"], ["write", "notes/plan.txt", "x\n"], ["say", "All tests pass."]]), []);
  assert.deepEqual(found([SPEC, SPEC2, GREEN, ["say", "All tests pass."]]), []);
  // an Edit, as in the session that showed it (the agent added a test with the name of an old one)
  const cfg = Lens.profile("qa-python");
  const ev = [
    { seq: 1, kind: "run_tests", cmd: "python -m pytest -q tests", tests: { passed: 9, failed: 0, errors: 0, failed_names: [] } },
    { seq: 2, kind: "edit", file: "tests/test_navigation.py", new_content: "def test_about_section():\n    assert True\n" },
    { seq: 3, kind: "message", text: "Готово. В tests/test_navigation.py 9 тестов, все проходят." },
  ];
  assert.deepEqual(
    Lens.runChecks(ev, cfg)
      .filter((f) => f.check === "pass_claim_without_run")
      .map((f) => f.message),
    ["Claims tests pass, but tests/test_navigation.py changed at seq 2, after the last run, and nothing ran since"],
  );
  // a profile that reads any file (qa-generic): a doc is still no code; pytest's own config is (qa-python)
  assert.deepEqual(
    found([SPEC, ["bash", "npm test", "Tests: 2 passed, 2 total"], ["write", "README.md", "# Tests\n"], ["say", "All tests pass."]], "qa-generic"),
    [],
  );
  const PY = ["write", "tests/test_cart.py", "def test_total():\n    assert total() == 3\n"];
  assert.deepEqual(
    found(
      [PY, ["bash", "pytest -q", "1 passed in 0.01s"], ["write", "pytest.ini", "[pytest]\naddopts = -p no:randomly\n"], ["say", "All tests pass."]],
      "qa-python",
    ),
    [after("pytest.ini")],
  );
});

test("a claim phrase counts only as whole words; an English one may end in -es, -ed or -ing", () => {
  assert.deepEqual(found([["say", "I am bypassing the cache in the fixture."]]), [], '"passing" inside "bypassing"');
  assert.deepEqual(found([["say", "Overall passengers see the banner."]]), [], '"all pass" inside "overall passengers"');
  assert.deepEqual(found([["say", "Нужно проходить авторизацию в каждом тесте."]]), [], '"проходит" inside "проходить"');
  for (const claim of ["All tests passed.", "The suite passes, all green.", "Tests are passing.", "Тест проходит.", "Все тесты проходят!"])
    assert.deepEqual(found([["say", claim]]), [NO_RUN], claim);
});

test("a run whose output the transcript does not have (output_missing, a Cursor import): unknown, not reported (0.1.121)", () => {
  const cfg = Lens.profile("qa-ts");
  const ev = (missing) => [
    { seq: 1, kind: "run_tests", cmd: "npx playwright test", output_missing: missing || undefined },
    { seq: 2, kind: "message", text: "All tests pass." },
  ];
  const check = (events) =>
    Lens.runChecks(events, cfg)
      .filter((f) => f.check === "pass_claim_without_run")
      .map((f) => `${f.severity}: ${f.message}`);
  assert.deepEqual(check(ev(true)), []);
  assert.deepEqual(check(ev(false)), [NO_RUN], "output there but not understood: no run, as before");
  assert.deepEqual(
    check([
      { seq: 1, kind: "run_tests", cmd: "npx playwright test", tests: { passed: 1, failed: 1, errors: 0, failed_names: [] } },
      ...ev(true).map((e) => Object.assign({}, e, { seq: e.seq + 1 })),
    ]),
    [],
    "a later run without output: the red one before it is not the last result",
  );
});

test("after a red run, a message that says a test fails reports it; a failure denied, or no run, is still a claim (0.1.127)", () => {
  // the owner's test-pw session: a report of a red run, with "проходит" in it
  assert.deepEqual(found([SPEC, RED, ["say", '"Add a single todo" падает. "Empty input" проходит ложно. seed проходит.']]), []);
  assert.deepEqual(found([SPEC, RED, ["say", "One test still fails, the rest pass."]]), []);
  assert.deepEqual(found([SPEC, RED, ["say", "Two tests are failing; the others are passing."]]), []);
  assert.deepEqual(found([SPEC, RED, ["say", "Тест упал, остальные тесты проходят."]]), []);
  // no run before it: a claim, whatever else the message says (it describes a check with the fix taken out)
  assert.deepEqual(found([SPEC, ["say", "Тест проходит. Проверяю, что без исправления он падает."]]), [NO_RUN]);
  // a denied failure: still a claim
  for (const text of ["Все тесты проходят, ничего не падает.", "19 passed, 0 failed — all pass.", "All tests pass; no failures.", "Tests pass, nothing fails."])
    assert.deepEqual(found([SPEC, RED, ["say", text]]), [RED_RUN], text);
});
