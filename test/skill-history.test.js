"use strict";
/* The history of a generated skill (0.1.141), outside the skill: the owner's requirements (26.11) keep verdicts, dates,
   steps and whole files of the sessions out of what an agent reads. skill-history/README.md says what is where,
   reviews.md lists each rule's findings confirmed, rejected and left for later with their notes, bad/ holds the
   sessions' files that were the skill's examples/ before. SKILL.md gets one line naming the folder. Made-up content
   only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load, M } = require("./helpers");
const { bootHost, openPage } = require("./host-panel");
const { createStore } = require("../store.js");

const { Lens } = load();
const LensRules = require(M("rules.js"));

const S = { id: "s1", name: "DD-011", task: "TASK-9" };
const F = (seq, message) => ({ check: "raw_locator", severity: "low", seq, message, source: "lint" });

test("skillHistory: what is where, and each rule's findings by verdict with their notes", () => {
  const reviewed = {
    raw_locator: [
      { s: S, f: F(282, "helpers/login.ts:121 — raw locator"), vd: { v: "ok", note: "no role: an exception with its reason" } },
      { s: S, f: F(295, "helpers/sq.ts:63 — raw locator"), vd: { v: "fp", note: "agreed in the task" } },
      { s: S, f: F(300, "helpers/x.ts:9 — raw locator"), vd: { v: "later", note: "" } },
    ],
    magic_number: [],
  };
  const [readme, reviews] = LensRules.skillHistory(["raw_locator", "magic_number"], (k) => reviewed[k], {
    name: "tour-tests",
    at: "2026-11-27T10:00:00Z",
    bad: true,
  });
  assert.equal(readme.path, "skill-history/README.md");
  assert.match(readme.content, /^# History of the skill tour-tests\n\nThe skill itself is skills\/tour-tests\/ and keeps no history\./);
  assert.match(readme.content, /\.sessionlens\/skill-history\/tour-tests\/, made by SessionLens on 2026-11-27/);
  assert.match(readme.content, /- `bad\/` — whole files/);
  assert.match(readme.content, /Rules: `raw_locator`, `magic_number`\./);
  assert.equal(reviews.path, "skill-history/reviews.md");
  assert.equal(
    reviews.content.split("## raw_locator")[1],
    [
      "",
      "",
      "Confirmed (1):",
      "- DD-011 (TASK-9), seq 282: helpers/login.ts:121 — raw locator — «no role: an exception with its reason»",
      "",
      "Rejected as false (1):",
      "- DD-011 (TASK-9), seq 295: helpers/sq.ts:63 — raw locator — «agreed in the task»",
      "",
      "To review later (1):",
      "- DD-011 (TASK-9), seq 300: helpers/x.ts:9 — raw locator",
      "",
      "## magic_number",
      "",
    ].join("\n"),
  );
  const noBad = LensRules.skillHistory(["raw_locator"], () => [], { name: "t", at: "2026-11-27", bad: false })[0];
  assert.ok(!noBad.content.includes("bad/"));
  assert.equal(
    LensRules.historyLine("tour-tests"),
    "History of the reviews behind this skill, for people (not needed for the work): `.sessionlens/skill-history/tour-tests/` in the project.",
  );
});

test("in the panel: the skill and its history; the model's own examples/ and skill-history/ are dropped", async () => {
  const at = new Date(2026, 10, 27, 12).toISOString();
  const f = { check: "raw_locator", severity: "low", seq: 4, message: "e2e/tour.spec.ts:1 — raw locator", source: "lint" };
  const f2 = { ...f, seq: 6, message: "e2e/tour.spec.ts:2 — raw locator" };
  const f3 = { ...f, seq: 8, message: "e2e/tour.spec.ts:3 — raw locator" };
  const s = {
    id: "sh1",
    name: "tour",
    profile: "qa-ts",
    created: at,
    events: [
      { seq: 4, kind: "write", file: "e2e/tour.spec.ts", new_content: "await page.locator('#step-0').click();\n" },
      { seq: 6, kind: "edit", file: "e2e/tour.spec.ts", new_content: "await page.locator('#step-1').click();\n" },
    ],
    findings: [f, f2, f3],
    verdicts: {
      [Lens.fkey(f)]: { v: "ok", note: "no role", at },
      [Lens.fkey(f2)]: { v: "ok", note: "", at },
      [Lens.fkey(f3)]: { v: "fp", note: "agreed in the task", at },
    },
    spec: "",
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-sh-"));
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
    return {
      skill_name: "tour-tests",
      files: [
        { path: "SKILL.md", content: "---\nname: tour-tests\n---\n\n## Rules\n\n- P-01 — Role locators.\n\n" },
        { path: "references/rules.md", content: "## P-01: Role locators\n\n**Bad:** `page.locator('#step-0')`\n" },
        { path: "examples/raw_locator/x.ts", content: "made up" },
        { path: "skill-history/reviews.md", content: "made up" },
      ],
      raw: "",
    };
  };
  p.document.querySelector('.tab[data-view="calib"]').dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  await p.idle();
  p.document.querySelector("#gen-skill").click();
  const result = () => p.document.querySelector("#gen-skill-results .gen-result");
  for (let t = Date.now(); !result() && Date.now() - t < 5000;) await new Promise((r) => setTimeout(r, 20));
  assert.ok(sent && !sent.includes("Example files"), "the model is told nothing of the files");
  const files = [...result().querySelectorAll(".gen-skill-files .gen-file")].map((d) => [
    d.querySelector("summary").textContent,
    d.querySelector("textarea").value,
  ]);
  assert.deepEqual(
    files.map(([n]) => n),
    [
      "SKILL.md",
      "references/rules.md",
      "skill-history/README.md",
      "skill-history/reviews.md",
      "skill-history/bad/README.md",
      // one session's file once, as before in examples/
      "skill-history/bad/raw_locator/1-tour.spec.ts",
    ],
  );
  const get = (n) => files.find(([x]) => x === n)[1];
  assert.ok(get("SKILL.md").endsWith("- P-01 — Role locators.\n\n" + LensRules.historyLine("tour-tests") + "\n"), get("SKILL.md"));
  assert.match(get("skill-history/reviews.md"), /Confirmed \(2\):\n- tour, seq 4: e2e\/tour\.spec\.ts:1 — raw locator — «no role»/);
  assert.match(get("skill-history/reviews.md"), /Rejected as false \(1\):\n- tour, seq 8: e2e\/tour\.spec\.ts:3 — raw locator — «agreed in the task»/);
  assert.ok(!get("skill-history/reviews.md").includes("made up"));
  assert.equal(p.document.querySelector("#gen-skill-status").textContent, "skill-history/bad/: 1 real file kept, 0 secrets masked.");
  assert.deepEqual(p.errors, []);
  p.close();
});
