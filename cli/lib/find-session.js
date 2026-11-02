"use strict";
/* --latest: the newest session of an agent that worked in this folder, so nobody has to look for its file (phase 11). Where
   each agent keeps its sessions:
   - Claude Code: ~/.claude/projects/<the folder's path, every other character a dash>/<id>.jsonl
   - Cursor: ~/.cursor/projects/<the same, without the leading dash>/agent-transcripts/<id>/<id>.jsonl
   - Codex: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl, one folder for all, each naming its cwd on its first line

   latestSession(cwd, home) → { file, agent } of the file changed last, or null. */
const fs = require("fs");
const path = require("path");

// Codex's folders hold every project's sessions: how many of the newest to open, and how much of each, to find the cwd
const CODEX_NEWEST = 200;
const HEAD_BYTES = 256 * 1024;

const slug = (cwd) => cwd.replace(/[^A-Za-z0-9]/g, "-");
const list = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};
const jsonl = (dir) =>
  list(dir)
    .filter((x) => x.isFile() && x.name.endsWith(".jsonl"))
    .map((x) => path.join(dir, x.name));
const changed = (file) => {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
};

const claude = (cwd, home) => jsonl(path.join(home, ".claude", "projects", slug(cwd)));

function cursor(cwd, home) {
  const dir = path.join(home, ".cursor", "projects", slug(cwd).replace(/^-+/, ""), "agent-transcripts");
  return [
    ...jsonl(dir),
    ...list(dir)
      .filter((x) => x.isDirectory())
      .flatMap((x) => jsonl(path.join(dir, x.name))),
  ];
}

// the cwd a rollout's session_meta names, from the start of the file: its first line can be very long
function codexCwd(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(HEAD_BYTES);
    const head = buf.toString("utf8", 0, fs.readSync(fd, buf, 0, HEAD_BYTES, 0));
    const m = /"cwd"\s*:\s*("(?:[^"\\]|\\.)*")/.exec(head);
    return m ? JSON.parse(m[1]) : "";
  } catch {
    return "";
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
function codex(cwd, home) {
  const root = path.join(home, ".codex", "sessions");
  const all = [];
  const walk = (dir, depth) => {
    for (const x of list(dir)) {
      if (x.isDirectory() && depth < 3) walk(path.join(dir, x.name), depth + 1);
      else if (x.isFile() && /^rollout-.*\.jsonl$/.test(x.name)) all.push(path.join(dir, x.name));
    }
  };
  walk(root, 0);
  return all
    .sort((a, b) => changed(b) - changed(a))
    .slice(0, CODEX_NEWEST)
    .filter((f) => codexCwd(f) === cwd);
}

function latestSession(cwd, home) {
  const found = [
    ...claude(cwd, home).map((file) => ({ file, agent: "Claude Code" })),
    ...cursor(cwd, home).map((file) => ({ file, agent: "Cursor" })),
    ...codex(cwd, home).map((file) => ({ file, agent: "Codex" })),
  ];
  return found.sort((a, b) => changed(b.file) - changed(a.file))[0] || null;
}

module.exports = { latestSession };
