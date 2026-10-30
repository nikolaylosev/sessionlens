"use strict";
/* A new check on trial (0.1.130, the owner's option A of the "shadow mode"): the registry marks it trial: true. Until
   its source has 10 verdicts its findings are low and marked, so a check nobody has judged yet makes no session red;
   with 10 it has its own severity, or calibration demotes it or switches it off as any other check. A severity set by
   hand on the Rules tab still applies. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");
const { bootHost, openPage } = require("./host-panel");

const { Lens } = load();
const LensChecks = require(M("checks.js"));
const LensRules = require(M("rules.js"));

const F = (check, severity = "medium") => ({ check, severity, seq: 3, message: `${check} at seq 3`, source: "formal" });
const st = (ok, fp) => ({ empty_result_unverified: { formal: { ok, fp } } });
const shown = (r) => r.findings.map((f) => [f.check, f.severity, f.trial, f.demoted]);

test("a trial check: low and marked until its source has 10 verdicts; then as any other check", () => {
  const f = F("empty_result_unverified");
  assert.deepEqual(shown(Lens.calibrate([f], {}, {})), [["empty_result_unverified", "low", true, undefined]], "no verdicts");
  assert.equal(Lens.verdict(Lens.calibrate([f], {}, {}).findings), "green", "no session is yellow or red for it alone");
  assert.deepEqual(shown(Lens.calibrate([f], st(9, 0), {})), [["empty_result_unverified", "low", true, undefined]], "9 verdicts");
  assert.deepEqual(shown(Lens.calibrate([f], st(10, 0), {})), [["empty_result_unverified", "medium", undefined, undefined]], "10, all right");
  assert.deepEqual(shown(Lens.calibrate([f], st(4, 6), {})), [["empty_result_unverified", "low", undefined, true]], "10, 40%: demoted");
  const off = Lens.calibrate([f], st(2, 8), {});
  assert.deepEqual([off.findings, off.hidden.length], [[], 1], "10, 20%: off");
  // another source's verdicts are not its own
  assert.equal(Lens.calibrate([f], { empty_result_unverified: { lint: { ok: 10, fp: 0 } } }, {}).findings[0].trial, true);
  // a check not on trial keeps its severity with no verdicts
  assert.deepEqual(shown(Lens.calibrate([F("hardcoded_base_url")], {}, {})), [["hardcoded_base_url", "medium", undefined, undefined]]);
});

test("a severity set by hand on the Rules tab still applies to a trial check", () => {
  const cal = Lens.calibrate([F("empty_result_unverified")], {}, {});
  assert.deepEqual(
    LensRules.apply(cal.findings, { empty_result_unverified: { severity: "high" } }).map((f) => [f.severity, f.trial]),
    [["high", true]],
  );
});

test("the registry: trial is true or absent, and a trial check is one calibration may touch", () => {
  const trial = Object.entries(LensChecks.CHECKS).filter(([, c]) => "trial" in c);
  assert.deepEqual(
    trial.map(([k, c]) => [k, c.trial]),
    [
      ["empty_result_unverified", true],
      ["app_faked_in_test", true],
    ],
  );
  for (const [k, c] of trial) {
    assert.notEqual(c.calibrate, false, k);
    assert.equal(Lens.isTrial(k), true);
  }
  assert.equal(Lens.isTrial("hardcoded_base_url"), false);
});

async function until(fn, ms = 10000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}
const click = (p, sel) => p.document.querySelector(sel).dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
const puts = (p) => p.sent.filter((m) => m.type === "session:put");

test("the session's tab marks the finding", async () => {
  const code = 'def test_no_paid_orders(client):\n    r = client.get("/orders?status=paid")\n    assert r.json() == []\n';
  const text = [
    { type: "user", message: { role: "user", content: "Write the orders tests" } },
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "tool_use", id: "w", name: "Write", input: { file_path: "/w/shop/tests/test_orders.py", content: code } }],
      },
    },
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "w", content: "ok" }] } },
  ]
    .map((l) => JSON.stringify(l))
    .join("\n");
  const host = bootHost({ globalState: { settings: { profile: "qa-python", rulesTarget: "claude", modelPool: [], defaultModelId: null, lint: false } } });
  const sb = await openPage(host);
  await sb.ready();
  sb.document.querySelector("#paste").value = text;
  sb.document.querySelector("#paste-name").value = "orders";
  click(sb, "#paste-go");
  await until(() => puts(sb).length);
  await sb.idle();
  const s = puts(sb).pop().payload.session;
  sb.close();
  const f = s.findings.find((x) => x.check === "empty_result_unverified");
  assert.deepEqual([f.severity, f.trial], ["low", true]);
  const tab = await openPage(host, { sessionId: s.id });
  await tab.ready();
  const card = [...tab.document.querySelectorAll("#findings .f")].find((el) => /expects an empty result/.test(el.textContent));
  const mark = [...card.querySelectorAll(".demoted")].map((el) => [el.textContent, el.getAttribute("title")]);
  assert.deepEqual(mark, [
    [
      "new check, on trial",
      "A new check: its findings are shown as low until it has 10 verdicts. Mark them True or False: with 10, it gets its own severity, or calibration demotes it or switches it off.",
    ],
  ]);
  tab.close();
});
