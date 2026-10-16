"use strict";
/* Ruff for the Python engine (0.1.129): media/vendor-ruff.js and media/ruff.wasm from the npm package
   @astral-sh/ruff-wasm-web (a devDependency, pinned). The package is an ES module; the panel loads its engines as
   classic <script>s (lint.js's ensure()) and Node's tests require() them, so its code is wrapped the way the other
   engines are: a UMD that sets the global RuffWasm or module.exports. Nothing else changes: `export` goes, and the
   default .wasm path (import.meta.url, a syntax error outside a module) becomes "ruff.wasm"; lint-ruff.js always
   passes the URI or the bytes anyway.
   node scripts/vendor-ruff.js          writes both files
   node scripts/vendor-ruff.js --check  fails if they are not what the package makes (test/ruff.test.js) */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PKG = path.join(ROOT, "node_modules", "@astral-sh", "ruff-wasm-web");
const OUT_JS = path.join(ROOT, "media", "vendor-ruff.js");
const OUT_WASM = path.join(ROOT, "media", "ruff.wasm");

function build() {
  const version = JSON.parse(fs.readFileSync(path.join(PKG, "package.json"), "utf8")).version;
  let src = fs.readFileSync(path.join(PKG, "ruff_wasm.js"), "utf8");
  // each change must apply exactly as often as expected: a new version of the package that differs fails here
  const swap = (from, to, times) => {
    const n = src.split(from).length - 1;
    if (n !== times) throw new Error(`vendor-ruff: expected ${times} × ${JSON.stringify(from)} in ruff_wasm.js, found ${n}`);
    src = src.split(from).join(to);
  };
  swap("new URL('ruff_wasm_bg.wasm', import.meta.url)", '"ruff.wasm"', 1);
  swap("export { initSync, __wbg_init as default };", "", 1);
  src = src.replace(/^export (const|class|function) /gm, "$1 ");
  if (/^\s*(?:export|import)\b|import\.meta/m.test(src)) throw new Error("vendor-ruff: ruff_wasm.js still has module syntax");
  const js =
    `/* @astral-sh/ruff-wasm-web ${version} (MIT, https://github.com/astral-sh/ruff), wrapped as a UMD by scripts/vendor-ruff.js.\n` +
    `   Generated: do not edit. Licence and notices: THIRD-PARTY-NOTICES.md. */\n` +
    `(function (root, factory) {\n` +
    `  if (typeof module === "object" && module.exports) module.exports = factory();\n` +
    `  else root.RuffWasm = factory();\n` +
    `})(typeof self !== "undefined" ? self : this, function () {\n` +
    `"use strict";\n` +
    src.trim() +
    `\nreturn { init: __wbg_init, initSync, Workspace, PositionEncoding, version: "${version}" };\n});\n`;
  return { js, wasm: fs.readFileSync(path.join(PKG, "ruff_wasm_bg.wasm")) };
}

if (require.main === module) {
  const { js, wasm } = build();
  if (process.argv.includes("--check")) {
    const same = fs.existsSync(OUT_JS) && fs.readFileSync(OUT_JS, "utf8") === js && fs.existsSync(OUT_WASM) && fs.readFileSync(OUT_WASM).equals(wasm);
    if (!same) {
      console.error("media/vendor-ruff.js or media/ruff.wasm is not what scripts/vendor-ruff.js makes of the package");
      process.exit(1);
    }
    console.log("vendor-ruff: up to date");
  } else {
    fs.writeFileSync(OUT_JS, js);
    fs.writeFileSync(OUT_WASM, wasm);
    console.log(`vendor-ruff: media/vendor-ruff.js (${js.length} bytes), media/ruff.wasm (${wasm.length} bytes)`);
  }
}

module.exports = { build, OUT_JS, OUT_WASM, PKG };
