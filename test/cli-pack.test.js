"use strict";
/* The CLI's npm package (phase 11, step 5): scripts/pack-cli.js puts cli/bin, cli/lib and the media/ files the CLI runs
   on in one folder. What must hold: nothing else of the repository goes in, npm packs every file of it, the version is
   the extension's, and the package runs from where it is installed, on its own copy of the core and the engines. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { root } = require("./helpers");

const { stage, CORE, ENGINES } = require(path.join(root, "scripts", "pack-cli.js"));

const out = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sl-pack-"))); // macOS: /var is /private/var
test.after(() => fs.rmSync(out, { recursive: true, force: true }));
const dir = path.join(out, "package");
const pkg = stage(dir);
const list = (d, at = "") =>
  fs
    .readdirSync(path.join(d, at), { withFileTypes: true })
    .flatMap((x) => (x.isDirectory() ? list(d, path.posix.join(at, x.name)) : [path.posix.join(at, x.name)]));

test("the package: the CLI, the core and every engine with its .wasm, the licence and notices; nothing else", () => {
  const ext = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const cli = JSON.parse(fs.readFileSync(path.join(root, "cli", "package.json"), "utf8"));
  assert.equal(cli.version, ext.version, "the CLI's version is the extension's");
  assert.equal(cli.private, true, "npm publish in cli/, without media/, is refused");
  const staged = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  assert.equal(staged.private, undefined);
  assert.deepEqual(staged, pkg);
  assert.equal(staged.bin.sessionlens, "bin/sessionlens.js");
  const libs = fs.readdirSync(path.join(root, "cli", "lib")).map((f) => "lib/" + f);
  assert.deepEqual(
    list(dir).sort(),
    ["LICENSE", "README.md", "THIRD-PARTY-NOTICES.md", "package.json", "bin/sessionlens.js", ...libs, ...[...CORE, ...ENGINES].map((f) => "media/" + f)].sort(),
  );
  for (const f of [
    "tree-sitter.wasm",
    "tree-sitter-java.wasm",
    "tree-sitter-c_sharp.wasm",
    "tree-sitter-python.wasm",
    "ruff.wasm",
    "vendor-eslint-cypress.js",
    "lint-robot.js",
  ])
    assert.ok(ENGINES.includes(f), f);
  // what npm puts in the .tgz is the whole folder (the "files" field misses nothing)
  const npm = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["pack", "--dry-run", "--json"], {
    cwd: dir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  assert.equal(npm.status, 0, npm.stderr);
  assert.deepEqual(
    JSON.parse(npm.stdout)[0]
      .files.map((f) => f.path)
      .sort(),
    list(dir).sort(),
  );
});

test("installed elsewhere, the package runs on its own media/: the core, an engine, the version", () => {
  // a copy away from the repository, so nothing can be found through ../../media
  const away = path.join(out, "away", "node_modules", "sessionlens-cli");
  fs.cpSync(dir, away, { recursive: true });
  assert.equal(require(path.join(away, "lib", "media.js")), path.join(away, "media"));
  const run = (args) => spawnSync(process.execPath, [path.join(away, "bin", "sessionlens.js"), ...args], { encoding: "utf8", cwd: out });
  const v = run(["--version"]);
  assert.equal(v.status, 0, v.stderr);
  assert.equal(v.stdout, pkg.version + "\n");
  const J = JSON.stringify;
  const code = "import { test } from '@playwright/test';\ntest('a', async ({ page }) => {\n  await page.waitForTimeout(2000);\n});\n";
  const log = [
    J({ type: "user", message: { role: "user", content: "Write a test" } }),
    J({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Write", input: { file_path: "tests/a.spec.ts", content: code } }] },
    }),
    J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] } }),
  ].join("\n");
  fs.writeFileSync(path.join(out, "a.jsonl"), log);
  const r = run(["analyze", "a.jsonl", "--profile", "qa-ts", "--json"]);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.sessionlens, pkg.version);
  assert.ok(
    j.findings.some((f) => f.check === "sleep_or_skip_added" && f.source === "lint"),
    "the ESLint engine of the package ran",
  );
  // Python: tree-sitter and Ruff from the package's .wasm files
  const py = run(["analyze", "a.jsonl", "--profile", "qa-python"]);
  assert.equal(py.status, 0, py.stderr);
});
