// @ts-check
/* Turning the Cursor hook on and off (0.1.130). The hook itself is media/cursor-hook.js (built from src/hook): after
   each command and file edit of a Cursor agent it appends a line to ~/.cursor/sessionlens/log/<conversation_id>.jsonl.

   Record Cursor agent runs (extension.js) calls install(): the script is copied to ~/.cursor/sessionlens/hook.js, out
   of the extension's folder, which changes with every update; next to it a small wrapper (hook.sh, or hook.cmd on
   Windows) runs it with the Cursor the extension runs in, as Node (ELECTRON_RUN_AS_NODE=1: there whatever the person's
   PATH or Node version; a plain node ignores the variable). Five entries go into the user's ~/.cursor/hooks.json, each
   with the wrapper's path relative to ~/.cursor, where Cursor runs user hooks (seen on Cursor 3.25, macOS). The
   person's own hooks are kept; the file as it was before the first install is kept next to it as
   hooks.json.sessionlens-backup. A project's .cursor/hooks.json is never touched: it would go into the team's git.

   Stop recording calls uninstall(): only our entries go; a hooks.json left with no hook at all that SessionLens made
   is removed. The logs stay for the import and are removed after 30 days (cleanLogs, at each start). Every function
   takes the home folder, so the tests run in a temporary one. Windows is not checked on a real Cursor yet. */
"use strict";
const fs = require("fs");
const path = require("path");

const HOOK_EVENTS = ["afterShellExecution", "afterFileEdit", "postToolUse", "postToolUseFailure", "stop"];
const TIMEOUT_S = 10; // Cursor's limit for one call; the hook answers in about 0.1 s, a first cold start took 5 s
const LOG_DAYS = 30;
// an entry of ours: its command runs ~/.cursor/sessionlens/hook.sh or hook.cmd
const OURS = /(^|[\\/"'\s])sessionlens[\\/]hook\.(?:sh|cmd)\b/;

function paths(home, platform = process.platform) {
  const cursor = path.join(home, ".cursor"),
    dir = path.join(cursor, "sessionlens");
  const win = platform === "win32";
  return {
    cursor,
    dir,
    hooksFile: path.join(cursor, "hooks.json"),
    backup: path.join(cursor, "hooks.json.sessionlens-backup"),
    script: path.join(dir, "hook.js"),
    wrapper: path.join(dir, win ? "hook.cmd" : "hook.sh"),
    logDir: path.join(dir, "log"),
    // as hooks.json gives it: relative to ~/.cursor
    command: win ? ".\\sessionlens\\hook.cmd" : "./sessionlens/hook.sh",
  };
}

// a value inside "…" for sh: \ " $ ` escaped
const shQuote = (s) => '"' + String(s).replace(/([\\"$`])/g, "\\$1") + '"';

/* the wrapper that runs hook.js next to it with `exe` (the Cursor binary, or node) as Node */
function wrapperText(exe, platform = process.platform) {
  if (platform === "win32")
    return [
      "@echo off",
      "rem SessionLens: runs the Cursor hook (hook.js next to this file). Written by Record Cursor agent runs.",
      "set ELECTRON_RUN_AS_NODE=1",
      `"${String(exe).replace(/"/g, "")}" "%~dp0hook.js"`,
      "",
    ].join("\r\n");
  return [
    "#!/bin/sh",
    "# SessionLens: runs the Cursor hook (hook.js next to this file). Written by Record Cursor agent runs.",
    `ELECTRON_RUN_AS_NODE=1 exec ${shQuote(exe)} "$(dirname "$0")/hook.js"`,
    "",
  ].join("\n");
}

const isOurs = (entry) => !!entry && typeof entry === "object" && typeof entry.command === "string" && OURS.test(entry.command);

/* → { json, exists } or { error }: a hooks.json that is not a JSON object is never written over */
function readHooks(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return { json: { version: 1, hooks: {} }, exists: false };
    return { error: `cannot read ${file}: ${(e && e.message) || e}` };
  }
  try {
    const json = JSON.parse(text.replace(/^﻿/, ""));
    if (!json || typeof json !== "object" || Array.isArray(json)) return { error: `${file} is not a JSON object` };
    if (json.hooks !== undefined && (typeof json.hooks !== "object" || Array.isArray(json.hooks) || json.hooks === null))
      return { error: `"hooks" in ${file} is not an object` };
    return { json, exists: true };
  } catch (e) {
    return { error: `${file} is not valid JSON: ${(e && e.message) || e}` };
  }
}

/* a copy of hooks.json with one entry of ours on each of the five events (not a second one) */
function withHooks(json, command) {
  const out = Object.assign({ version: 1 }, json, { hooks: Object.assign({}, json.hooks) });
  for (const ev of HOOK_EVENTS) {
    const list = Array.isArray(out.hooks[ev]) ? out.hooks[ev].slice() : [];
    if (!list.some(isOurs)) list.push({ command, timeout: TIMEOUT_S });
    out.hooks[ev] = list;
  }
  return out;
}

/* a copy without our entries; an event left with none is left out */
function withoutHooks(json) {
  const out = Object.assign({}, json, { hooks: {} });
  for (const [ev, list] of Object.entries(json.hooks || {})) {
    const kept = Array.isArray(list) ? list.filter((e) => !isOurs(e)) : list;
    if (!Array.isArray(kept) || kept.length) out.hooks[ev] = kept;
  }
  return out;
}

const installed = (json) => !!json && HOOK_EVENTS.some((ev) => Array.isArray(json.hooks && json.hooks[ev]) && json.hooks[ev].some(isOurs));

// written whole or not at all: a half-written hooks.json would break every hook of the person's
function writeAtomic(file, text, mode) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, mode ? { mode } : undefined);
  fs.renameSync(tmp, file);
}

/* The script and its wrapper (a wrapper is executable on macOS and Linux) */
function writeScript(p, hookSource, exe, platform) {
  fs.mkdirSync(p.dir, { recursive: true });
  writeAtomic(p.script, hookSource);
  writeAtomic(p.wrapper, wrapperText(exe, platform), platform === "win32" ? undefined : 0o755);
}

/* → { ok: true, created, backup } or { ok: false, error } */
function install({ home, hookSource, exe, platform = process.platform }) {
  const p = paths(home, platform);
  const r = readHooks(p.hooksFile);
  if (r.error) return { ok: false, error: r.error };
  try {
    writeScript(p, hookSource, exe, platform);
    let backup = false;
    if (r.exists && !installed(r.json) && !fs.existsSync(p.backup)) {
      fs.copyFileSync(p.hooksFile, p.backup);
      backup = true;
    }
    fs.mkdirSync(p.cursor, { recursive: true });
    writeAtomic(p.hooksFile, JSON.stringify(withHooks(r.json, p.command), null, 2) + "\n");
    return { ok: true, created: !r.exists, backup, paths: p };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/* → { ok: true, removedFile, was } or { ok: false, error }; was: whether our entries were there */
function uninstall({ home, platform = process.platform }) {
  const p = paths(home, platform);
  const r = readHooks(p.hooksFile);
  if (r.error) return { ok: false, error: r.error };
  if (!r.exists || !installed(r.json)) return { ok: true, removedFile: false, was: false };
  const next = withoutHooks(r.json);
  try {
    // nothing else in it, and no file of the person's before ours: the file is SessionLens's, removed whole
    const onlyOurs = !Object.keys(next.hooks).length && Object.keys(next).every((k) => k === "version" || k === "hooks");
    if (onlyOurs && !fs.existsSync(p.backup)) {
      fs.unlinkSync(p.hooksFile);
      return { ok: true, removedFile: true, was: true };
    }
    writeAtomic(p.hooksFile, JSON.stringify(next, null, 2) + "\n");
    return { ok: true, removedFile: false, was: true };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/* At each start, while recording is on: the copy of the script and its wrapper become this version's (an update of the
   extension, or of Cursor's path). → whether anything was written */
function refresh({ home, hookSource, exe, platform = process.platform }) {
  const p = paths(home, platform);
  const r = readHooks(p.hooksFile);
  if (r.error || !installed(r.json)) return false;
  const same = (file, text) => {
    try {
      return fs.readFileSync(file, "utf8") === text;
    } catch {
      return false;
    }
  };
  if (same(p.script, hookSource) && same(p.wrapper, wrapperText(exe, platform))) return false;
  writeScript(p, hookSource, exe, platform);
  return true;
}

/* the logs older than LOG_DAYS (by when they were last written) → how many were removed */
function cleanLogs({ home, now = Date.now(), days = LOG_DAYS, platform = process.platform }) {
  const dir = paths(home, platform).logDir;
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return 0;
  }
  let removed = 0;
  for (const n of names) {
    if (!n.endsWith(".jsonl")) continue;
    try {
      const f = path.join(dir, n);
      if (now - fs.statSync(f).mtimeMs > days * 86400000) {
        fs.unlinkSync(f);
        removed++;
      }
    } catch {
      /* gone meanwhile, or not ours to remove: left */
    }
  }
  return removed;
}

function isRecording({ home, platform = process.platform }) {
  const r = readHooks(paths(home, platform).hooksFile);
  return !r.error && r.exists && installed(r.json);
}

module.exports = {
  HOOK_EVENTS,
  TIMEOUT_S,
  LOG_DAYS,
  paths,
  wrapperText,
  isOurs,
  readHooks,
  withHooks,
  withoutHooks,
  installed,
  install,
  uninstall,
  refresh,
  cleanLogs,
  isRecording,
};
