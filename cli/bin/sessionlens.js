#!/usr/bin/env node
"use strict";
/* The sessionlens command (phase 11). Everything is in cli/lib/cli.js; this file only hands it the process. */
const { run } = require("../lib/cli");

run(process.argv.slice(2), { stdout: process.stdout, stderr: process.stderr, env: process.env, isTTY: !!process.stdout.isTTY, cwd: process.cwd() }).then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    process.stderr.write(`sessionlens: ${(e && e.stack) || e}\n`);
    process.exitCode = 2;
  },
);
