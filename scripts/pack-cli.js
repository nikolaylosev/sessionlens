"use strict";
/* Builds the npm package of the CLI (phase 11, step 5): cli/bin, cli/lib and the files of media/ the CLI runs on (the
   core modules, the lint engines of every language, their .wasm files) in one folder, with the licence and the
   third-party notices, then `npm pack` makes the .tgz. Nothing else of the repository goes in.

   node scripts/pack-cli.js [--out <dir>] [--stage-only]
   --out: where the package folder (package/) and the .tgz go, dist/cli by default; --stage-only: the folder, no .tgz.
   cli/package.json is "private" so that `npm publish` in cli/ (without media/) is refused; the packed copy is not.
   Its version must be the extension's: the CLI and the extension analyze with the same version of the core. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const MEDIA = path.join(root, "media");
const LensLint = require(path.join(MEDIA, "lint.js"));
const { WASM } = require(path.join(root, "cli", "lib", "engines.js"));

// the core: what media/analyze.js, media/report.js and the CLI require, with what those require in turn
const CORE = ["i18n.js", "checks.js", "lens.js", "lint.js", "rules.js", "spec.js", "analyze.js", "report.js"];
// the engines: every file of every language (lint.js's ENGINE_FILES), Robot's parser and the .wasm files
const ENGINES = [...new Set(Object.values(LensLint.ENGINE_FILES).flatMap((e) => e.js)), "lint-robot.js", ...Object.values(WASM)];

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function stage(dir) {
  const ext = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "cli", "package.json"), "utf8"));
  if (pkg.version !== ext.version) throw new Error(`cli/package.json is ${pkg.version}, the extension ${ext.version}: they must be the same`);
  fs.rmSync(dir, { recursive: true, force: true });
  for (const sub of ["bin", "lib"]) for (const f of fs.readdirSync(path.join(root, "cli", sub))) copy(path.join(root, "cli", sub, f), path.join(dir, sub, f));
  fs.chmodSync(path.join(dir, "bin", "sessionlens.js"), 0o755);
  for (const f of [...CORE, ...ENGINES]) copy(path.join(MEDIA, f), path.join(dir, "media", f));
  copy(path.join(root, "cli", "README.md"), path.join(dir, "README.md"));
  copy(path.join(root, "LICENSE"), path.join(dir, "LICENSE"));
  copy(path.join(root, "THIRD-PARTY-NOTICES.md"), path.join(dir, "THIRD-PARTY-NOTICES.md"));
  delete pkg.private;
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  return pkg;
}

function main(argv) {
  const at = argv.indexOf("--out");
  const out = path.resolve(at >= 0 ? argv[at + 1] : path.join(root, "dist", "cli"));
  const dir = path.join(out, "package");
  const pkg = stage(dir);
  if (argv.includes("--stage-only")) {
    console.log(dir);
    return;
  }
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const name = execFileSync(npm, ["pack", "--pack-destination", out], { cwd: dir, encoding: "utf8", shell: process.platform === "win32" })
    .trim()
    .split("\n")
    .pop();
  console.log(path.join(out, name));
  console.log(`${pkg.name} ${pkg.version}: publish with  npm publish ${path.join(out, name)}`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { stage, CORE, ENGINES };
