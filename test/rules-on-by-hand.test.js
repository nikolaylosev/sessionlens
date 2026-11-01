"use strict";
/* rules.json and a check ticked on by hand (0.1.135): enabled: true in the overrides, which calibration never hides.
   The file's `enabled` cannot say it, being true in every row of an edited rule, so the tick is onByHand. A row with
   only the tick pins no text and no severity (a severity by hand outranks a check's trial). In the CLI, --rules with the
   tick keeps a check on that --verdicts would switch off, in the findings and in the report's line. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { load, root } = require("./helpers");

const { LensRules } = load();
const { run } = require(path.join(root, "cli", "lib", "cli.js"));

const rowsOf = (overrides) => JSON.parse(LensRules.toJson(overrides)).rules;
const roundTrip = (overrides) => LensRules.fromJson(LensRules.toJson(overrides)).overrides;

test("the tick alone: a row with nothing else, and back to enabled: true", () => {
  assert.deepEqual(rowsOf({ weak_assert: { enabled: true } }), [{ check: "weak_assert", onByHand: true }]);
  assert.deepEqual(roundTrip({ weak_assert: { enabled: true } }), { weak_assert: { enabled: true } });
});

test("the tick with an edit: the whole row and the tick; an edit without it, or a check off, has no tick", () => {
  const [row] = rowsOf({ weak_assert: { enabled: true, severity: "low" } });
  assert.equal(row.severity, "low");
  assert.equal(row.onByHand, true);
  assert.equal(row.enabled, true);
  assert.equal(roundTrip({ weak_assert: { enabled: true, severity: "low" } }).weak_assert.enabled, true);
  // edited, not ticked: `enabled: true` in the row is no tick
  const [edited] = rowsOf({ weak_assert: { severity: "low" } });
  assert.equal(edited.enabled, true);
  assert.equal(edited.onByHand, undefined);
  assert.equal(roundTrip({ weak_assert: { severity: "low" } }).weak_assert.enabled, undefined);
  assert.deepEqual(
    rowsOf({ weak_assert: { enabled: false } }).map((r) => [r.enabled, r.onByHand]),
    [[false, undefined]],
  );
  assert.equal(roundTrip({ weak_assert: { enabled: false } }).weak_assert.enabled, false);
  assert.deepEqual(rowsOf({}), []);
});

test("a file from an older version: enabled: true is no tick; a row that says both is off", () => {
  const read = (rows) => LensRules.fromJson(JSON.stringify({ rules: rows })).overrides;
  assert.equal(read([{ check: "weak_assert", severity: "low", enabled: true }]).weak_assert.enabled, undefined);
  assert.equal(read([{ check: "weak_assert", enabled: false, onByHand: true }]).weak_assert.enabled, false);
  assert.equal(read([{ check: "weak_assert", onByHand: "yes" }]).weak_assert.enabled, undefined, "only true");
});

test("sessionlens analyze --rules --verdicts: a check ticked on stays on, at its own severity", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-tick-"));
  try {
    const J = JSON.stringify;
    const code =
      "import { test, expect } from '@playwright/test';\ntest('adds', async ({ page }) => {\n  await page.goto('/');\n  await page.waitForTimeout(2000);\n  await expect(page.getByTestId('todo-title')).toHaveText(['Milk']);\n});\n";
    const log = [
      J({ type: "user", message: { role: "user", content: "Write a test" } }),
      J({
        type: "assistant",
        message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Write", input: { file_path: "tests/a.spec.ts", content: code } }] },
      }),
      J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] } }),
    ].join("\n");
    fs.writeFileSync(path.join(dir, "a.jsonl"), log);
    const verdicts = Array.from({ length: 10 }, (_, i) => ({
      session: "s",
      check: "sleep_or_skip_added",
      source: "lint",
      seq: i,
      message: `m${i}`,
      verdict: i ? "fp" : "ok",
    }));
    fs.writeFileSync(path.join(dir, "v.json"), J(verdicts));
    fs.writeFileSync(path.join(dir, "rules.json"), LensRules.toJson({ sleep_or_skip_added: { enabled: true } }));
    const cli = async (...more) => {
      let out = "";
      await run(["analyze", "a.jsonl", "--profile", "qa-ts", "--verdicts", "v.json", ...more], {
        stdout: { write: (t) => (out += t) },
        stderr: { write() {} },
        env: {},
        isTTY: false,
        cwd: dir,
      });
      return out;
    };
    const off = await cli();
    assert.match(off, /off: sleep_or_skip_added/);
    assert.match(off, /Hidden by calibration: sleep_or_skip_added/);
    const on = await cli("--rules", "rules.json");
    assert.match(on, /\nhigh +sleep_or_skip_added /);
    assert.doesNotMatch(on, /off: sleep_or_skip_added/);
    assert.doesNotMatch(on, /Hidden by calibration/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
