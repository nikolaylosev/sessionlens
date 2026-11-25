"use strict";
/* A Claude Code command's paths are from the folder its shell is in (0.1.139). Claude Code writes that folder into every
   record (`cwd`), and a `cd` in one command moves it for the next. Until then a path in a command was taken from the
   session's folder: in the owner's session the agent ran `cd qa-ts`, and `cat > helpers/global-teardown.ts` later on
   became helpers/global-teardown.ts at the root, a file that never existed; the model's review reported it as a stray
   copy. `cat >> helpers/stand.ts` went to a file the session never saw and was dropped. peeked_at_src_before_plan named
   src/AppBundle/… for a file in deliverables/source/rtldev-dd24-login/src/AppBundle/…, and took the agent's own files
   for product code. Over the owner's 65 local sessions, the shell left the session's folder in 28.
   Not covered here, and not changed: test_deleted takes a renamed test for a deleted one (pm-mvp-kit, a file now
   compared with its earlier version at the right path); see the PR. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

let tick = 0;
const at = () => new Date(Date.parse("2026-11-24T10:00:00.000Z") + 1000 * tick++).toISOString();
const ROOT = "/w/shop";
// a step of the agent with the folder its shell was in; tool_use ids are unique per transcript
let id = 0;
const user = (text, cwd = ROOT) => ({ type: "user", timestamp: at(), cwd, message: { role: "user", content: text } });
const tool = (name, input, cwd = ROOT) => {
  const t = "t" + id++;
  return [
    { type: "assistant", timestamp: at(), cwd, message: { role: "assistant", content: [{ type: "tool_use", id: t, name, input }] } },
    { type: "user", timestamp: at(), cwd, message: { role: "user", content: [{ type: "tool_result", tool_use_id: t, content: "ok" }] } },
  ];
};
const bash = (command, cwd) => tool("Bash", { command }, cwd);
const write = (file_path, content, cwd) => tool("Write", { file_path, content }, cwd);
const importOf = (...steps) => {
  tick = 0;
  return Lens.importAny([user("Write the tests"), ...steps.flat()].map((r) => JSON.stringify(r)).join("\n"), cfg);
};
const files = (ev) => ev.filter((e) => e.kind === "write" || e.kind === "edit").map((e) => `${e.kind} ${e.file}`);
const peeked = (ev) =>
  Lens.runChecks(ev, cfg)
    .filter((f) => f.check === "peeked_at_src_before_plan")
    .map((f) => f.message.replace(/^Read (.*) before the plan.*$/, "$1"));

test("a file a command writes from a here-document is in the folder the shell is in", () => {
  const ev = importOf(
    write(`${ROOT}/qa/helpers/stand.ts`, "export const A = 1;\n", `${ROOT}/qa`),
    bash("cat > helpers/teardown.ts <<'EOF'\nexport default () => {};\nEOF\ncat >> helpers/stand.ts <<'EOF'\nexport const B = 2;\nEOF", `${ROOT}/qa`),
  );
  assert.deepEqual(files(ev), ["write qa/helpers/stand.ts", "write qa/helpers/teardown.ts", "edit qa/helpers/stand.ts"]);
  assert.equal(ev.find((e) => e.kind === "edit").new_content, "export const A = 1;\nexport const B = 2;\n", "the text added to the file it was written to");
  // a cd in the command still moves it, from the shell's folder
  assert.deepEqual(files(importOf(bash("cd helpers && cat > x.ts <<'EOF'\nx\nEOF", `${ROOT}/qa`))), ["write qa/helpers/x.ts"]);
});

test("a command's step keeps the folder its shell was in, from the session's folder, and the home folder as ~", () => {
  const ev = importOf(bash("ls", ROOT), bash("ls", `${ROOT}/qa`), bash("ls", "/w/other"));
  assert.deepEqual(
    ev.filter((e) => e.kind === "run_other").map((e) => e.dir),
    [undefined, "qa", "/w/other"],
  );
  tick = 0;
  const home = Lens.importAny(
    [user("Go", "/Users/me/shop"), ...bash("ls", "/Users/me/other"), ...bash("cat /Users/me/shop/src/a.ts", "/Users/me/shop")]
      .map((r) => JSON.stringify(r))
      .join("\n"),
    cfg,
  );
  assert.deepEqual(
    home.filter((e) => e.kind === "run_other").map((e) => [e.dir, e.root]),
    [
      ["~/other", undefined],
      [undefined, "~/shop"],
    ],
  );
});

test("a path a command reads is from the shell's folder and from a cd before it", () => {
  assert.deepEqual(peeked(importOf(bash("grep -n x src/Account.php", `${ROOT}/login`))), ["login/src/Account.php"]);
  assert.deepEqual(peeked(importOf(bash("cd login && sed -n 1,40p src/Account.php"))), ["login/src/Account.php"]);
  assert.deepEqual(peeked(importOf(bash("cd ../shop/login/./ && cat src/A.php", ROOT))), ["../shop/login/src/A.php"], "a folder outside stays from here");
  assert.deepEqual(peeked(importOf(bash(`cd ${ROOT}/login && cat src/A.php`, "/tmp"))), ["login/src/A.php"], "an absolute folder in the session's one");
  assert.deepEqual(peeked(importOf(bash(`cat ${ROOT}/login/src/A.php`))), ["login/src/A.php"], "an absolute path in the session's folder");
  assert.deepEqual(peeked(importOf(bash("cd /elsewhere && cat src/A.php"))), ["/elsewhere/src/A.php"], "an absolute folder outside");
  // a cd is no read of its folder
  assert.deepEqual(peeked(importOf(bash("cd src && cat cart.ts"))), ["src/cart.ts"]);
  assert.deepEqual(peeked(importOf(bash("cd src"))), []);
  // cd - or a folder from a variable: the folder is not known, the path is as written
  assert.deepEqual(peeked(importOf(bash("cd - && cat src/a.ts", `${ROOT}/qa`))), ["src/a.ts"]);
  assert.deepEqual(peeked(importOf(bash('cd "$D" && cat src/a.ts'))), ["src/a.ts"]);
  // with the home folder spelled as ~ in the command
  tick = 0;
  const home = Lens.importAny(
    [user("Go", "/Users/me/shop"), ...bash("cd ~/shop/login && cat src/A.php", "/Users/me/shop")].map((r) => JSON.stringify(r)).join("\n"),
    cfg,
  );
  assert.deepEqual(peeked(home), ["login/src/A.php"]);
});

test("reading back a file the agent wrote is no look at the product, from whatever folder", () => {
  const own = write(`${ROOT}/qa/src/cart.ts`, "export class Cart {}\n");
  assert.deepEqual(peeked(importOf(own, bash("cat src/cart.ts", `${ROOT}/qa`))), []);
  assert.deepEqual(peeked(importOf(own, bash("cd qa && cat src/cart.ts"))), []);
  assert.deepEqual(peeked(importOf(own, bash("cat src/cart.ts"))), ["src/cart.ts"], "another folder: not the agent's file");
});

test("a Claude Code session imported before whose shell left its folder asks to be imported again (IMPORT_GEN 15)", () => {
  const s = (extra) => Object.assign({ profile: "qa-ts", agent: "claude-code", importGen: 14, events: [{ seq: 0, ts: "t", kind: "user", text: "Go" }] }, extra);
  const line = (cwd) => JSON.stringify({ type: "user", timestamp: "t", cwd, message: { role: "user", content: "Go" } });
  assert.equal(Lens.needsReimport(s({ source_text: [line(ROOT), line(`${ROOT}/qa`)].join("\n") })), true, "two folders in the kept text");
  assert.equal(Lens.needsReimport(s({ source_text: [line(ROOT), line(ROOT)].join("\n") })), false, "one folder");
  const bashWrite = { seq: 1, ts: "t", kind: "write", tool: "Bash", file: "helpers/x.ts", cmd: "" };
  assert.equal(Lens.needsReimport(s({ events: [s().events[0], bashWrite] })), true, "no text kept: a file a command wrote");
  assert.equal(Lens.needsReimport(s({ events: [s().events[0], Object.assign({}, bashWrite, { tool: "Write" })] })), false, "a file the Write tool wrote");
  assert.equal(Lens.needsReimport(s({ events: [s().events[0], bashWrite], importGen: Lens.IMPORT_GEN })), false);
  assert.equal(Lens.needsReimport(s({ events: [s().events[0], bashWrite], agent: "codex" })), false, "another agent");
});
