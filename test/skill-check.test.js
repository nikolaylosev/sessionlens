"use strict";
/* A generated skill checked without a model (0.1.141), by the owner's requirements for a skill (26.11): sizes and
   what an agent reads, one numbering in every file, no history, examples whose names the sessions' code has and that
   follow the skill's own rules, a script whose patterns catch the bad example and not the good one. In the owner's
   skill four examples called functions the code did not have (serviceLog.commands(), setRoute), two examples broke
   other rules of the same skill, and a WARN of the script fired on correct code. Made-up content only. */
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

const SKILL = [
  "---",
  "name: tour-tests",
  "description: Playwright tests of the shop's tour and cart.",
  "---",
  "",
  "## Rules",
  "",
  "- P-01 — Find elements by role.",
  "- P-02 — Wait for a state, not for time.",
  "",
].join("\n");
const RULES = [
  "# Rules",
  "",
  "## P-01: Role locators",
  "",
  "**Bad:** `await page.locator('#step-0').click();`",
  "",
  "**Good:**",
  "",
  "```ts",
  "await page.getByRole('dialog', { name: 'Tour' }).getByRole('button', { name: 'Close' }).click();",
  "```",
  "",
  "**Why:** markup changes, roles do not.",
  "",
  "## P-02: No fixed waits",
  "",
  "**Bad:** `await page.waitForTimeout(3000);`",
  "",
  "**Good:**",
  "",
  "```ts",
  "await expect(cartTotal(page)).toHaveText('3');",
  "```",
  "",
  "**Why:** a fixed wait is too long or too short.",
  "",
].join("\n");
const SCRIPT = [
  "#!/usr/bin/env bash",
  "# Does not check: P-01.",
  'check "P-02 fixed wait" "waitForTimeout\\("',
  'check() { grep -rHnE "$2" --include="*.ts" --exclude-dir=examples --exclude-dir=skill-history . ; }',
  "",
].join("\n");
const CODE = ["export const cartTotal = (page) => page.getByTestId('total');\n"];
const files = (over = {}) =>
  Object.entries(Object.assign({ "SKILL.md": SKILL, "references/rules.md": RULES, "scripts/check_tour-tests.sh": SCRIPT }, over))
    .filter(([, c]) => c != null)
    .map(([p, content]) => ({ path: p, content }));
const keys = (r) => r.issues.map((i) => `${i.level} ${i.key}${i.rule ? " " + i.rule : ""}`);

test("a skill in the shape asked for: nothing found, and its sizes", () => {
  const r = LensRules.checkSkill(files(), { code: CODE });
  assert.deepEqual(keys(r), []);
  assert.deepEqual(r.stats, { skill: SKILL.length, description: 45, read: SKILL.length + RULES.length, files: 3 });
});

test("sizes, numbering and history", () => {
  const long = SKILL.replace("Playwright tests", "x".repeat(400)) + "\n" + "y".repeat(8000);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "SKILL.md": long }), { code: CODE })), ["warn skill_long", "warn desc_long"]);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": RULES + "z".repeat(30000) }), { code: CODE })), ["warn read_long"]);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": null, "scripts/check_tour-tests.sh": null }), { code: CODE })), ["error no_rules"]);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "SKILL.md": null }), { code: CODE })), ["error no_skill"]);
  // a rule with no entry, an entry with no line, an entry twice, a second numbering
  const skill3 = SKILL.replace("- P-02", "- P-03 — Something else.\n- P-02");
  assert.deepEqual(keys(LensRules.checkSkill(files({ "SKILL.md": skill3 }), { code: CODE })), ["error no_entry P-03"]);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "SKILL.md": SKILL.replace("- P-02 — Wait for a state, not for time.\n", "") }), { code: CODE })), [
    "warn not_in_skill P-02",
  ]);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": RULES + "\n## P-02: again\n" }), { code: CODE })), ["error dup_entry P-02"]);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": RULES + "\nSee AP-08.\n" }), { code: CODE })), ["error second_numbering"]);
  // a step or a date outside code is history; inside code it is code
  for (const x of ["confirmed at seq 282", "decided on 25.11.2026", "since 2026-11-25"])
    assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": RULES + `\nThis was ${x}.\n` }), { code: CODE })), ["warn history"], x);
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": RULES + "\n```ts\nconst day = '2026-11-25';\n```\n" }), { code: CODE })), []);
  // the examples' folder and a journal are not the skill
  assert.deepEqual(keys(LensRules.checkSkill([...files(), { path: "examples/README.md", content: "| a | seq 282 | AP-01 |" }], { code: CODE })), []);
});

test("the examples: a short Bad, names the sessions' code has, and the skill's own checks on Good", () => {
  const bad4 = RULES.replace("**Bad:** `await page.locator('#step-0').click();`", "**Bad:**\n\n```ts\na();\nb();\nc();\nd();\n```");
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": bad4 }), { code: CODE })), ["warn bad_long P-01"]);
  // a helper nobody wrote; a name the example defines itself is fine; a string or a comment calls nothing
  const invented = RULES.replace("await expect(cartTotal(page))", "await expect(serviceLog.commands(page))");
  const r = LensRules.checkSkill(files({ "references/rules.md": invented }), { code: CODE });
  assert.deepEqual(keys(r), ["warn unknown_name P-02"]);
  assert.match(r.issues[0].text, /calls commands, which the code of the sessions does not have/);
  const own = RULES.replace(
    "await expect(cartTotal(page))",
    "const totalOf = (p) => p.getByTestId('t');\n// setRoute(x)\nawait expect(totalOf(page), 'setRoute(')",
  );
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": own }), { code: CODE })), []);
  // no code of the sessions to look in: names are not judged
  assert.deepEqual(keys(LensRules.checkSkill(files({ "references/rules.md": invented }), { code: [] })), []);
  // the app's checks on each Good example, with its language
  const seen = [];
  const check = (code, lang) => (seen.push(lang), /getByRole\('dialog'/.test(code) ? [{ check: "positional_locator", line: 1 }] : []);
  assert.deepEqual(keys(LensRules.checkSkill(files(), { code: CODE, check })), ["error good_breaks P-01"]);
  assert.deepEqual(seen, ["ts", "ts"]);
});

test("the owner's own format: Russian labels, plain or bold, with a note before the colon", () => {
  const ru = [
    "## P-01. Локатор из дерева доступности",
    "",
    "Плохо:",
    "```ts",
    "await page.locator('#step-0').click();",
    "```",
    "",
    "Хорошо (`auth-08`, шаг 4–5): по роли.",
    "```ts",
    "await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();",
    "```",
    "",
    "**Зачем:** разметка меняется.",
    "",
    // after Why: only its own label makes it a Good example
    "Хорошо — по подписи:",
    "```ts",
    "await page.getByLabel('Password').fill(PASSWORD);",
    "```",
    "",
    "## P-02. Без фиксированных пауз",
    "",
    "Плохо: пауза вместо состояния.",
    "```ts",
    "await page.waitForTimeout(3000);",
    "```",
    "",
  ].join("\n");
  const seen = [];
  const r = LensRules.checkSkill(files({ "references/rules.md": ru }), { code: CODE, check: (code) => (seen.push(code.trim()), []) });
  assert.deepEqual(keys(r), []);
  assert.deepEqual(seen, [
    "await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();",
    "await page.getByLabel('Password').fill(PASSWORD);",
  ]);
});

test("the script: rule numbers as labels, file names in hits, the examples left out, patterns tried on the examples", () => {
  const sh = (s) => keys(LensRules.checkSkill(files({ "scripts/check_tour-tests.sh": s }), { code: CODE }));
  assert.deepEqual(sh(SCRIPT.replace("grep -rHnE", "grep -rnE")), ["warn grep_no_h"]);
  // the copies of the sessions' files: examples/ in the skill (before 0.1.141) or the history's bad/
  const withCopies = (s, dir) =>
    keys(LensRules.checkSkill([...files({ "scripts/check_tour-tests.sh": s }), { path: dir + "README.md", content: "" }], { code: CODE }));
  const noExclude = SCRIPT.replace(" --exclude-dir=examples --exclude-dir=skill-history", "");
  assert.deepEqual(withCopies(noExclude, "examples/"), ["warn no_exclude"]);
  assert.deepEqual(withCopies(noExclude, "skill-history/bad/"), ["warn no_exclude"]);
  assert.deepEqual(withCopies(SCRIPT.replace(" --exclude-dir=examples", ""), "skill-history/bad/"), [], "skill-history left out");
  assert.deepEqual(sh(noExclude), [], "no copies to leave out");
  assert.deepEqual(sh(SCRIPT.replace('check "P-02 fixed wait"', 'check "AP-05 fixed wait"')), ["error second_numbering", "error check_no_id"]);
  assert.deepEqual(sh(SCRIPT.replace('check "P-02 fixed wait"', 'check "P-09 fixed wait"')), ["error check_unknown P-09"]);
  assert.deepEqual(sh(SCRIPT.replace('"waitForTimeout\\("', '"sleep\\("')), ["warn check_misses P-02"]);
  // the pattern also matches correct code: the good example of P-02 has toHaveText(
  assert.deepEqual(sh(SCRIPT.replace('"waitForTimeout\\("', '"(waitForTimeout|toHaveText)\\("')), ["error check_false P-02"]);
  assert.deepEqual(sh(SCRIPT.replace('"waitForTimeout\\("', '"(waitForTimeout\\("')), ["warn check_regex P-02"]);
  // POSIX classes read as their JavaScript ones
  assert.deepEqual(sh(SCRIPT.replace('"waitForTimeout\\("', '"waitForTimeout\\([[:digit:]]"')), []);
});

test("in the panel: a generated skill shows its check under the result, and keeps it", async () => {
  const at = new Date(2026, 10, 27, 12).toISOString();
  const f = { check: "raw_locator", severity: "low", seq: 4, message: "e2e/tour.spec.ts:3 — raw locator", source: "lint" };
  const f2 = { ...f, seq: 6, message: "e2e/tour.spec.ts:7 — raw locator" };
  const s = {
    id: "sc1",
    name: "tour",
    profile: "qa-ts",
    created: at,
    events: [{ seq: 4, kind: "write", file: "e2e/tour.spec.ts", new_content: CODE[0] + "await page.locator('#step-0').click();\n" }],
    findings: [f, f2],
    verdicts: { [Lens.fkey(f)]: { v: "ok", note: "", at }, [Lens.fkey(f2)]: { v: "ok", note: "", at } },
    spec: "",
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-skc-"));
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put(s, { analyzedGen: Lens.analysisGen({ ruleOverrides: {}, lint: false, epoch: 0 }) });
  const host = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
  });
  const p = await openPage(host);
  await p.ready();
  // the model invents a helper and leaves a fixed wait in a Good example
  const gen = RULES.replace("await expect(cartTotal(page))", "await page.waitForTimeout(500);\nawait expect(serviceLog.commands(page))");
  p.window.LensAI.missingKey = () => null;
  p.window.LensAI.generateSkill = async () => ({ skill_name: "tour-tests", files: files({ "references/rules.md": gen }), raw: "" });
  p.document.querySelector('.tab[data-view="calib"]').dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  await p.idle();
  p.document.querySelector("#gen-skill").click();
  const box = () => p.document.querySelector("#gen-skill-results .gen-check");
  for (let t = Date.now(); !box() && Date.now() - t < 5000;) await new Promise((r) => setTimeout(r, 20));
  assert.ok(box(), "the check is shown");
  assert.equal(box().querySelector("summary").textContent, "Check of the skill: 2 errors, 1 warning");
  assert.deepEqual(
    [...box().querySelectorAll("li")].map((li) => `${li.className} ${li.dataset.key}`),
    ["sc-warn unknown_name", "sc-error good_breaks", "sc-error check_false"],
  );
  assert.match(box().textContent, /P-02: its Good example breaks the check sleep_or_skip_added/);
  assert.deepEqual(p.errors, []);
  p.close();
  // kept with the result: the page opened again shows it
  const again = await openPage(host);
  await again.ready();
  again.document.querySelector('.tab[data-view="calib"]').dispatchEvent(new again.window.MouseEvent("click", { bubbles: true }));
  await again.idle();
  assert.equal(again.document.querySelector("#gen-skill-results .gen-check summary").textContent, "Check of the skill: 2 errors, 1 warning");
  again.close();
});
