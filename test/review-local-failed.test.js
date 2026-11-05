"use strict";
/* 0.1.138: a local server is asked file by file, and each file's request fails on its own. A server that was down read as
   a finished review with no findings: "model: 0 findings", and the session lost the model's findings it had. Now no file
   answering is a failure, as with a cloud provider, and some files answering says what is missing. The real panel. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { bootHost, openPage } = require("./host-panel");
const { createStore } = require("../store.js");
const { load, M } = require("./helpers");

const { Lens } = load();
const I18N = require(M("i18n.js"));
I18N.set("en");
const LensAI = require(M("ai.js"));

const at = "2026-10-01T00:00:00.000Z";
const LAST_RUN = "2026-10-02T10:00:00.000Z";
const code = (name) => `test('${name}', async ({ page }) => {\n  await page.goto('/${name}');\n});\n`;
const EVENTS = [
  { seq: 1, kind: "write", file: "e2e/a.spec.ts", new_content: code("a") },
  { seq: 2, kind: "write", file: "e2e/b.spec.ts", new_content: code("b") },
];
const EARLIER = { check: "ai_purpose", severity: "high", seq: -1, message: "A finding of the earlier review", evidence: "await page.goto('/a')", source: "ai" };
const session = () => ({
  id: "lr1",
  name: "local review",
  task: "",
  profile: "qa-ts",
  created: at,
  events: EVENTS,
  findings: [EARLIER],
  verdicts: {},
  spec: "",
  ai_at: LAST_RUN,
});
const NEW = (file) =>
  JSON.stringify([{ check: "ai_fragility", severity: "medium", message: `A new finding about ${file}`, evidence: `await page.goto('/${file}')` }]);

async function tab(reply, extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-lr-"));
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put({ ...session(), ...extra }, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
  const settings = { profile: "qa-ts", lint: false, verify: false, rulesTarget: "claude", provider: "local", model: "m", modelPool: [], defaultModelId: null };
  const h = bootHost({ storageDir: dir, globalState: { storageVersion: 2, settings }, vscode: { config: { global: { "sessionlens.minGapMs": 0 } } } });
  const p = await openPage(h, { sessionId: "lr1" });
  await p.ready();
  p.window.LensAI.setTransport(async (payload) => reply(payload));
  const q = (sel) => p.document.querySelector(sel);
  q("#ai-run").dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  for (const t = Date.now(); q("#ai-run").disabled; await new Promise((r) => setTimeout(r, 10))) if (Date.now() - t > 5000) throw new Error("timed out");
  await p.idle();
  const fresh = createStore({ dir: path.join(dir, "sessions") });
  await fresh.open();
  return { p, q, stored: (await fresh.get("lr1")).session, close: () => (p.close(), fs.rmSync(dir, { recursive: true, force: true })) };
}
const DOWN = { error: { message: "Failed to fetch (ECONNREFUSED)" } };

test("no file got an answer: the status shows the error, not 0 findings, and the earlier findings stay", async () => {
  const t = await tab(() => DOWN);
  assert.match(t.q("#ai-status").textContent, /Failed to fetch \(ECONNREFUSED\)/);
  assert.doesNotMatch(t.q("#ai-status").textContent, /0 findings/);
  assert.ok(t.q("#findings").textContent.includes("A finding of the earlier review"));
  assert.deepEqual(
    t.stored.findings.filter((f) => f.source === "ai").map((f) => f.message),
    [EARLIER.message],
  );
  assert.equal(t.stored.ai_at, LAST_RUN, "the last run is still the one that worked");
  assert.deepEqual(t.p.errors, []);
  t.close();
});

test("some files got an answer: their findings stand, and the status says what is missing, also when drawn again", async () => {
  const t = await tab((a) => (a.user.includes("e2e/a.spec.ts") ? { text: NEW("a") } : DOWN));
  const note = "1 of 2 files not reviewed: Failed to fetch (ECONNREFUSED)";
  assert.ok(t.q("#ai-status").textContent.includes(note), t.q("#ai-status").textContent);
  assert.match(t.q("#ai-status").textContent, /model: 1 finding/);
  assert.ok(t.q("#findings").textContent.includes("A new finding about a"));
  assert.equal(t.stored.ai_partial, note);
  t.close();
  // the status of a session opened later comes from what was saved
  const tt = await tab((a) => (a.user.includes("e2e/a.spec.ts") ? { text: NEW("a") } : DOWN));
  tt.p.window.document.querySelector("#mark-reviewed").dispatchEvent(new tt.p.window.MouseEvent("click", { bubbles: true }));
  await tt.p.idle();
  assert.ok(tt.q("#ai-status").textContent.includes(note), tt.q("#ai-status").textContent);
  tt.close();
});

test("every file answered: no note, and a later run clears the note of an earlier one", async () => {
  const t = await tab((a) => ({ text: NEW(a.user.includes("e2e/a.spec.ts") ? "a" : "b") }), { ai_partial: "1 of 2 files not reviewed: an earlier run" });
  assert.match(t.q("#ai-status").textContent, /model: 2 findings/);
  assert.doesNotMatch(t.q("#ai-status").textContent, /not reviewed/);
  assert.equal(t.stored.ai_partial, null);
  t.close();
});

test("LensAI.review: a session with no code to review is no failure", async () => {
  LensAI.setTransport(async () => {
    throw new Error("nothing to send");
  });
  const r = await LensAI.review(
    { events: [{ seq: 1, kind: "user", text: "hi" }], findings: [], spec: "" },
    { provider: "local", model: "m", verify: false, maxCode: 12000 },
  );
  assert.deepEqual(r.findings, []);
  assert.equal(r.partial, undefined);
  LensAI.setTransport(null);
});
