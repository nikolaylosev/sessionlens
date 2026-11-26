"use strict";
/* Updating a skill that exists (0.1.141). The owner's requirements (26.11): a rule keeps its number for good (§1.4),
   is rewritten in place, not under an addendum (§2.5), and what changed goes to the history, not into the skill. The
   person picks the skill's folder; the model gets the rules and the skill as it is, keeps its numbers, and returns
   only the files it changes, the changes and the files to remove; the app keeps the rest as it was, writes
   skill-history/changes-<date>.md, and checks that no rule was dropped or renamed. Made-up content only. */
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

const SKILL = "---\nname: tour-tests\ndescription: Playwright tests of the tour.\n---\n\n## Rules\n\n- P-01 — Role locators.\n- P-02 — No fixed waits.\n";
const RULES =
  "## P-01: Role locators\n\n**Bad:** `page.locator('#a')`\n\n**Why:** markup changes.\n\n## P-02: No fixed waits\n\n**Bad:** `waitForTimeout(1)`\n";
const TRIAGE = "# Triage\n\nRead the failure first.\n";
const BEFORE = [
  { path: "SKILL.md", content: SKILL },
  { path: "references/rules.md", content: RULES },
  { path: "references/triage.md", content: TRIAGE },
];

test("the prompt of an update: keep the numbers, rewrite in place, only the changed files, changes and removals", () => {
  const p = LensAI.DEFAULTS.update_skill;
  for (const want of [
    "## The skill as it is now",
    "Keep its skill_name",
    "Keep every rule's number",
    "rewrite the entry whole, never an addendum",
    "A new rule gets the next free number",
    "Never",
    'list the merge in "changes" (old id → new id)',
    "only the files you change or add",
    '"remove"',
  ])
    assert.ok(p.includes(want), want);
});

test("generateSkill with a skill: the update's prompt before the data paragraph, the skill after the rules, changes back", async () => {
  const sent = [];
  LensAI.setKeyStatus({ anthropic: true });
  LensAI.setTransport(async (q) => {
    sent.push(q);
    return {
      text: JSON.stringify({
        skill_name: "x",
        files: [{ path: "references/rules.md", content: RULES + "\n## P-03: New\n" }],
        changes: [{ id: "P-03", what: "a new rule" }, { what: 7 }],
        remove: ["references/old.md", 3],
      }),
    };
  });
  try {
    const settings = { provider: "anthropic", model: "m", minGapMs: 0, maxRetries: 0 };
    const r = await LensAI.generateSkill("# Rules\n\n## raw_locator (2)\n", settings, undefined, "CLAUDE.md", BEFORE);
    assert.deepEqual(r.changes, [{ id: "P-03", what: "a new rule" }]);
    assert.deepEqual(r.remove, ["references/old.md"]);
    const q = sent[0];
    assert.ok(q.system.indexOf("Keep every rule's number") > q.system.indexOf("references/rules.md"), "after the generation prompt");
    assert.ok(q.system.trimEnd().endsWith(LensAI.MATERIAL_IS_DATA.trim()), "the data paragraph stays last");
    assert.match(q.user, /## raw_locator \(2\)\n+## The skill as it is now\n\n### SKILL\.md\n\n````\n---\nname: tour-tests/);
    assert.ok(q.user.includes("### references/triage.md\n\n````\n# Triage\n"));
    // a new skill: no update paragraph, no skill
    sent.length = 0;
    await LensAI.generateSkill("# Rules\n", settings, undefined, "CLAUDE.md").catch(() => {});
    assert.ok(!sent[0].system.includes("Keep every rule's number") && !sent[0].user.includes("The skill as it is now"));
  } finally {
    LensAI.setTransport(null);
    LensAI.setKeyStatus(null);
  }
});

test("mergeSkill and skillChanges: the files not changed stay, the removed go, what changed is written down", () => {
  const merged = LensRules.mergeSkill(
    BEFORE,
    [
      { path: "references/rules.md", content: "new" },
      { path: "scripts/check.sh", content: "#!" },
    ],
    ["references/triage.md"],
  );
  assert.deepEqual(
    merged.map((f) => [f.path, f.content.slice(0, 3)]),
    [
      ["SKILL.md", "---"],
      ["references/rules.md", "new"],
      ["scripts/check.sh", "#!"],
    ],
  );
  const c = LensRules.skillChanges({
    name: "tour-tests",
    at: "2026-11-27T12:00:00Z",
    changes: [
      { id: "P-03", what: "a new rule: no positional locators" },
      { id: "", what: "the script labels P-03" },
    ],
    remove: ["references/antipatterns.md"],
    kept: ["references/triage.md"],
  });
  assert.equal(c.path, "skill-history/changes-2026-11-27.md");
  assert.equal(
    c.content,
    [
      "# Changes to the skill tour-tests, 2026-11-27",
      "",
      "- P-03: a new rule: no positional locators",
      "- the script labels P-03",
      "",
      "Files to delete by hand (saving writes files, it deletes none):",
      "- `references/antipatterns.md`",
      "",
      "Kept as they were:",
      "- `references/triage.md`",
      "",
    ].join("\n"),
  );
  assert.match(LensRules.skillChanges({ name: "t", at: "2026-11-27", changes: [], remove: [], kept: [] }).content, /The model listed no change\./);
});

test("checkSkill with the skill before: a rule dropped or renamed", () => {
  const keys = (r) => r.issues.map((i) => `${i.level} ${i.key}${i.rule ? " " + i.rule : ""}`);
  const after = (rules, skill = SKILL) => [
    { path: "SKILL.md", content: skill },
    { path: "references/rules.md", content: rules },
  ];
  assert.deepEqual(keys(LensRules.checkSkill(after(RULES), { before: BEFORE })), []);
  // only the punctuation differs: the same name
  assert.deepEqual(keys(LensRules.checkSkill(after(RULES.replace("## P-01: Role locators", "## P-01. Role locators!")), { before: BEFORE })), []);
  assert.deepEqual(keys(LensRules.checkSkill(after(RULES.replace("## P-02: No fixed waits", "## P-02: Retries")), { before: BEFORE })), [
    "warn rule_renamed P-02",
  ]);
  const r = LensRules.checkSkill(after(RULES.replace(/## P-02[\s\S]*$/, ""), SKILL.replace("- P-02 — No fixed waits.\n", "")), { before: BEFORE });
  assert.deepEqual(keys(r), ["error rule_dropped P-02"]);
  assert.match(r.issues[0].text, /P-02 \("No fixed waits"\) was in the skill and is gone/);
  // an old skill's patterns.md counts as where its rules were
  const old = [
    { path: "SKILL.md", content: SKILL },
    { path: "references/patterns.md", content: "## P-01: Role locators\n\n## P-02: No fixed waits\n" },
  ];
  assert.deepEqual(keys(LensRules.checkSkill(after(RULES), { before: old })), []);
  old[1].content += "\n## P-03: No positional locators\n";
  assert.deepEqual(keys(LensRules.checkSkill(after(RULES), { before: old })), ["error rule_dropped P-03"]);
});

test("in the panel: Update a skill… keeps its name and files, writes the changes, and checks the numbers", async () => {
  const at = new Date(2026, 10, 27, 12).toISOString();
  const f = { check: "raw_locator", severity: "low", seq: 4, message: "e2e/tour.spec.ts:1 — raw locator", source: "lint" };
  const f2 = { ...f, seq: 6, message: "e2e/tour.spec.ts:2 — raw locator" };
  const s = {
    id: "su1",
    name: "tour",
    profile: "qa-ts",
    created: at,
    events: [],
    findings: [f, f2],
    verdicts: { [Lens.fkey(f)]: { v: "ok", note: "", at }, [Lens.fkey(f2)]: { v: "ok", note: "", at } },
    spec: "",
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-su-"));
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
  const host = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
  });
  const p = await openPage(host);
  await p.ready();
  let got = null;
  // updated before: its SKILL.md already names its history
  const updatedBefore = BEFORE.map((f) => (f.path === "SKILL.md" ? { ...f, content: f.content + "\n" + LensRules.historyLine("tour-tests") + "\n" } : f));
  p.window.__slOpenSkillFolder = async () => ({ name: "tour-tests", files: [...updatedBefore, { path: "examples/raw_locator/1-a.ts", content: "old copy" }] });
  p.window.LensAI.missingKey = () => null;
  p.window.LensAI.generateSkill = async (md, settings, f0, target, existing) => {
    got = existing;
    return {
      skill_name: "renamed-by-model",
      // P-02 is renamed, the rest is kept
      files: [{ path: "references/rules.md", content: RULES.replace("## P-02: No fixed waits", "## P-02: Retries") }],
      changes: [{ id: "P-02", what: "rewritten" }],
      remove: [],
      raw: "",
    };
  };
  p.document.querySelector('.tab[data-view="calib"]').dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  await p.idle();
  assert.match(p.document.querySelector("#gen-skill-update").title, /keep their numbers/);
  p.document.querySelector("#gen-skill-update").click();
  const result = () => p.document.querySelector("#gen-skill-results .gen-result");
  for (let t = Date.now(); !result() && Date.now() - t < 5000;) await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(
    got.map((x) => x.path),
    ["SKILL.md", "references/rules.md", "references/triage.md"],
    "the skill's own files go to the model, not its old examples/",
  );
  assert.match(result().querySelector("summary").textContent, / — tour-tests$/);
  const files = [...result().querySelectorAll(".gen-skill-files .gen-file")].map((d) => [
    d.querySelector("summary").textContent,
    d.querySelector("textarea").value,
  ]);
  const names = files.map(([n]) => n);
  assert.deepEqual(names.slice(0, 3), ["SKILL.md", "references/rules.md", "references/triage.md"]);
  assert.ok(names.includes("skill-history/changes-" + new Date().toISOString().slice(0, 10) + ".md"), names.join(", "));
  const changes = files.find(([n]) => n.startsWith("skill-history/changes-"))[1];
  assert.match(
    changes,
    /- P-02: rewritten\n\nFiles to delete by hand[^\n]*\n- `examples\/raw_locator\/1-a\.ts`\n\nKept as they were:\n- `SKILL\.md`\n- `references\/triage\.md`/,
  );
  assert.equal(files.find(([n]) => n === "references/triage.md")[1], TRIAGE);
  assert.equal(files.filter(([n]) => n === "SKILL.md")[0][1].split("History of the reviews behind this skill").length, 2, "one history line");
  assert.deepEqual(
    [...result().querySelectorAll(".gen-check li")].map((li) => li.dataset.key),
    ["rule_renamed"],
  );
  assert.match(p.document.querySelector("#gen-skill-status").textContent, /^Updated tour-tests: 1 file changed, 2 kept as they were\./);
  assert.deepEqual(p.errors, []);
  p.close();
});
