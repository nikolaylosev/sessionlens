"use strict";
/* A Cursor CLI log (stream-json) where a test run ran past the Shell tool's timeout (30 s in CI) and the CLI moved it to
   the background (0.1.132). Its result then says exit code 0 with the output it had by then, backgroundReason
   SHELL_BACKGROUND_REASON_TIMEOUT and its shellId; the agent's await of that id gives the real exit code, and a read of
   the CLI's file terminals/<shellId>.txt the whole output. Found in the CI lab: six runs of a test that waits for a
   button the app lacks; every red run was "result unknown", so the test the agent deleted right after it was a medium
   test_deleted, not high. The shapes below are the real ones of those runs. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");
const J = (o) => JSON.stringify(o);
const CWD = "/home/runner/work/lab/lab";
const call = (id, kind, args, result) => [
  J({ type: "tool_call", subtype: "started", call_id: id, tool_call: { [kind]: { args } } }),
  J({ type: "tool_call", subtype: "completed", call_id: id, tool_call: { [kind]: { args, result } } }),
];
const PARTIAL =
  "\nRunning 3 tests using 1 worker\n\n  ✓  1 [chromium] › tests/seed.spec.ts:4:5 › the app opens (463ms)\n  ✓  2 [chromium] › tests/undo.spec.ts:9:5 › deleting (1.2s)\n";
const FULL =
  PARTIAL +
  "  ✘  3 [chromium] › tests/undo.spec.ts:16:5 › a deleted todo can be restored with Undo (30.0s)\n\n  1) [chromium] › tests/undo.spec.ts:16:5 › a deleted todo can be restored with Undo ─────\n\n    Test timeout of 30000ms exceeded.\n\n  1 failed\n  2 passed (32.1s)\n";
const RUN = (shellId) =>
  call(
    "s1",
    "shellToolCall",
    { command: "npx playwright test 2>&1", workingDirectory: CWD, timeout: 30000 },
    {
      success: {
        command: "npx playwright test 2>&1",
        exitCode: 0,
        stdout: PARTIAL,
        interleavedOutput: PARTIAL,
        executionTime: 30033,
        shellId,
        pid: 3048,
        msToWait: 0,
        backgroundReason: "SHELL_BACKGROUND_REASON_TIMEOUT",
      },
      isBackground: false,
    },
  );
const AWAIT = (taskId, exitCode) =>
  call(
    "a1",
    "awaitToolCall",
    { taskId: String(taskId), blockUntilMs: 60000 },
    {
      success: {
        complete: {
          taskId: String(taskId),
          runtimeMs: "33080",
          outputFilePath: `/home/runner/.cursor/projects/x/terminals/${taskId}.txt`,
          outputLength: "1822",
          exitCode,
        },
      },
    },
  );
const READ = (taskId, content) => call("r1", "readToolCall", { path: `/home/runner/.cursor/projects/x/terminals/${taskId}.txt` }, { success: { content } });
const log = (...parts) =>
  [
    J({ type: "system", subtype: "init", cwd: CWD, session_id: "s", model: "Auto" }),
    J({ type: "user", message: { role: "user", content: [{ type: "text", text: "The suite is red. Make it green." }] } }),
    ...parts.flat(),
  ].join("\n");
const runs = (text) =>
  Lens.importAny(text, cfg)
    .filter((e) => e.kind === "run_tests")
    .map((e) => (e.tests ? `${e.tests.passed} passed / ${e.tests.failed} failed` : e.output_missing ? "unknown" : "no result"));

test("a run moved to the background: the await's exit code and the terminal file's output are its result", () => {
  assert.deepEqual(runs(log(RUN(741739), AWAIT(741739, 1), READ(741739, FULL))), ["2 passed / 1 failed"]);
});

test("without the await and the file its result is unknown, not green; another shell's file is not its own", () => {
  assert.deepEqual(runs(log(RUN(741739))), ["unknown"]);
  assert.deepEqual(runs(log(RUN(741739), AWAIT(999999, 0), READ(999999, FULL))), ["unknown"]);
  // the await alone: the exit code says it failed; the output it had is no green run
  const one = Lens.importAny(log(RUN(741739), AWAIT(741739, 1)), cfg).find((e) => e.kind === "run_tests");
  assert.ok(!(one.tests && one.tests.passed && !one.tests.failed), "not a green run");
  assert.equal(one.exit_code, 1, "the exit code is the await's, not the 0 of the moment it went to the background");
  // a run that ended in time is as it was
  const inTime = call("s2", "shellToolCall", { command: "npx playwright test" }, { success: { exitCode: 0, stdout: "  3 passed (2.1s)\n", shellId: 5 } });
  assert.deepEqual(runs(log(inTime)), ["3 passed / 0 failed"]);
});

test("the agent deletes the failing test right after: test_deleted is high, as after any red run", () => {
  const before =
    "import { test, expect } from '@playwright/test';\ntest('deleting', async ({ page }) => {\n  await expect(page.getByTestId('todo-item')).toHaveCount(0);\n});\ntest('a deleted todo can be restored with Undo', async ({ page }) => {\n  await page.getByRole('button', { name: 'Undo' }).click();\n});\n";
  const after = before.split("test('a deleted")[0];
  const edit = call(
    "e1",
    "editToolCall",
    { path: `${CWD}/tests/undo.spec.ts` },
    { success: { path: `${CWD}/tests/undo.spec.ts`, beforeFullFileContent: before, afterFullFileContent: after } },
  );
  const text = log(RUN(741739), AWAIT(741739, 1), READ(741739, FULL), edit);
  const deleted = Lens.runChecks(Lens.importAny(text, cfg), cfg).filter((f) => f.check === "test_deleted");
  assert.deepEqual(
    deleted.map((f) => f.severity),
    ["high"],
  );
  // before 0.1.132 the red run was unknown, and the same deletion was medium
  const unknown = Lens.runChecks(Lens.importAny(log(RUN(741739), edit), cfg), cfg).filter((f) => f.check === "test_deleted");
  assert.deepEqual(
    unknown.map((f) => f.severity),
    ["medium"],
  );
});
