"use strict";
/* A proposed rule's Markdown (LensRules.ruleMarkdown, 0.1.139; until then inside the panel's renderCalib, untested). It
   goes into CLAUDE.md / AGENTS.md and is the input of a skill. In the owner's file:
   - "проанализировать" (analyse this), the owner's mark on 40 confirmed findings of 12 checks, was the evidence of most
     rules;
   - "Not like this" showed the finding's own words where the finding had no code;
   - the model's categories (ai_*) said "write the rule from the evidence below" instead of a rule;
   - session DD-004 of task DD-011 was named DD-011.
   Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { LensRules } = load();

const S4 = { id: "a", name: "DD-004", task: "DD-011" },
  S11 = { id: "b", name: "DD-011", task: "DD-011" };
const one = (s, check, seq, message, snippet, note) => ({ s, f: { check, seq, message, snippet }, vd: { v: "ok", note } });

test("a note on confirmed findings of three or more checks is a reviewer's mark, not a rule", () => {
  const list = [
    one(S11, "edit_churn", 1, "m", "m", "проанализировать"),
    one(S11, "test_deleted", 2, "m", "m", "проанализировать"),
    one(S11, "magic_number", 3, "m", "m", "проанализировать"),
    one(S4, "magic_number", 4, "m", "m", "Дай комментарий"),
    one(S4, "raw_locator", 5, "m", "m", "Дай комментарий"),
  ];
  assert.deepEqual([...LensRules.markNotes(list)], ["проанализировать"], "two checks are not enough");
});

test("the rule's Markdown: evidence without marks, code only in Not like this, the session named with its task", () => {
  const list = [
    one(S4, "raw_locator", 101, "login.ts:12 — raw locator", "username: page.locator('input[name=\"_username\"]'),", "Use the accessibility tree"),
    one(S11, "raw_locator", 281, "login.ts:99 — raw locator", "login.ts:99 — raw locator", "проанализировать"),
  ];
  const md = LensRules.ruleMarkdown("raw_locator", list, new Set(["проанализировать"]), {});
  assert.match(md, /```\nusername: page\.locator\('input\[name="_username"\]'\),\n```/);
  assert.doesNotMatch(md, /```\nlogin\.ts:99/, "the finding's words are no example");
  assert.match(md, /- DD-004 \(DD-011\), seq 101 — «Use the accessibility tree»/);
  assert.match(md, /- DD-011, seq 281\n/, "a mark is left out, the evidence line stays");
  // no code at all: no Not like this
  const words = LensRules.ruleMarkdown("edit_churn", [one(S11, "edit_churn", 1, "a.ts: 9 edits", "a.ts: 9 edits", "")], new Set(), {});
  assert.doesNotMatch(words, /Not like this/);
});

test("the model's categories: the reviewers' notes are the rule; with none, the text asks for one", () => {
  const ai = [
    one(
      S4,
      "ai_fragility",
      -1,
      "Exact UI copy is asserted — «getByText('Welcome')»",
      "getByText('Welcome')",
      "Assert the exact text only when the spec quotes it.",
    ),
    one(
      S4,
      "ai_fragility",
      -1,
      "The restore date is hardcoded — «'2024-03-07'»",
      "'2024-03-07'",
      "Restore the captured updated_date, not a date from the dump.",
    ),
    one(S11, "ai_fragility", -1, "The URL regex matches the host — «waitForURL(/login/)»", "waitForURL(/login/)", "проанализировать"),
  ];
  const md = LensRules.ruleMarkdown("ai_fragility", ai, new Set(["проанализировать"]), {});
  assert.match(
    md,
    /\*\*Rule:\*\*\n\n- Assert the exact text only when the spec quotes it\.\n- Restore the captured updated_date, not a date from the dump\.\n/,
  );
  assert.doesNotMatch(md, /write the rule from the evidence/);
  const bare = LensRules.ruleMarkdown("ai_fragility", [ai[2]], new Set(["проанализировать"]), {});
  assert.match(bare, /write the rule from the evidence below/);
});
