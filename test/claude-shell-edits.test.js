"use strict";
/* The files a Claude Code command changed (0.1.139), from Claude Code's own diff of them: the tool result's
   toolUseResult.bashEditDiff = { files: [{ filePath, hunks: [{ oldStart, oldLines, newStart, newLines, lines }] }],
   moreFiles, unavailable } (Claude Code 2.1.285 and newer). Until 0.1.139 only a file written from a here-document was
   known: an edit by sed -i or python3 - <<EOF was not, and every check read the file as its last Write or Edit left it.
   In the owner's session 18 commands changed files, 4 of its 12 files were known as they ended, and the model's review
   reported that the spec never called a helper a Python edit had added. Now all 12 are. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const ROOT = "/w/shop";
let tick = 0,
  id = 0;
const at = () => new Date(Date.parse("2026-11-24T10:00:00.000Z") + 1000 * tick++).toISOString();
const rec = (type, content, extra) => Object.assign({ type, timestamp: at(), cwd: ROOT, message: { role: type, content } }, extra);
// a tool call and its result; `diff` is the result's bashEditDiff
function call(name, input, output = "ok", diff) {
  const t = "t" + id++;
  return [
    rec("assistant", [{ type: "tool_use", id: t, name, input }]),
    rec("user", [{ type: "tool_result", tool_use_id: t, content: output }], diff ? { toolUseResult: { stdout: output, bashEditDiff: diff } } : {}),
  ];
}
const write = (file, content) => call("Write", { file_path: `${ROOT}/${file}`, content });
const bash = (command, diff, output) => call("Bash", { command }, output, diff);
const say = (text) => [rec("assistant", [{ type: "text", text }])];
const hunk = (oldStart, oldLines, newStart, newLines, lines) => ({ oldStart, oldLines, newStart, newLines, lines });
const diffOf = (...files) => ({ files: files.map(([file, hunks]) => ({ filePath: file.startsWith("/") ? file : `${ROOT}/${file}`, hunks })), moreFiles: 0 });
const importOf = (...steps) => {
  tick = 0;
  return Lens.importAny([rec("user", "Write the cart tests"), ...steps.flat()].map((r) => JSON.stringify(r)).join("\n"), cfg);
};
const changes = (ev) => ev.filter((e) => e.kind === "write" || e.kind === "edit");
const checks = (ev) => Lens.runChecks(ev, cfg).map((f) => `${f.check} ${f.severity}`);

const SPEC = "e2e/cart.spec.ts";
const V1 = "test('total', async ({ page }) => {\n  await page.goto('/cart');\n  expect(total).toBe(3);\n});\n";

test("a sed -i or Python edit is an edit of the file, after the command, with the text the diff gives", () => {
  const ev = importOf(
    write(SPEC, V1),
    bash(
      "sed -i '' 's/toBe(3)/toBe(4)/' e2e/cart.spec.ts",
      diffOf([SPEC, [hunk(2, 3, 2, 3, ["   await page.goto('/cart');", "-  expect(total).toBe(3);", "+  expect(total).toBe(4);", " });"])]]),
    ),
  );
  const [w, e] = changes(ev);
  assert.equal(w.tool, "Write");
  assert.deepEqual([e.kind, e.tool, e.file, e.cmd], ["edit", "Bash", SPEC, ""]);
  assert.equal(e.new_content, V1.replace("toBe(3)", "toBe(4)"));
  assert.ok(e.seq > ev.find((x) => x.kind === "run_other").seq, "after the command");
  assert.equal(e.fragment_only, undefined);
});

test("several hunks, lines added and removed: each lands where the diff says", () => {
  const text = ["a", "b", "c", "d", "e", "f", "g", "h"].join("\n") + "\n";
  const ev = importOf(
    write("src/x.ts", text),
    bash(
      "python3 - <<'EOF'\nopen('src/x.ts','w').write(s)\nEOF",
      diffOf(["src/x.ts", [hunk(1, 2, 1, 3, [" a", "+a2", " b"]), hunk(6, 2, 7, 1, ["-f", " g"])]]),
    ),
  );
  assert.equal(changes(ev)[1].new_content, ["a", "a2", "b", "c", "d", "e", "g", "h"].join("\n") + "\n");
  // a later Edit starts from the text the command left
  const later = importOf(
    write(SPEC, V1),
    bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", diffOf([SPEC, [hunk(3, 1, 3, 1, ["-  expect(total).toBe(3);", "+  expect(total).toBe(4);"])]])),
    call("Edit", { file_path: `${ROOT}/${SPEC}`, old_string: "toBe(4)", new_string: "toBe(5)" }),
  );
  assert.equal(changes(later)[2].new_content, V1.replace("toBe(3)", "toBe(5)"));
});

test("a file the diff creates is a write of all of it; one the session never saw is a fragment", () => {
  const made = changes(importOf(bash("python3 - <<'EOF'\n...\nEOF", diffOf(["e2e/new.spec.ts", [hunk(0, 0, 1, 2, ["+test('a', () => {", "+});"])]]))));
  assert.deepEqual(
    made.map((e) => [e.kind, e.file, e.new_content, e.fragment_only]),
    [["write", "e2e/new.spec.ts", "test('a', () => {\n});", undefined]],
  );
  const unseen = changes(
    importOf(
      bash(
        "sed -i '' 's/3/4/' e2e/old.spec.ts",
        diffOf(["e2e/old.spec.ts", [hunk(10, 3, 10, 3, [" x", "-  expect(t).toBe(3);", "+  expect(t).toBe(4);", " y"])]]),
      ),
    ),
  );
  assert.deepEqual(
    unseen.map((e) => [e.kind, e.new_content, e.fragment_only]),
    [["edit", "x\n  expect(t).toBe(4);\ny", true]],
    "the context and the added lines",
  );
});

test("a file the command also wrote from a here-document keeps that one step, with the text of the diff", () => {
  const ev = importOf(
    write("e2e/helpers/stand.ts", "export const A = 1;\n"),
    bash(
      "cat >> e2e/helpers/stand.ts <<'EOF'\nexport const B = 2;\nEOF\npython3 - <<'EOF'\nopen('e2e/helpers/stand.ts','w').write(s)\nEOF",
      diffOf(["e2e/helpers/stand.ts", [hunk(1, 1, 1, 2, ["-export const A = 1;", "+export const A = 10;", "+export const B = 2;"])]]),
    ),
  );
  const c = changes(ev);
  assert.equal(c.length, 2, "the Write and the here-document's step");
  assert.equal(c[1].new_content, "export const A = 10;\nexport const B = 2;\n");
  // added to a file the session never saw: the here-document gave nothing, the diff gives the fragment
  const unseen = changes(importOf(bash("cat >> e2e/x.ts <<'EOF'\nb\nEOF", diffOf(["e2e/x.ts", [hunk(1, 1, 1, 2, [" a", "+b"])]]))));
  assert.deepEqual(
    unseen.map((e) => [e.kind, e.new_content, e.fragment_only]),
    [["edit", "a\nb", true]],
  );
});

// a Read and its result as Claude Code records it: the file's text from startLine, numLines of totalLines
function read(file, content, startLine = 1, totalLines = content.split("\n").length) {
  const t = "t" + id++,
    numLines = content.split("\n").length;
  return [
    rec("assistant", [{ type: "tool_use", id: t, name: "Read", input: { file_path: `${ROOT}/${file}` } }]),
    rec("user", [{ type: "tool_result", tool_use_id: t, content: "…" }], {
      toolUseResult: { type: "text", file: { filePath: `${ROOT}/${file}`, content, numLines, startLine, totalLines } },
    }),
  ];
}

test("a hunk whose lines moved lands where they are; one found nowhere is a fragment, and the file unknown after it", () => {
  // the session knows two lines more at the top than the text the diff was made on: the hunk is two lines lower
  const moved = changes(
    importOf(
      write(SPEC, "// a\n// b\n" + V1),
      bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", diffOf([SPEC, [hunk(3, 1, 3, 1, ["-  expect(total).toBe(3);", "+  expect(total).toBe(4);"])]])),
    ),
  );
  assert.equal(moved[1].new_content, "// a\n// b\n" + V1.replace("toBe(3)", "toBe(4)"));
  // the session knows another text (changed outside it): no guess at a whole file
  const other = importOf(
    write(SPEC, "test('other', () => {});\n"),
    bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", diffOf([SPEC, [hunk(3, 1, 3, 1, ["-  expect(total).toBe(3);", "+  expect(total).toBe(4);"])]])),
    call("Edit", { file_path: `${ROOT}/${SPEC}`, old_string: "toBe(4)", new_string: "toBe(5)" }),
  );
  const [, frag, next] = changes(other);
  assert.deepEqual([frag.new_content, frag.fragment_only, frag.prev_content, frag.assert_delta], ["  expect(total).toBe(4);", true, undefined, undefined]);
  assert.equal(next.fragment_only, true, "the next Edit knows only its fragment too");
  assert.ok(!checks(other).some((c) => c.startsWith("assert_weakened") || c.startsWith("test_deleted")), "nothing compared with a wrong text");
  // a here-document's step of the same command: it no longer keeps the text before as the file's earlier version
  const heredoc = changes(
    importOf(
      write(SPEC, "test('a', () => {});\ntest('b', () => {});\n"),
      bash("cat >> e2e/cart.spec.ts <<'EOF'\n// end\nEOF", diffOf([SPEC, [hunk(9, 1, 9, 2, [" });", "+// end"])]])),
    ),
  );
  assert.deepEqual([heredoc[1].fragment_only, heredoc[1].prev_content], [true, undefined]);
});

test("a Read of the whole file gives its text: the diff after it applies to that; a part of it does not", () => {
  const diff = diffOf([SPEC, [hunk(3, 1, 3, 1, ["-  expect(total).toBe(3);", "+  expect(total).toBe(4);"])]]);
  const whole = changes(importOf(read(SPEC, V1), bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", diff)));
  assert.deepEqual([whole[0].new_content, whole[0].fragment_only], [V1.replace("toBe(3)", "toBe(4)"), undefined]);
  const part = changes(importOf(read(SPEC, "  expect(total).toBe(3);", 3, 5), bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", diff)));
  assert.equal(part[0].fragment_only, true, "from line 3: not the whole file");
});

test("no diff, an unavailable one, or a scratch file: as before", () => {
  assert.equal(changes(importOf(write(SPEC, V1), bash("sed -i '' 's/3/4/' e2e/cart.spec.ts"))).length, 1, "no diff");
  assert.equal(changes(importOf(write(SPEC, V1), bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", { files: [], moreFiles: 0, unavailable: true }))).length, 1);
  assert.equal(changes(importOf(bash("python3 - <<'EOF'\n...\nEOF", diffOf(["/tmp/probe.js", [hunk(0, 0, 1, 1, ["+x"])]])))).length, 0, "a scratch file");
});

test("the checks see the edit: a weakened assertion, a fix after a red run, a test changed after a look in the browser", () => {
  const RED = "Running 1 test using 1 worker\n\n  1) [chromium] › e2e/cart.spec.ts:1:1 › total\n\n  1 failed\n";
  const weaken = diffOf([SPEC, [hunk(3, 1, 3, 1, ["-  expect(total).toBe(3);", "+  expect(total).toBeTruthy();"])]]);
  assert.ok(checks(importOf(write(SPEC, V1), bash("sed -i '' 's/toBe(3)/toBeTruthy()/' e2e/cart.spec.ts", weaken))).includes("assert_weakened high"));
  const fix = diffOf([SPEC, [hunk(3, 1, 3, 1, ["-  expect(total).toBe(3);", "+  expect(total).toBe(4);"])]]);
  const red = importOf(write(SPEC, V1), bash("npx playwright test", undefined, RED), bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", fix));
  assert.ok(checks(red).includes("fix_after_fail_without_triage high"), checks(red).join(", "));
  const named = importOf(
    write(SPEC, V1),
    bash("npx playwright test", undefined, RED),
    say("The test is wrong: the cart holds 4 items."),
    bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", fix),
  );
  assert.ok(!checks(named).some((c) => c.startsWith("fix_after_fail")), "the cause named first");
  const look =
    "node -e \"const { chromium } = require('playwright'); (async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('https://shop.test/cart'); })()\"";
  assert.ok(checks(importOf(write(SPEC, V1), bash(look))).includes("browser_check_not_in_test medium"), "a look after the last change");
  assert.ok(
    !checks(importOf(write(SPEC, V1), bash(look), bash("sed -i '' 's/3/4/' e2e/cart.spec.ts", fix))).some((c) => c.startsWith("browser_check")),
    "the test changed after it",
  );
});

test("a Claude Code session imported before whose commands changed files asks to be imported again (IMPORT_GEN 15)", () => {
  const s = (extra) => Object.assign({ profile: "qa-ts", agent: "claude-code", importGen: 14, events: [{ seq: 0, ts: "t", kind: "user", text: "Go" }] }, extra);
  const step = (cmd) => ({
    events: [
      { seq: 0, ts: "t", kind: "user", text: "Go" },
      { seq: 1, ts: "t", kind: "run_other", tool: "Bash", file: "", cmd },
    ],
  });
  const kept = (diff) =>
    JSON.stringify({ type: "user", timestamp: "t", cwd: ROOT, toolUseResult: { bashEditDiff: diff }, message: { role: "user", content: [] } });
  assert.equal(Lens.needsReimport(s({ source_text: kept(diffOf([SPEC, [hunk(1, 1, 1, 1, ["-a", "+b"])]])) })), true, "a diff with a file in the kept text");
  assert.equal(Lens.needsReimport(s({ source_text: kept({ files: [], moreFiles: 0, unavailable: true }) })), false, "a diff with no file");
  for (const cmd of [
    "sed -i '' 's/3/4/' e2e/cart.spec.ts",
    "cd e2e && sed -i.bak -e 's/a/b/' cart.spec.ts",
    "perl -pi -e 's/a/b/' x.ts",
    "python3 - <<'EOF'\np='x.ts'; open(p, 'w').write(s)\nEOF",
    "python3 -c \"import pathlib; pathlib.Path('x.ts').write_text('a')\"",
    "node -e \"require('fs').writeFileSync('x.ts', 'a')\"",
  ])
    assert.equal(Lens.needsReimport(s(step(cmd))), true, cmd);
  for (const cmd of ["sed -n '1,40p' x.ts", "python3 - <<'EOF'\nprint(open('x.ts').read())\nEOF", "npx playwright test"])
    assert.equal(Lens.needsReimport(s(step(cmd))), false, cmd);
  assert.equal(Lens.needsReimport(s(Object.assign(step("sed -i '' 's/a/b/' x.ts"), { importGen: Lens.IMPORT_GEN }))), false);
  assert.equal(Lens.needsReimport(s(Object.assign(step("sed -i '' 's/a/b/' x.ts"), { agent: "codex" }))), false, "another agent");
});
