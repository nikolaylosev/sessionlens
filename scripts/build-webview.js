"use strict";
/* Builds media/app.js from src/webview (phase 7, 7B.4): one IIFE, not minified, no source map, so sidepanel.html,
   extension.js's SCRIPT_FILES, the CSP and the test harness keep seeing one classic script. Since 0.1.130 also
   media/cursor-hook.js from src/hook: the Cursor hook, one CommonJS file for Node with what it needs from lens.js, so
   it can be copied out of the extension on its own. `--check` fails when a committed file is not what the sources build
   to (CI). */
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const root = path.join(__dirname, "..");
const OUTPUTS = [
  {
    file: "app.js",
    src: "src/webview",
    options: { entryPoints: [path.join(root, "src", "webview", "index.js")], format: "iife" },
  },
  {
    file: "cursor-hook.js",
    src: "src/hook",
    options: { entryPoints: [path.join(root, "src", "hook", "cursor-hook.js")], format: "cjs", platform: "node" },
  },
];

async function build({ file, src, options }) {
  const r = await esbuild.build(
    Object.assign(
      {
        bundle: true,
        minify: false,
        sourcemap: false,
        write: false,
        target: "es2022",
        charset: "utf8",
        legalComments: "none",
        logLevel: "warning",
        banner: { js: `/* Generated from ${src} by \`npm run build\` (scripts/build-webview.js). Do not edit: change ${src}. */` },
      },
      options,
    ),
  );
  return { file, src, code: r.outputFiles[0].text };
}

Promise.all(OUTPUTS.map(build))
  .then((built) => {
    const check = process.argv.includes("--check");
    let stale = false;
    for (const { file, src, code } of built) {
      const out = path.join(root, "media", file);
      if (check) {
        const now = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
        if (now !== code) {
          console.error(`media/${file} is not what ${src} builds to: run \`npm run build\` and commit it.`);
          stale = true;
        } else console.log(`media/${file} is up to date`);
        continue;
      }
      fs.writeFileSync(out, code);
      console.log(`media/${file}: ${code.length} bytes`);
    }
    if (stale) process.exit(1);
  })
  .catch((e) => {
    console.error((e && e.message) || e);
    process.exit(1);
  });
