"use strict";
/* The shape of a generated skill (0.1.141), from the owner's audit of one (26.11): it had grown to 150 KB in 15
   files, each rule in three to five places, two numberings (P-xx, AP-xx) that did not match, history (dates, steps,
   verdicts) mixed into the instructions, and examples with functions the code does not have. The prompt now asks
   for one rules file with one entry per rule and one numbering, limits, no history, and a script labelled by rule
   numbers; and the rules go to the model without their sessions and steps, only the reviewers' notes. Made-up
   content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load, M } = require("./helpers");
const { bootHost, openPage } = require("./host-panel");
const { createStore } = require("../store.js");

const { Lens } = load();
const LensAI = require(M("ai.js"));
const LensRules = require(M("rules.js"));

test("the prompt: one rules file, one numbering, limits, no history, a script labelled by rule numbers", () => {
  const p = LensAI.DEFAULTS.generate_skill;
  for (const want of [
    "references/rules.md",
    "One numbering only",
    'no "AP-xx"',
    "AT MOST 8,000 characters",
    "most 400 characters, only the signs",
    "## Review questions",
    "**Bad:** one to three",
    "Never put history into the skill",
    "Never invent a",
    "Every Good example follows every rule of the skill",
    'check "P-NN',
    "-rHn",
    "--exclude-dir for examples, skill-history",
    "must not match the rule's own good example",
  ])
    assert.ok(p.includes(want), want);
  for (const gone of ["references/patterns.md", "references/antipatterns.md", "AP-xx: <name>"]) assert.ok(!p.includes(gone), gone);
});

test("skillInput: the evidence without sessions and steps, the reviewers' notes once each", () => {
  const md = [
    "## raw_locator (3)",
    "",
    "**Rule:** Use a role locator.",
    "",
    "Evidence:",
    "- DD-011 (TASK-9), seq 282 — «an element with no role: locator-exception with its reason is allowed»",
    "- DD-004, seq 9",
    "- DD-011 (TASK-9), seq 295 — «an element with no role: locator-exception with its reason is allowed»",
    "",
    "## ai_async (1)",
    "",
    "**Rule:**",
    "",
    "- Wait for the second call too.",
    "",
    "Evidence:",
    "- DD-011, «expect.poll returns at the first call»",
    "",
  ].join("\n");
  assert.equal(
    LensRules.skillInput(md),
    [
      "## raw_locator (3)",
      "",
      "**Rule:** Use a role locator.",
      "",
      "Reviewers' notes:",
      "- an element with no role: locator-exception with its reason is allowed",
      "",
      "## ai_async (1)",
      "",
      "**Rule:**",
      "",
      "- Wait for the second call too.",
      "",
      "",
    ].join("\n"),
  );
  assert.ok(!/seq \d|DD-0/.test(LensRules.skillInput(md)));
});

test("in the panel: Generate skill sends the rules without their sessions and steps", async () => {
  const at = new Date(2026, 10, 27, 12).toISOString();
  const f = { check: "raw_locator", severity: "low", seq: 4, message: "e2e/tour.spec.ts:3 — raw locator", source: "lint" };
  const f2 = { ...f, seq: 6, message: "e2e/tour.spec.ts:7 — raw locator" };
  const s = {
    id: "sk1",
    name: "tour",
    task: "TASK-9",
    profile: "qa-ts",
    created: at,
    events: [{ seq: 4, kind: "write", file: "e2e/tour.spec.ts", new_content: "await page.locator('#step-0').click();\n" }],
    findings: [f, f2],
    verdicts: {
      [Lens.fkey(f)]: { v: "ok", note: "no role: locator-exception with its reason is allowed", at },
      [Lens.fkey(f2)]: { v: "ok", note: "", at },
    },
    spec: "",
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-skill-"));
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
  const host = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
  });
  const p = await openPage(host);
  await p.ready();
  let sent = null;
  p.window.LensAI.missingKey = () => null;
  p.window.LensAI.generateSkill = async (md) => {
    sent = md;
    return { skill_name: "tour-locators", files: [{ path: "SKILL.md", content: "---\nname: tour-locators\n---\n" }], raw: "" };
  };
  p.document.querySelector('.tab[data-view="calib"]').dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  await p.idle();
  assert.ok(p.document.querySelector("#rules .rule"), "the rule is proposed");
  p.document.querySelector("#gen-skill").click();
  for (let t = Date.now(); !sent && Date.now() - t < 5000;) await new Promise((r) => setTimeout(r, 20));
  assert.ok(sent, "the model was asked");
  assert.match(sent, /Reviewers' notes:\n- no role: locator-exception with its reason is allowed/);
  assert.ok(!/seq [46]|tour \(TASK-9\)|Evidence:/.test(sent), sent);
  assert.deepEqual(p.errors, []);
  p.close();
});
