"use strict";
/* fix_after_fail_without_triage and the agent's reasoning (0.1.139, owner's decision). A triage or a cause in Claude
   Code's thinking before the edit is half a triage: medium, with its own message, since the rule asks to record the
   cause and the reasoning is not what the agent reported. The reasoning goes with the agent's next step as `thought`,
   with no step of its own, so the steps keep their numbers. Claude Code often keeps the reasoning with no text (8,695
   of 29,025 blocks had one in the owner's sessions), and then nothing changes. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

let tick = 0,
  id = 0;
const at = () => new Date(Date.parse("2026-11-24T10:00:00.000Z") + 1000 * tick++).toISOString();
const rec = (type, content, extra) => Object.assign({ type, timestamp: at(), cwd: "/w", message: { role: type, content } }, extra);
const call = (name, input, output = "ok") => {
  const t = "t" + id++;
  return [rec("assistant", [{ type: "tool_use", id: t, name, input }]), rec("user", [{ type: "tool_result", tool_use_id: t, content: output }])];
};
const think = (thinking) => [rec("assistant", [{ type: "thinking", thinking, signature: "s" }])];
const user = (text) => [rec("user", text)];
const RED = "Running 1 test using 1 worker\n\n  1) [chromium] › e2e/cart.spec.ts:1:1 › total\n\n  1 failed\n";
const WRITE = call("Write", { file_path: "/w/e2e/cart.spec.ts", content: "test('total', () => {\n  expect(total).toBe(3);\n});\n" });
const RUN = call("Bash", { command: "npx playwright test" }, RED);
const FIX = call("Edit", { file_path: "/w/e2e/cart.spec.ts", old_string: "toBe(3)", new_string: "toBe(4)" });
const importOf = (...steps) => {
  tick = 0;
  return Lens.importAny([rec("user", "Write the cart tests"), ...steps.flat()].map((r) => JSON.stringify(r)).join("\n"), cfg);
};
const found = (ev) =>
  Lens.runChecks(ev, cfg)
    .filter((f) => f.check === "fix_after_fail_without_triage")
    .map((f) => `${f.severity}: ${f.message}`);
const THINKING =
  "medium: Edited e2e/cart.spec.ts right after a failure (seq 2): the cause appears only in the agent's reasoning, not in what it reported — product bug / test bug / spec defect";

test("a cause or a triage in the reasoning before the edit: medium, with its own message", () => {
  assert.deepEqual(found(importOf(WRITE, RUN, think("The total is 4 because the cart holds four items."), FIX)), [THINKING]);
  assert.deepEqual(found(importOf(WRITE, RUN, think("Упал из-за неверного ожидания в тесте."), FIX)), [THINKING], "in Russian");
  assert.deepEqual(found(importOf(WRITE, RUN, think("It is a test bug: the assertion is wrong."), FIX)), [THINKING], "a triage is half one too");
  // reasoning, then another step (a read), then the edit: still before it
  assert.deepEqual(found(importOf(WRITE, RUN, think("Root cause: the seed has four items."), call("Read", { file_path: "/w/seed.sql" }), FIX)), [THINKING]);
});

test("still high: no reasoning, reasoning with no text or no cause, reasoning before the red run; said aloud is as before", () => {
  const HIGH = "high: Edited e2e/cart.spec.ts right after a failure (seq 2) with no triage: product bug / test bug / spec defect";
  assert.deepEqual(found(importOf(WRITE, RUN, FIX)), [HIGH]);
  assert.deepEqual(found(importOf(WRITE, RUN, think(""), FIX)), [HIGH], "no text");
  assert.deepEqual(found(importOf(WRITE, RUN, think("Let me update the expectation."), FIX)), [HIGH], "no cause");
  assert.deepEqual(
    found(importOf(WRITE, think("This will fail because the seed is not loaded."), RUN, FIX)).map((f) => f.split(":")[0]),
    ["high"],
    "reasoned before the run",
  );
  const aloud = importOf(WRITE, RUN, rec("assistant", [{ type: "text", text: "It fails because the cart holds 4 items." }]), FIX);
  assert.match(found([aloud].flat())[0] || "", /^medium: .*the cause is named, but not whose error it is/, "said aloud: as before");
});

test("the reasoning goes with the agent's next step, adds no step, and a message of the person ends it", () => {
  const ev = importOf(WRITE, RUN, think("first"), think("second"), FIX);
  const plain = importOf(WRITE, RUN, FIX);
  assert.deepEqual(
    ev.map((e) => [e.seq, e.kind]),
    plain.map((e) => [e.seq, e.kind]),
    "the same steps, the same numbers",
  );
  assert.equal(ev.find((e) => e.kind === "edit").thought, "first\nsecond");
  assert.equal(ev.filter((e) => e.thought).length, 1, "once");
  const cut = importOf(WRITE, RUN, think("It fails because of the seed."), user("Stop, check the seed first."), FIX);
  assert.equal(
    cut.some((e) => e.thought),
    false,
    "the person spoke in between",
  );
  const long = importOf(WRITE, think("x".repeat(3000) + " the end"), FIX);
  assert.equal(long.find((e) => e.kind === "edit").thought.length, 2000);
  assert.ok(long.find((e) => e.kind === "edit").thought.endsWith("the end"), "its last part, nearest the step");
});

test("a Claude Code session imported before with reasoning in its kept text asks to be imported again (IMPORT_GEN 15)", () => {
  const s = (source_text, extra) =>
    Object.assign({ profile: "qa-ts", agent: "claude-code", importGen: 14, source_text, events: [{ seq: 0, ts: "t", kind: "user", text: "Go" }] }, extra);
  const line = (thinking) =>
    JSON.stringify({ type: "assistant", timestamp: "t", cwd: "/w", message: { role: "assistant", content: [{ type: "thinking", thinking, signature: "s" }] } });
  assert.equal(Lens.needsReimport(s(line("It fails because of the seed."))), true);
  assert.equal(Lens.needsReimport(s(line(""))), false, "reasoning with no text");
  assert.equal(Lens.needsReimport(s(line("x"), { importGen: Lens.IMPORT_GEN })), false);
  assert.equal(Lens.needsReimport(s(line("x"), { agent: "codex" })), false);
});
