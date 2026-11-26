// @ts-check
"use strict";
/* The developer's log (0.1.141): while the setting sessionlens.devLog is on, what the person does in SessionLens and
   what SessionLens does in reply goes to a local file, one JSON object per line, so a run can be looked at afterwards
   without retelling it. No require("vscode"): tested directly (test/dev-log.test.js).

   Where: <home>/.sessionlens/dev/<YYYY-MM-DD>-<editor>.jsonl, the local day; every window of the editor appends to
   the same file, and each line names its window (win). Nothing is sent anywhere.
   How much: a string longer than MAX_FIELD is cut (its length is kept), a day's file stops at MAX_DAY_BYTES with one
   line that says so, and files older than KEEP_DAYS days are removed when a log starts.
   Secrets: every string goes through redact (Lens.redactSecrets: keys, tokens, passwords), and fields named like one
   (apiKey, token, secret, password, authorization) are dropped whatever they hold. */

const fs = require("fs");
const path = require("path");

const KEEP_DAYS = 14;
const MAX_DAY_BYTES = 50 * 1024 * 1024;
const MAX_FIELD = 200000;
const MAX_DEPTH = 8;
const FILE_RX = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9-]+\.jsonl$/;
// settings lose their keys before they get here (Secrets.stripSecrets); this is the second fence
const SECRET_FIELD = /^(?:api[_-]?key|apikey|(?:access|auth|bearer)[_-]?token|token|(?:client[_-]?)?secret|password|passwd|authorization)$/i;

// YYYY-MM-DD of the local day
function localDay(ms) {
  const d = new Date(ms),
    p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* A copy fit for the log: strings masked and cut, key-like fields dropped, functions and undefined left out, depth
   bounded. redact: (text) → text with secrets masked. */
function clean(value, redact, depth = 0) {
  if (typeof value === "string") {
    const s = redact(value);
    return s.length > MAX_FIELD ? s.slice(0, MAX_FIELD) + `… [cut: ${s.length} characters in all]` : s;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "object") return undefined;
  if (depth >= MAX_DEPTH) return "[too deep]";
  if (Array.isArray(value)) return value.map((v) => clean(v, redact, depth + 1)).filter((v) => v !== undefined);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_FIELD.test(k)) continue;
    const c = clean(v, redact, depth + 1);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

/* → { dir, file(), write(kind, data), flush(), clean() }. opts: { dir, editor ("vscode" | "cursor" | …), win (this
   window's id), redact, now, onError, maxDayBytes } */
function createDevLog(opts) {
  const dir = opts.dir;
  const editor =
    String(opts.editor || "vscode")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vscode";
  const now = opts.now || Date.now;
  const redact = opts.redact || ((s) => s);
  const sizes = new Map(); // file → bytes as this window counts them (its own lines and what was there before)
  const capped = new Set();
  const cap = opts.maxDayBytes || MAX_DAY_BYTES; // tests make it small
  let chain = Promise.resolve();

  const file = () => path.join(dir, `${localDay(now())}-${editor}.jsonl`);
  function sizeOf(f) {
    if (!sizes.has(f)) {
      let n = 0;
      try {
        n = fs.statSync(f).size;
      } catch {
        n = 0;
      }
      sizes.set(f, n);
    }
    return sizes.get(f);
  }
  // one line, in the order written; a failure to write is reported once per file through onError
  function write(kind, data) {
    const f = file();
    const line = JSON.stringify(Object.assign({ t: new Date(now()).toISOString(), win: opts.win || "", kind }, clean(data || {}, redact))) + "\n";
    const bytes = Buffer.byteLength(line);
    let text = line;
    if (capped.has(f)) return chain;
    if (sizeOf(f) + bytes > cap) {
      capped.add(f);
      text =
        JSON.stringify({
          t: new Date(now()).toISOString(),
          win: opts.win || "",
          kind: "cap",
          text: `the log of this day reached ${cap} bytes; nothing more is written to it`,
        }) + "\n";
    }
    sizes.set(f, sizeOf(f) + Buffer.byteLength(text));
    chain = chain.then(async () => {
      try {
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.appendFile(f, text, "utf8");
      } catch (e) {
        if (opts.onError) opts.onError(e);
      }
    });
    return chain;
  }
  // removes the logs of days before the last KEEP_DAYS (by the date in the name); → how many
  function cleanOld() {
    let gone = 0;
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      return 0;
    }
    const oldest = new Date(now());
    oldest.setHours(0, 0, 0, 0);
    oldest.setDate(oldest.getDate() - (KEEP_DAYS - 1));
    for (const n of names) {
      const m = FILE_RX.exec(n);
      if (!m) continue;
      if (new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() >= oldest.getTime()) continue;
      try {
        fs.unlinkSync(path.join(dir, n));
        gone++;
      } catch {
        /* another window removed it */
      }
    }
    return gone;
  }
  return { dir, file, write, flush: () => chain, clean: cleanOld };
}

module.exports = { createDevLog, clean, KEEP_DAYS, MAX_DAY_BYTES, MAX_FIELD };
