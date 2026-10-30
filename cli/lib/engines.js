"use strict";
/* The lint engines in Node, for the CLI (phase 11, step 2). A page loads an engine's files as <script>s when a session
   needs it (LensLint.ensure); Node has no page, so here the same files run in this process and a tree-sitter engine is
   booted from the .wasm files on disk. One language at a time and once per process: the CLI loads only the engine of
   the profile's language. LensLint.run() then finds the engine as a global, as on the page.

   loadEngine(language, { dir }) → Promise of { state: "ready" | "none" | "failed", error? }
   "none": the language has no engine (api, mobile, any, go), and the regex checks are the whole analysis. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const MEDIA = require("./media");
// the global each file defines on a page; the ESLint bundles are plain scripts and define theirs themselves
const GLOBAL = {
  "tree-sitter.js": "TreeSitter",
  "vendor-ruff.js": "RuffWasm",
  "lint-ruff.js": "LensLintRuff",
  "lint-java.js": "LensLintJava",
  "lint-csharp.js": "LensLintCSharp",
  "lint-python.js": "LensLintPython",
  "lint-robot.js": "LensLintRobot",
};
// the .wasm files the tree-sitter engines and Ruff boot from (extension.js's WASM_ASSETS; scripts/pack-cli.js packs them)
const WASM = {
  core: "tree-sitter.wasm",
  java: "tree-sitter-java.wasm",
  csharp: "tree-sitter-c_sharp.wasm",
  python: "tree-sitter-python.wasm",
  ruff: "ruff.wasm",
};
// what a tree-sitter engine's boot() needs: on a page the webview URIs (lint.js BOOT_OPTS), here the files themselves
const BOOT = {
  java: (dir) => ({ locateCore: () => path.join(dir, WASM.core), javaWasmUrl: path.join(dir, WASM.java) }),
  csharp: (dir) => ({ locateCore: () => path.join(dir, WASM.core), csharpWasmUrl: path.join(dir, WASM.csharp) }),
  python: (dir) => ({
    locateCore: () => path.join(dir, WASM.core),
    pythonWasmUrl: path.join(dir, WASM.python),
    ruffWasmBytes: fs.readFileSync(path.join(dir, WASM.ruff)),
  }),
};

const loaded = {};

function runFile(dir, file) {
  const name = GLOBAL[file];
  if (name && globalThis[name]) return;
  const p = path.join(dir, file);
  if (name) {
    globalThis[name] = require(p);
    return;
  }
  // the Cypress bundle reads __dirname while it initializes (a leftover of a Node module it carries); a page has a
  // harmless one via the bundle's own shim, this process's global scope has none
  if (typeof globalThis.__dirname === "undefined") globalThis.__dirname = dir;
  vm.runInThisContext(fs.readFileSync(p, "utf8"), { filename: p });
}

async function load(language, dir) {
  const LensLint = require(path.join(dir, "lint.js"));
  // Robot's parser is part of the page, not a lazily loaded engine, so lint.js's ENGINE_FILES does not list it
  const spec = language === "robot" ? { js: ["lint-robot.js"] } : LensLint.ENGINE_FILES[language];
  if (!spec) return { state: "none" };
  for (const f of spec.js) runFile(dir, f);
  if (!LensLint.available(language)) return { state: "failed", error: `${spec.js.join(", ")} defined no engine` };
  if (spec.boot) {
    const core = globalThis[GLOBAL[spec.js[spec.js.length - 1]]];
    if (!core.isReady()) await core.boot(BOOT[spec.boot](dir));
    if (!core.isReady()) return { state: "failed", error: String(core.bootError() || "did not boot") };
    // Python's boot() boots Ruff too, and goes on without it; half an engine is no engine for the CLI
    const ruff = globalThis.LensLintRuff;
    if (spec.boot === "python" && !ruff.isReady()) return { state: "failed", error: `Ruff: ${ruff.bootError() || "did not boot"}` };
  }
  return { state: "ready" };
}

function loadEngine(language, { dir = MEDIA } = {}) {
  const key = `${dir}\0${language}`;
  if (!loaded[key]) loaded[key] = load(language, dir).catch((e) => ({ state: "failed", error: (e && e.message) || String(e) }));
  return loaded[key];
}

module.exports = { loadEngine, WASM };
