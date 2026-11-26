"use strict";
/* A package script that ran tests (0.1.140): `npm run -s unit -- tests/unit/log.spec.ts`. The runner is in
   package.json, so the command alone does not name it: in the owner's session the agent ran its unit tests 12 times
   this way, and each was "another command", so no check saw those runs or their failures. Such a step is a test run
   when its output reads as one and the command runs a script, or a runner by `pnpm exec`, whose name says it tests.
   Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

const ROOT = "/w/shop";
let id = 0;
const rec = (type, content, extra) => Object.assign({ type, timestamp: "2026-11-26T10:00:00.000Z", cwd: ROOT, message: { role: type, content } }, extra);
const bash = (command, output) => {
  const t = "t" + id++;
  return [
    rec("assistant", [{ type: "tool_use", id: t, name: "Bash", input: { command } }]),
    rec("user", [{ type: "tool_result", tool_use_id: t, content: output }], { toolUseResult: { stdout: output } }),
  ];
};
const claude = (steps, profile = "qa-ts") =>
  Lens.importAny([rec("user", "Fix the log helper"), ...steps.flat()].map((r) => JSON.stringify(r)).join("\n"), Lens.profile(profile));
const runOf = (ev) => {
  const r = ev.find((e) => e.cmd);
  return r.kind === "run_tests" ? `run_tests ${r.tests.passed}/${r.tests.failed}` : r.kind;
};
const RED = "  ✘  3 [unit] › tests/unit/log.spec.ts:12:5 › a line with no code fails (2ms)\n  1 failed\n  10 passed (782ms)";
const GREEN = "  11 passed (589ms)";

test("a script that tests, with a test result in its output, is a test run", () => {
  for (const [cmd, out, want] of [
    ["npm run -s unit -- tests/unit/log.spec.ts 2>&1 | grep -E '✘|passed|failed'", RED, "run_tests 10/1"],
    ["npm run typecheck 2>&1 | tail -3; npm run unit 2>&1 | tail -3", GREEN, "run_tests 11/0"],
    ["CI=1 yarn test:e2e --reporter=line", GREEN, "run_tests 11/0"],
    ["cd frontend && pnpm exec vitest run 2>&1 | tail", GREEN, "run_tests 11/0"],
    ["(bun run check)", GREEN, "run_tests 11/0"],
  ])
    assert.equal(runOf(claude([bash(cmd, out)], "qa-python")), want, cmd);
  const ev = claude([bash("npm run -s unit -- tests/unit/log.spec.ts", RED)]);
  assert.deepEqual(ev.find((e) => e.kind === "run_tests").tests.failed_names, ["tests/unit/log.spec.ts:12:5 › a line with no code fails"]);
});

test("not a test run: no test result, a script that does not test, or the script's name inside quotes or a here-document", () => {
  for (const [cmd, out] of [
    ["npm run -s unit", "Error: Cannot find module 'tsx'"],
    ["npm run -s build && cat test/__snapshots__/render.json", "<td>71 passed</td><td>1 failed</td>"],
    ["npm run -s typecheck", "Found 0 errors. 3 passed"],
    ["npm run -s lint:tests", "2 failed"],
    ["node -e 'if(/npm run -s unit|npm run unit/.test(c))console.log(c)' | head", "  2 failed\n  9 passed"],
    ["cat > notes.md <<'EOF'\nnpm run unit\nEOF\ncat notes.md log.txt", "  1 failed"],
    ['git commit -m "npm run unit; yarn e2e" && cat log.txt', "1 failed"],
    ["npm install -D vitest", "added 1 package, 3 passed"],
    ["echo npm run unit >> notes.md && cat log.txt", "1 failed"],
  ])
    assert.ok(!runOf(claude([bash(cmd, out)])).startsWith("run_tests"), cmd);
});

test("Codex and a plain transcript read a script's run the same way", () => {
  const r = (type, payload) => JSON.stringify({ timestamp: "2026-11-26T10:00:00.000Z", type, payload });
  const codex = Lens.importAny(
    [
      r("session_meta", { cwd: "/w", originator: "codex_vscode", cli_version: "0.155.0" }),
      r("response_item", { type: "message", role: "user", content: [{ type: "input_text", text: "Fix the log helper" }] }),
      r("response_item", {
        type: "custom_tool_call",
        name: "exec",
        call_id: "c1",
        input: `const r = await tools.exec_command(${JSON.stringify({ cmd: "npm run -s unit", workdir: "/w" })});\ntext(r);\n`,
      }),
      r("response_item", { type: "custom_tool_call_output", call_id: "c1", output: RED }),
    ].join("\n"),
    Lens.profile("qa-ts"),
  );
  assert.equal(runOf(codex), "run_tests 10/1");
  const text = Lens.importAny("User: Fix the log helper\nBash(npm run -s unit)\nTests:       1 failed, 10 passed, 11 total\n", Lens.profile("qa-ts"));
  assert.equal(runOf(text), "run_tests 10/1");
});

test("a session imported before 0.1.140 with such a step asks to be imported again", () => {
  const cfgOf = (cmd, text) => ({
    profile: "qa-ts",
    importGen: 17,
    events: [
      { seq: 0, kind: "user", text: "Fix" },
      { seq: 1, kind: "run_other", cmd, text },
    ],
  });
  assert.ok(Lens.IMPORT_GEN >= 18);
  assert.equal(Lens.needsReimport(cfgOf("npm run -s unit", RED)), true);
  // its output kept only in part (3,000 characters): the result may be in the rest
  assert.equal(Lens.needsReimport(cfgOf("npm run -s unit", "x".repeat(3000))), true);
  assert.equal(Lens.needsReimport(cfgOf("npm run -s unit", "Error: Cannot find module 'tsx'")), false);
  assert.equal(Lens.needsReimport(cfgOf("npm run -s build", RED)), false);
});

test("a file such a command changed before its script ran is an edit before the run", () => {
  const SPEC = "tests/unit/log.spec.ts";
  const V1 = "test('code', () => {\n  expect(parse('x')).toBe(3);\n});\n";
  const t = "t" + id++;
  const diff = {
    files: [
      {
        filePath: `${ROOT}/${SPEC}`,
        hunks: [
          {
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 3,
            lines: [" test('code', () => {", "-  expect(parse('x')).toBe(3);", "+  expect(parse('x')).toBe(4);", " });"],
          },
        ],
      },
    ],
    moreFiles: 0,
  };
  const ev = claude([
    rec("assistant", [{ type: "tool_use", id: "w", name: "Write", input: { file_path: `${ROOT}/${SPEC}`, content: V1 } }]),
    rec("user", [{ type: "tool_result", tool_use_id: "w", content: "ok" }]),
    rec("assistant", [{ type: "tool_use", id: t, name: "Bash", input: { command: `sed -i '' 's/toBe(3)/toBe(4)/' ${SPEC} && npm run -s unit` } }]),
    rec("user", [{ type: "tool_result", tool_use_id: t, content: RED }], { toolUseResult: { stdout: RED, bashEditDiff: diff } }),
  ]);
  assert.deepEqual(
    ev.slice(2).map((e) => `${e.seq} ${e.kind}`),
    ["2 edit", "3 run_tests"],
  );
});
