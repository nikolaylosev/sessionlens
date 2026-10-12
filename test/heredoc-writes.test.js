"use strict";
/* A file written by a shell command from a here-document (0.1.127): `cat > f <<'EOF' … EOF`, `cat <<EOF > f`,
   `cat >> f` (an edit that adds to the end of a file the session saw), `tee [-a] f`. It becomes a write of its own
   before the command's step, so the code checks and assert_weakened read it. Not a here-document inside $(…), one fed
   to another program (python3 -), `cat <<EOF` with no file, or a scratch file (a temporary folder, *.tmp.*, $VAR). */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");
const files = (cmd, cwd = "/Users/me/p") => Lens.heredocWrites(cmd, cwd).map((w) => [w.file, w.text, w.append]);

test("the forms of a here-document that write a file, and the folder the path is from", () => {
  assert.deepEqual(files("cat > tests/a.spec.ts <<'EOF'\nline 1\n  line 2\nEOF\nnpx playwright test"), [
    ["/Users/me/p/tests/a.spec.ts", "line 1\n  line 2\n", false],
  ]);
  assert.deepEqual(files('cat <<"EOF" > b.ts\nB\nEOF'), [["/Users/me/p/b.ts", "B\n", false]]);
  assert.deepEqual(files("cat >> 'c d.ts' << END\nC\nEND"), [["/Users/me/p/c d.ts", "C\n", true]]);
  assert.deepEqual(files("tee -a /srv/e.ts <<EOF\nE\nEOF"), [["/srv/e.ts", "E\n", true]]);
  assert.deepEqual(files("tee f.ts <<EOF >/dev/null\nF\nEOF"), [["/Users/me/p/f.ts", "F\n", false]]);
  assert.deepEqual(files("cat <<-EOF > g.ts\n\tG\n\tEOF"), [["/Users/me/p/g.ts", "G\n", false]], "<<- drops the leading tabs");
  assert.deepEqual(files("cd ~/shop && cat > t.ts <<EOF\nT\nEOF"), [["/Users/me/shop/t.ts", "T\n", false]], "cd to the home folder");
  assert.deepEqual(files("cd /srv/app; cat > t.ts <<EOF\nT\nEOF"), [["/srv/app/t.ts", "T\n", false]]);
  assert.deepEqual(
    files("cat > a.ts <<EOF\nA\nEOF\ncat > b.ts <<'X'\nB\nX"),
    [
      ["/Users/me/p/a.ts", "A\n", false],
      ["/Users/me/p/b.ts", "B\n", false],
    ],
    "two in one command",
  );
});

test("not a file written: $(cat <<EOF), another program, no file, a scratch file, no end", () => {
  assert.deepEqual(files("git commit -m \"$(cat <<'EOF'\nfix: x\nEOF\n)\""), []);
  assert.deepEqual(files("gh pr create --body \"$(cat <<'EOF'\nbody\nEOF\n)\" && cat > z.ts <<EOF\nZ\nEOF"), [["/Users/me/p/z.ts", "Z\n", false]]);
  assert.deepEqual(files("python3 - <<'EOF'\nopen('a.ts','w').write('x')\nEOF"), []);
  assert.deepEqual(files("git commit -F - <<'EOF'\nmsg\nEOF"), []);
  assert.deepEqual(files("python3 - <<'EOF' > out.ts\nprint('x')\nEOF"), [], "the file gets what python prints, not the text");
  assert.deepEqual(files("echo \"$(cat > note.ts <<'EOF'\nN\nEOF\n)\""), [], "inside $(…)");
  assert.deepEqual(files("cat <<EOF\nonly printed\nEOF"), []);
  assert.deepEqual(files("cat > /tmp/inspect.js <<EOF\nx\nEOF"), []);
  assert.deepEqual(files("cd /private/tmp/s && cat > probe.js <<EOF\nx\nEOF"), []);
  assert.deepEqual(files("cat > inspect2.tmp.js <<EOF\nx\nEOF"), []);
  assert.deepEqual(files("cat > $S/probe.js <<EOF\nx\nEOF"), []);
  assert.deepEqual(files("cat > a.ts <<EOF\nno end"), []);
});

// a Claude Code transcript of Bash commands
const line = (o) => JSON.stringify(o);
const bash = (id, command, output) => [
  line({ type: "assistant", cwd: "/Users/me/p", message: { role: "assistant", content: [{ type: "tool_use", id, name: "Bash", input: { command } }] } }),
  line({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: output }] } }),
];
const run = (lines) => Lens.importAny([line({ type: "user", message: { role: "user", content: "Write the tests" } }), ...lines].join("\n"), cfg);
const TEST = (a) => `test('save', async ({ page }) => {\n  await page.getByRole('button', { name: 'Save' }).click();\n  ${a}\n});\n`;

test("the write is a step before the command, and the checks read it", () => {
  const ev = run(
    bash(
      "a",
      `cat > tests/save.spec.ts <<'EOF'\n${TEST("await page.waitForTimeout(500);\n  await expect(page.getByText('Saved')).toHaveText('Saved');")}EOF\nnpx playwright test`,
      "  1 passed (1.0s)",
    ),
  );
  assert.deepEqual(
    ev.map((e) => [e.kind, e.file || ""]),
    [
      ["user", ""],
      ["write", "tests/save.spec.ts"],
      ["run_tests", ""],
    ],
  );
  assert.match(ev[1].new_content, /waitForTimeout\(500\)/);
  assert.ok(
    Lens.runChecks(ev, cfg).some((f) => f.check === "sleep_or_skip_added"),
    "the code checks read the file",
  );
});

test("a session imported before with such a command asks to be imported again (IMPORT_GEN 9)", () => {
  const s = (cmd) => ({
    profile: "qa-ts",
    importGen: 8,
    events: [
      { seq: 0, kind: "user", text: "x" },
      { seq: 1, kind: "run_other", cmd },
    ],
  });
  assert.equal(Lens.needsReimport(s("cat > tests/a.spec.ts <<'EOF'\nx\nEOF")), true);
  assert.equal(Lens.needsReimport(s("git commit -m \"$(cat <<'EOF'\nmsg\nEOF\n)\"")), false);
  assert.equal(Lens.needsReimport(Object.assign(s("cat > tests/a.spec.ts <<'EOF'\nx\nEOF"), { importGen: Lens.IMPORT_GEN })), false);
});

test("a rewrite through cat > shows a weakened assertion; >> adds to the file the session saw", () => {
  const strong = TEST("await expect(page.getByText('Saved')).toHaveText('Saved');"),
    weak = TEST("await expect(page.getByText('Saved')).toBeVisible();");
  const ev = run([...bash("a", `cat > tests/save.spec.ts <<'EOF'\n${strong}EOF`, ""), ...bash("b", `cat > tests/save.spec.ts <<'EOF'\n${weak}EOF`, "")]);
  assert.deepEqual(
    Lens.runChecks(ev, cfg)
      .filter((f) => f.check === "assert_weakened")
      .map((f) => f.message),
    [
      "tests/save.spec.ts: save — assertion weakened (await expect(page.getByText('Saved')).toHaveText('Saved'); → await expect(page.getByText('Saved')).toBeVisible();)",
    ],
  );
  const added = run([
    ...bash("a", `cat > tests/save.spec.ts <<'EOF'\n${strong}EOF`, ""),
    ...bash("b", "cat >> tests/save.spec.ts <<'EOF'\n// the end\nEOF", ""),
  ]);
  assert.equal(added[3].kind, "edit");
  assert.equal(added[3].new_content, strong + "// the end\n");
  // >> to a file this session never saw: its text is not known, no step
  assert.deepEqual(
    run(bash("c", "cat >> tests/other.spec.ts <<'EOF'\nx\nEOF", "")).map((e) => e.kind),
    ["user", "run_other"],
  );
});
