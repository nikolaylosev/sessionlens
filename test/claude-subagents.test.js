"use strict";
/* A Claude Code session's subagents (0.1.127): their steps are in <session>/subagents/agent-<id>.jsonl with a .meta.json
   next to each, and the session's own file has only the Agent call. The host appends them to the text it returns
   (open:transcript, Lens.joinSubagents); the import puts every record in the order of its time, marks a subagent's step
   with its agentType, and does not take the main agent's prompt to a subagent for the person's message. A session that
   started subagents and has none of their steps asks to be imported again, from the file. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load } = require("./helpers");
const { fakeVscode, loadExtension, fakeContext, fakeWebviewView } = require("./fake-vscode");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const T = (s) => `2026-10-12T09:${String(s).padStart(2, "0")}:00.000Z`;
const line = (o) => JSON.stringify(o);
const user = (t, text, extra) => line(Object.assign({ type: "user", timestamp: T(t), cwd: "/p", message: { role: "user", content: text } }, extra));
const said = (t, text, extra) =>
  line(Object.assign({ type: "assistant", timestamp: T(t), cwd: "/p", message: { role: "assistant", content: [{ type: "text", text }] } }, extra));
const use = (t, id, name, input, extra) =>
  line(
    Object.assign({ type: "assistant", timestamp: T(t), cwd: "/p", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }, extra),
  );
const result = (t, id, content, extra) =>
  line(
    Object.assign({ type: "user", timestamp: T(t), cwd: "/p", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content }] } }, extra),
  );

const MAIN = [
  user(1, "Generate the tests for section 1 of specs/todos.md"),
  use(2, "m1", "Agent", { subagent_type: "playwright-test-generator", prompt: "Generate section 1" }),
  result(9, "m1", "Wrote tests/add.spec.ts"),
  use(10, "m2", "Bash", { command: "npx playwright test" }),
  result(11, "m2", "  1 passed (2.1s)"),
  said(12, "All tests pass."),
].join("\n");
const side = { isSidechain: true, agentId: "a1" };
const SUB = [
  user(3, "Generate section 1 of specs/todos.md. Follow the rules.", side),
  said(4, "Writing the test.", side),
  use(
    5,
    "s1",
    "Write",
    {
      file_path: "/p/tests/add.spec.ts",
      content: "test('add', async ({ page }) => {\n  await page.waitForTimeout(2000);\n  await expect(page.getByRole('listitem')).toHaveCount(1);\n});\n",
    },
    side,
  ),
  result(6, "s1", "File created", side),
].join("\n");

test("the subagent's steps come between the Agent call and its answer, marked with the agent's type", () => {
  const ev = Lens.importAny(Lens.joinSubagents(MAIN, [{ agentId: "a1", agentType: "playwright-test-generator", text: SUB }]), cfg);
  assert.deepEqual(
    ev.map((e) => [e.kind, e.agent || "main", e.tool || ""]),
    [
      ["user", "main", ""],
      ["tool", "main", "Agent"],
      ["message", "playwright-test-generator", ""],
      ["write", "playwright-test-generator", "Write"],
      ["run_tests", "main", "Bash"],
      ["message", "main", ""],
    ],
  );
  // the main agent's prompt to the subagent is not the person's message
  assert.deepEqual(
    ev.filter((e) => e.kind === "user").map((e) => e.text),
    ["Generate the tests for section 1 of specs/todos.md"],
  );
  // the checks read what the subagent wrote
  const found = Lens.runChecks(ev, cfg).map((f) => f.check);
  assert.ok(found.includes("sleep_or_skip_added"), found.join(", "));
});

test("without the subagents, the session is as before; a subagent's file alone keeps its prompt as the task", () => {
  const ev = Lens.importAny(MAIN, cfg);
  assert.deepEqual(
    ev.map((e) => e.kind),
    ["user", "tool", "run_tests", "message"],
  );
  assert.ok(!ev.some((e) => e.agent));
  const alone = Lens.importAny(SUB, cfg);
  assert.deepEqual(
    alone.map((e) => e.kind),
    ["user", "message", "write"],
  );
  assert.equal(alone[0].text, "Generate section 1 of specs/todos.md. Follow the rules.");
});

test("a subagent with no .meta.json is a 'subagent'; one with no steps adds nothing", () => {
  const ev = Lens.importAny(
    Lens.joinSubagents(MAIN, [
      { agentId: "a1", text: SUB },
      { agentId: "a2", text: "\n" },
    ]),
    cfg,
  );
  assert.deepEqual([...new Set(ev.filter((e) => e.agent).map((e) => e.agent))], ["subagent"]);
  assert.equal(Lens.joinSubagents(MAIN, []), MAIN + "\n");
});

test("a session that started subagents and has none of their steps asks to be imported again (IMPORT_GEN 9)", () => {
  const old = { profile: "qa-ts", importGen: 8, events: Lens.importAny(MAIN, cfg) };
  assert.equal(Lens.subagentsMissing(old), true);
  assert.equal(Lens.needsReimport(old), true);
  const fresh = { profile: "qa-ts", importGen: 8, events: Lens.importAny(Lens.joinSubagents(MAIN, [{ agentId: "a1", agentType: "g", text: SUB }]), cfg) };
  assert.equal(Lens.subagentsMissing(fresh), false);
  assert.equal(Lens.needsReimport(Object.assign({}, old, { importGen: Lens.IMPORT_GEN })), false, "imported again, still no subagent files");
  const none = { profile: "qa-ts", importGen: 8, events: Lens.importAny(MAIN.replace('"Agent"', '"Read"'), cfg) };
  assert.equal(Lens.subagentsMissing(none), false, "no Agent call");
});

// the host: Choose file reads <session>/subagents/ next to the picked file
async function picked(file) {
  const { vscode, registered } = fakeVscode({ openDialogAnswer: [{ scheme: "file", fsPath: file, toString: () => "file://" + file }] });
  loadExtension(vscode).activate(fakeContext({ globalState: { settings: {}, sessions: {} } }));
  const wv = fakeWebviewView();
  registered.views.sessionlensView.resolveWebviewView(wv.view);
  return wv.send("open:transcript", { source: "claude" });
}

test("the host adds the subagents' files, with their types, to the text of the file picked", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-subagents-"));
  const file = path.join(dir, "4dc5009a.jsonl");
  fs.writeFileSync(file, MAIN);
  let r = await picked(file);
  assert.equal(r.text, MAIN, "no subagents folder");
  const subs = path.join(dir, "4dc5009a", "subagents");
  fs.mkdirSync(subs, { recursive: true });
  fs.writeFileSync(path.join(subs, "agent-a1.jsonl"), SUB);
  fs.writeFileSync(path.join(subs, "agent-a1.meta.json"), line({ agentType: "playwright-test-generator", description: "Generate" }));
  fs.writeFileSync(path.join(subs, "notes.txt"), "not a transcript");
  r = await picked(file);
  assert.equal(r.text, Lens.joinSubagents(MAIN, [{ agentId: "a1", agentType: "playwright-test-generator", text: SUB }]));
  assert.ok(Lens.importAny(r.text, cfg).some((e) => e.agent === "playwright-test-generator"));
});
