"use strict";
/* Where the CLI's core and engines are: media/ next to bin/ and lib/ in the npm package (scripts/pack-cli.js puts the
   files there), the repository's own media/ in a checkout. */
const fs = require("fs");
const path = require("path");

const inPackage = path.join(__dirname, "..", "media");
module.exports = fs.existsSync(path.join(inPackage, "lens.js")) ? inPackage : path.join(__dirname, "..", "..", "media");
