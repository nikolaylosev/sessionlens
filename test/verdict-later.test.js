"use strict";
/* The verdict "Later" (0.1.140): a reviewer's note to look at a finding again, not a decision. In the owner's sessions
   every finding to check again was marked True with the note "проверить", and the proposed rules and the skill were
   built from them as from confirmed findings. "Later" counts for nothing (calibration, rules, a skill, the report's
   lists of confirmed and rejected findings) and leaves the finding under "no verdict". And a finding with no step (the
   model's, seq -1) is quoted in a rule's evidence, not "seq -1". Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");
const { bootHost, openPage } = require("./host-panel");
const { makeFixture } = require("../perf/fixtures");

const { Lens } = load();
const LensRules = require(M("rules.js"));

const F = (check, seq, message, extra) => Object.assign({ check, severity: "high", seq, message, source: "formal" }, extra);

test("decided: True and False are decisions, Later and no verdict are not", () => {
  assert.deepEqual(
    [{ v: "ok" }, { v: "fp" }, { v: "later" }, undefined, null].map((vd) => Lens.decided(vd)),
    [true, true, false, false, false],
  );
});

test("a session's summary: Later is open, and no confirmed finding or verdict of its check", () => {
  const findings = [F("scope_creep", 3, "a.ts: not in the plan"), F("scope_creep", 5, "b.ts: not in the plan"), F("raw_locator", 7, "a.ts:4 — raw locator")];
  const s = { id: "s1", name: "s1", events: [], findings, verdicts: {} };
  const [a, b, c] = findings.map((f) => Lens.fkey(f));
  s.verdicts[a] = { v: "ok", note: "" };
  s.verdicts[b] = { v: "later", note: "проверить" };
  s.verdicts[c] = { v: "later", note: "" };
  const sum = Lens.sessionSummary(s);
  assert.deepEqual(sum.checkStats.scope_creep, { total: 2, ok: 1, fp: 0 });
  assert.deepEqual(sum.checkStats.raw_locator, { total: 1, ok: 0, fp: 0 });
  assert.deepEqual(
    sum.confirmed.map((x) => x.seq),
    [3],
  );
  assert.equal(sum.openCount, 2);
});

test("a rule's evidence names the step, or quotes a finding that has none", () => {
  const s = { id: "s1", name: "DD-011", task: "" };
  const md = LensRules.ruleMarkdown(
    "ai_async",
    [
      { s, f: { check: "ai_async", seq: -1, message: "expect.poll returns at the first ['kjs'], before the second call", snippet: "" }, vd: { note: "" } },
      { s, f: { check: "ai_async", seq: 12, message: "a wait with no condition", snippet: "" }, vd: { note: "" } },
    ],
    new Set(),
    {},
  );
  const ev = md.split("\n").filter((l) => l.startsWith("- DD-011"));
  assert.deepEqual(ev, ["- DD-011, «expect.poll returns at the first ['kjs'], before the second call»", "- DD-011, seq 12"]);
  assert.ok(!md.includes("seq -1"));
  assert.equal(LensRules.where({ seq: -1, snippet: "x".repeat(100) }), `«${"x".repeat(79)}…»`);
});

test("in the panel: Later is a third button, the finding stays undecided, and it survives a reload", async () => {
  const FX = makeFixture({ n: 2, bytes: 8 * 1024, seed: 5 });
  const host = bootHost({ globalState: JSON.parse(JSON.stringify(Object.assign({ sessions: FX.sessions }, FX.storage))) });
  const id = Object.keys(FX.sessions)[0];
  const tab = await openPage(host, { sessionId: id });
  await tab.ready();
  const card = [...tab.document.querySelectorAll("#findings .f")].find((d) => !d.classList.contains("done"));
  const k = card.dataset.k;
  const later = card.querySelector(".v-later");
  assert.ok(later && later.title.includes("not for calibration, rules or a skill"));
  card.querySelector(".note").value = "проверить";
  later.dispatchEvent(new tab.window.MouseEvent("click", { bubbles: true }));
  await tab.idle();
  const r = await openPage(host, { sessionId: id });
  await r.ready();
  const sel = `#findings .f[data-k="${k.replace(/"/g, '\\"')}"]`;
  const again = r.document.querySelector(sel);
  assert.ok(again.querySelector(".v-later.on.later"), "saved as Later");
  assert.equal(again.querySelector(".note").value, "проверить");
  assert.ok(!again.classList.contains("done"), "not decided");
  // the "no verdict" filter keeps it
  r.document.querySelector("[data-und]").dispatchEvent(new r.window.MouseEvent("click", { bubbles: true }));
  await r.idle();
  assert.ok(r.document.querySelector(sel), "under no verdict");
  assert.deepEqual([...tab.errors, ...r.errors], []);
  tab.close();
  r.close();
});

test("the review .md: a finding marked Later is under no verdict, with its note, not among the confirmed", async () => {
  const fs = require("fs"),
    os = require("os"),
    path = require("path");
  const { createStore } = require("../store.js");
  const at = new Date(2026, 10, 26, 12).toISOString();
  const ok = F("pass_claim_without_run", 2, "Claims tests pass, but no test run");
  const later = F("scope_creep", 3, "helpers/log.ts: not in the plan", { severity: "medium" });
  const s = {
    id: "lat1",
    name: "later",
    task: "TASK-9",
    profile: "qa-ts",
    created: at,
    events: [],
    findings: [ok, later],
    verdicts: { [Lens.fkey(ok)]: { v: "ok", note: "", at }, [Lens.fkey(later)]: { v: "later", note: "проверить", at } },
    spec: "",
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-later-"));
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
  const h = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
  });
  const p = await openPage(h, { sessionId: s.id });
  await p.ready();
  Object.defineProperty(p.window.navigator, "clipboard", { value: { writeText: async () => {} }, configurable: true });
  p.document.querySelector("#export-md").dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  let md = null;
  for (let t = Date.now(); !md && Date.now() - t < 5000; await new Promise((r) => setTimeout(r, 20))) {
    const m = p.sent.find((x) => x.type === "save:file" && /\.md$/.test(x.payload.name));
    if (m) md = m.payload.content;
  }
  const part = (h1, h2) => md.split(h1)[1].split(h2)[0];
  assert.ok(part("### Confirmed findings", "###").includes(ok.message));
  assert.ok(!part("### Confirmed findings", "###").includes(later.message));
  assert.ok(part("### No verdict (medium/low)", "\n\n").includes(`${later.message} _(to review later: проверить)_`));
  assert.deepEqual(p.errors, []);
  p.close();
});
