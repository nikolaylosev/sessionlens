"use strict";
/* cli/lib/engines.js: the lint engines in Node, for the CLI (phase 11, step 2). One language's engine, loaded once per
   process from the files of media/, so LensLint.run() finds it as on the page: the ESLint bundles, the tree-sitter
   engines booted from their .wasm files, Ruff with Python, the Robot parser. A language without an engine is "none";
   an engine that does not load or boot is "failed" with the reason, never an exception (the CLI's exit code 2).
   The engines' findings themselves are pinned by lazy-engines.test.js (lint-v0101.json), which loads them through
   this loader too (perf/snapshot-lint.js). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { load, M, root } = require("./helpers");
const { CODE } = require("../perf/snapshot-lint");

const { Lens } = load();
const LensAnalyze = require(M("analyze.js"));
const ENGINES = path.join(root, "cli", "lib", "engines.js");
const { loadEngine } = require(ENGINES);

// the failures run in a process of their own: a loaded engine is a global of the process, as on a page
const inChild = (script) => {
  const r = spawnSync(process.execPath, ["-e", `const { loadEngine } = require(${JSON.stringify(ENGINES)});\n${script}`], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};
const copyMedia = (files, change = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-engines-"));
  for (const f of ["i18n.js", "checks.js", "lens.js", "lint.js", ...files]) fs.copyFileSync(M(f), path.join(dir, f));
  for (const [f, content] of Object.entries(change)) fs.writeFileSync(path.join(dir, f), content);
  dirs.push(dir);
  return dir;
};
const dirs = [];
test.after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

const loadIn = (language, dir) =>
  inChild(`loadEngine(${JSON.stringify(language)}, { dir: ${JSON.stringify(dir)} }).then((r) => console.log(JSON.stringify(r)));`);
const PY = ["tree-sitter.js", "tree-sitter.wasm", "tree-sitter-python.wasm", "vendor-ruff.js", "ruff.wasm", "lint-ruff.js", "lint-python.js"];

test("a file that is not there, or a .wasm that does not boot: failed, with the reason", () => {
  const r = loadIn("typescript", copyMedia([]));
  assert.equal(r.state, "failed");
  assert.match(r.error, /vendor-eslint\.js/);
  assert.deepEqual(loadIn("typescript", copyMedia([], { "vendor-eslint.js": "var Other = 1;\n" })), {
    state: "failed",
    error: "vendor-eslint.js defined no engine",
  });
  // tree-sitter's boot() keeps its error and stays not ready
  const java = loadIn("java", copyMedia(["tree-sitter.js", "tree-sitter.wasm", "lint-java.js"]));
  assert.equal(java.state, "failed");
  assert.match(java.error, /tree-sitter-java\.wasm/);
  const wasm = loadIn("python", copyMedia(PY, { "ruff.wasm": "not wasm" }));
  assert.equal(wasm.state, "failed");
  assert.match(wasm.error, /WebAssembly/);
  // Python's boot() goes on when Ruff does not load (a page shows tree-sitter's findings alone); for the CLI half an
  // engine is no engine
  const noRuff = loadIn("python", copyMedia(PY, { "vendor-ruff.js": "module.exports = null;\n" }));
  assert.deepEqual(noRuff, { state: "failed", error: "Ruff: vendor-ruff.js not loaded" });
  assert.deepEqual(loadIn("python", copyMedia(PY)), { state: "ready" }, "the same files, Ruff as it is");
});

test("each language's engine loads, and the analysis then has the engine's findings", async () => {
  for (const [profile, [file, code]] of Object.entries(CODE)) {
    const cfg = Lens.profile(profile);
    assert.deepEqual(await loadEngine(Lens.lintLanguage(cfg)), { state: "ready" }, profile);
    const s = LensAnalyze.analyze({ profile, events: [{ seq: 1, kind: "write", file, new_content: code }], verdicts: {} });
    assert.match(s.lintNote, /: \d+ findings? in 1 block/, `${profile}: ${s.lintNote}`);
    assert.ok(
      s.findings.some((f) => f.source === "lint"),
      profile,
    );
  }
  assert.equal(globalThis.LensLintRuff.isReady(), true, "Ruff booted with Python");
});

test("a language without an engine is none; an engine is loaded once per process", async () => {
  for (const language of ["api", "mobile", "any", "go"]) assert.deepEqual(await loadEngine(language), { state: "none" }, language);
  assert.equal(loadEngine("java"), loadEngine("java"));
});
