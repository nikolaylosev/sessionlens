"use strict";
/* Claude Code 2.1.292 and newer writes api-request-blob records: a copy of a request to the model, one message each
   (the person's, the agent's earlier steps, the system prompt), with no time. Until 0.1.139 the import read them as the
   conversation, since they have a message: the first message came twice (user_frustration: "the same request
   repeated"), and every step and test run of the agent was counted again. In 30 of the owner's sessions that was
   58,441 steps instead of 38,886, 3,904 test runs instead of 2,258, and 179 findings more (99 of them user_frustration).
   A session imported before asks to be imported again, and the copies do not count against the match of Import again.
   Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const T0 = Date.parse("2026-11-24T12:00:00.000Z");
let tick = 0;
const at = () => new Date(T0 + 1000 * tick++).toISOString();
const rec = (type, content) => ({ type, timestamp: at(), cwd: "/w/shop", message: { role: type, content } });
// what Claude Code puts next to a message: a copy of it in a request, with no time and no cwd
const copy = (r) => ({ type: "api-request-blob", sessionId: "s1", hash: "h" + tick, message: r.message });

const TASK = "Write the cart tests";
const RED =
  "Running 1 test using 1 worker\n\n  ✘  1 [chromium] › e2e/cart.spec.ts:1:1 › total (1.1s)\n\n  1 failed\n    [chromium] › e2e/cart.spec.ts:1:1 › total\n";
const GREEN = "Running 1 test using 1 worker\n\n  ✓  1 [chromium] › e2e/cart.spec.ts:1:1 › total (1.0s)\n\n  1 passed (1.4s)\n";
function session() {
  tick = 0;
  const user = rec("user", [
    { type: "text", text: "<browser_instruction>Use the browser tools.</browser_instruction>" },
    { type: "text", text: TASK },
  ]);
  const steps = [
    rec("assistant", [
      {
        type: "tool_use",
        id: "t1",
        name: "Write",
        input: { file_path: "/w/shop/e2e/cart.spec.ts", content: "test('total', async () => {\n  expect(total).toBe(4);\n});\n" },
      },
    ]),
    rec("user", [{ type: "tool_result", tool_use_id: "t1", content: "File created" }]),
    rec("assistant", [{ type: "tool_use", id: "t2", name: "Bash", input: { command: "npx playwright test" } }]),
    rec("user", [{ type: "tool_result", tool_use_id: "t2", content: RED }]),
    rec("assistant", [{ type: "text", text: "The test is wrong because the cart holds 3 items, not 4." }]),
    rec("assistant", [
      { type: "tool_use", id: "t3", name: "Edit", input: { file_path: "/w/shop/e2e/cart.spec.ts", old_string: "toBe(4)", new_string: "toBe(3)" } },
    ]),
    rec("user", [{ type: "tool_result", tool_use_id: "t3", content: "File updated" }]),
    rec("assistant", [{ type: "tool_use", id: "t4", name: "Bash", input: { command: "npx playwright test" } }]),
    rec("user", [{ type: "tool_result", tool_use_id: "t4", content: GREEN }]),
  ];
  const plain = [user, ...steps];
  // as in a real transcript: the request's copies of the messages so far, after each of the agent's steps
  const withCopies = [
    { type: "api-request-blob", sessionId: "s1", hash: "sys", message: { role: "system", content: [{ type: "text", text: "You are an agent." }] } },
  ];
  for (const r of plain) {
    withCopies.push(r);
    if (r.type === "assistant")
      withCopies.push(
        copy(user),
        ...plain
          .slice(1, plain.indexOf(r) + 1)
          .filter((x) => x.type === "assistant")
          .map(copy),
      );
  }
  const text = (rs) => rs.map((r) => JSON.stringify(r)).join("\n");
  return { plain: text(plain), withCopies: text(withCopies) };
}

test("Claude Code's copies of a request add no steps: the same steps as without them", () => {
  const { plain, withCopies } = session();
  const ev = Lens.importAny(withCopies, cfg);
  assert.deepEqual(ev, Lens.importAny(plain, cfg));
  assert.deepEqual(
    ev.filter((e) => e.kind === "user").map((e) => e.text),
    [TASK],
    "the person's message once",
  );
  assert.equal(ev.filter((e) => e.kind === "run_tests").length, 2, "two test runs, not one per copy");
  assert.ok(
    ev.every((e) => e.ts),
    "every step has its time",
  );
  const checks = Lens.runChecks(ev, cfg).map((f) => f.check);
  assert.ok(!checks.includes("user_frustration"), "no request repeated");
  assert.ok(!checks.includes("fix_after_fail_without_triage"), "the one edit after the red run follows its cause");
});

test("a record with no type is still read by its role", () => {
  const lines = [
    { role: "user", message: { content: [{ type: "text", text: TASK }] } },
    { role: "assistant", message: { content: [{ type: "text", text: "Writing them." }] } },
  ];
  const ev = Lens.importAny(lines.map((l) => JSON.stringify(l)).join("\n"), cfg);
  assert.deepEqual(
    ev.map((e) => `${e.kind}: ${e.text}`),
    [`user: ${TASK}`, "message: Writing them."],
  );
});

// what an import before 0.1.139 stored: the same steps, and the copies' steps among them with no time
function storedBefore139(events) {
  const out = [];
  for (const e of events) {
    out.push(e);
    if (e.kind === "user" || e.kind === "message" || e.kind === "run_tests") out.push(Object.assign({}, e, { ts: "" }));
  }
  return out.map((e, i) => Object.assign({}, e, { seq: i }));
}

test("a Claude Code session imported before with steps from such copies asks to be imported again (IMPORT_GEN 15)", () => {
  assert.ok(Lens.IMPORT_GEN >= 15);
  const { plain, withCopies } = session();
  const fresh = Lens.importAny(plain, cfg);
  const s = (events, extra = {}) => Object.assign({ profile: "qa-ts", agent: "claude-code", importGen: 14, events }, extra);
  assert.equal(Lens.needsReimport(s(storedBefore139(fresh))), true, "no text kept: steps with and without a time");
  assert.equal(Lens.needsReimport(s(fresh, { source_text: withCopies })), true, "the kept text has the copies");
  assert.equal(Lens.needsReimport(s(fresh)), false, "every step has its time");
  assert.equal(Lens.needsReimport(s(fresh, { source_text: plain })), false, "the kept text has no copies");
  assert.equal(Lens.needsReimport(s(storedBefore139(fresh), { importGen: Lens.IMPORT_GEN })), false, "imported with 0.1.139");
  // another agent's steps with no time (a Cursor Agent transcript has none) are not such copies
  const untimed = fresh.map((e) => Object.assign({}, e, { ts: "" }));
  assert.equal(Lens.needsReimport(s(untimed, { agent: "cursor" })), false);
  assert.equal(Lens.needsReimport(s(untimed)), false, "a Claude Code session with no time at all");
});

test("Import again: the copies' steps of the stored session do not count against the match", () => {
  const { plain } = session();
  const fresh = Lens.importAny(plain, cfg);
  const stored = storedBefore139(fresh);
  assert.ok(stored.length > fresh.length * 1.3, "the old import had a third more steps");
  assert.equal(Lens.transcriptMatch(stored, fresh), 1);
  assert.equal(Lens.transcriptMatch(fresh, fresh), 1, "the same import as before");
  // another session's transcript stays far from it
  const other = Lens.importAny(
    [rec("user", "Fix the login page"), rec("assistant", [{ type: "text", text: "Looking at it." }])].map((r) => JSON.stringify(r)).join("\n"),
    cfg,
  );
  assert.ok(Lens.transcriptMatch(stored, other) < 0.2);
});
