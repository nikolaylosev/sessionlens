"use strict";
/* The newest transcripts of one agent, for the list Choose file shows first (0.1.138): the file dialog hides the dot-folders
   and every Cursor chat has a folder of its own, so a pick took several folders each time. Read-only, on this machine.
   Only the start of a file is read: a transcript can be over 100 MB (the owner's: 121 MB). A folder or a file that cannot be
   read is left out, and no list at all means the file dialog, as before. */
const fs = require("fs");
const path = require("path");
const Lens = require("./media/lens.js");

const LIMIT = 30;
const HEAD_BYTES = 256 * 1024; // the first message of 14 of the owner's 15 Codex files ends within 164 KB, of 40 Claude Code files within 10 KB

const dirs = async (d) => {
  try {
    return await fs.promises.readdir(d, { withFileTypes: true });
  } catch {
    return [];
  }
};
const jsonl = (es, d) => es.filter((e) => e.isFile() && e.name.endsWith(".jsonl")).map((e) => path.join(d, e.name));
const subfolders = (es, d) => es.filter((e) => e.isDirectory()).map((e) => path.join(d, e.name));
const flat = async (list) => (await Promise.all(list)).flat();

// ~/.claude/projects/<project>/<id>.jsonl; the steps of a subagent are in a folder under it, and come with their session
async function claudeFiles(home) {
  const root = path.join(home, ".claude", "projects");
  return flat(subfolders(await dirs(root), root).map(async (p) => jsonl(await dirs(p), p).filter((f) => !path.basename(f).startsWith("agent-"))));
}
// ~/.codex/sessions/<year>/<month>/<day>/rollout-*.jsonl
async function codexFiles(home) {
  const walk = async (d, depth) => {
    const es = await dirs(d);
    const here = jsonl(es, d).filter((f) => path.basename(f).startsWith("rollout-"));
    return depth ? here.concat(await flat(subfolders(es, d).map((s) => walk(s, depth - 1)))) : here;
  };
  return walk(path.join(home, ".codex", "sessions"), 3);
}
// ~/.cursor/projects/<workspace>/agent-transcripts/<id>/<id>.jsonl; a subagent's is in <id>/subagents/, one level further
async function cursorFiles(home) {
  const root = path.join(home, ".cursor", "projects");
  return flat(
    subfolders(await dirs(root), root).map(async (p) => {
      const at = path.join(p, "agent-transcripts");
      const es = await dirs(at);
      const nested = await flat(subfolders(es, at).map(async (id) => jsonl(await dirs(id), id)));
      return jsonl(es, at).concat(nested);
    }),
  );
}
const FILES = { claude: claudeFiles, codex: codexFiles, cursor: cursorFiles };

// the lines at the start of a file; one the read stopped inside does not parse, and is left out
async function headLines(file) {
  const fh = await fs.promises.open(file, "r");
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await fh.read(buf, 0, HEAD_BYTES, 0);
    return buf.toString("utf8", 0, bytesRead).split("\n");
  } finally {
    await fh.close();
  }
}

const parsed = (lines) =>
  lines
    .filter((l) => l.startsWith("{"))
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
const blocksText = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b && typeof b.text === "string" ? b.text : "")).join("\n") : "");

// each agent's first message of the person, and the folder it worked in where the file says
const READ = {
  claude(recs) {
    const asked = recs.find(
      (r) => r.type === "user" && !r.isMeta && !r.isSidechain && !r.isCompactSummary && Lens.personText(blocksText(r.message && r.message.content)),
    );
    const at = recs.find((r) => typeof r.cwd === "string" && r.cwd);
    return { task: asked ? Lens.personText(blocksText(asked.message.content)) : "", cwd: at ? at.cwd : "" };
  },
  codex(recs) {
    const asked = recs
      .filter((r) => r.type === "response_item" && r.payload && r.payload.type === "message" && r.payload.role === "user")
      .map((r) => blocksText(r.payload.content).trim())
      .find((t) => t && !t.startsWith("<")); // what Codex itself adds comes wrapped: <environment_context> and others
    const meta = recs.find((r) => r.type === "session_meta" && r.payload && r.payload.cwd);
    return { task: asked || "", cwd: meta ? meta.payload.cwd : "" };
  },
  cursor(recs) {
    for (const r of recs) {
      if (r.role !== "user") continue;
      const { text } = Lens.cursorUserText(blocksText(r.message && r.message.content));
      if (text) return { task: text, cwd: "" };
    }
    return { task: "", cwd: "" };
  },
};

// one line for the list: no tags around it, no control characters, and no $(name), which the list would draw as an icon
const oneLine = (text) =>
  String(text)
    .replace(/<\/?[a-zA-Z_][\w-]*(?:\s[^<>]*)?>/g, " ")
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/\$\(/g, "$ (")
    .trim()
    .slice(0, 120);

/* What a person calls the project: the last part of the folder the file names. A Cursor or Claude Code folder name is the
   path with "-" for every separator, so its parts cannot be told apart: the name of an open workspace when it is that
   one, else the name without the home folder at its start. */
function projectName(file, source, cwd, home, workspaces) {
  if (cwd) return oneLine(path.basename(cwd.replace(/[\\/]+$/, "")));
  const parts = file.split(path.sep);
  const at = parts.lastIndexOf("projects");
  const folder = at >= 0 ? parts[at + 1] || "" : "";
  const slug = Lens.cursorProjectSlug(folder);
  const open = (workspaces || []).find((w) => Lens.cursorProjectSlug(w) === slug);
  if (open) return oneLine(path.basename(open));
  const mine = Lens.cursorProjectSlug(home);
  const short = slug.toLowerCase().startsWith(mine.toLowerCase() + "-") ? slug.slice(mine.length + 1) : slug;
  return oneLine(short);
}

/* → [{ file, project, task, mtimeMs }], newest first, at most `limit`. A source without a list (somewhere else) → [].
   @param {string} [source]
   @param {{ home: string, workspaces?: string[], limit?: number }} where */
async function recentTranscripts(source, { home, workspaces, limit = LIMIT }) {
  const files = Object.hasOwn(FILES, source || "") ? await FILES[source](home) : [];
  const stats = await Promise.all(
    files.map(async (file) => {
      try {
        const st = await fs.promises.stat(file);
        return st.isFile() && st.size > 0 ? { file, mtimeMs: st.mtimeMs } : null;
      } catch {
        return null;
      }
    }),
  );
  const newest = stats
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, limit);
  return Promise.all(
    newest.map(async ({ file, mtimeMs }) => {
      let read = { task: "", cwd: "" };
      try {
        read = READ[source](parsed(await headLines(file)));
      } catch {
        // the name and the time still say which one it is
      }
      return { file, project: projectName(file, source, read.cwd, home, workspaces), task: oneLine(read.task), mtimeMs };
    }),
  );
}

// when, in the person's time zone: "12 minutes ago", "today, 09:15", "yesterday, 18:40", "3 Nov, 16:22", "3 Nov 2025, 16:22"
function whenText(ms, now = Date.now()) {
  const minutes = Math.floor((now - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const d = new Date(ms),
    today = new Date(now);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return `today, ${time}`;
  const before = new Date(today);
  before.setDate(today.getDate() - 1);
  if (sameDay(d, before)) return `yesterday, ${time}`;
  const month = d.toLocaleString("en", { month: "short" });
  return `${d.getDate()} ${month}${d.getFullYear() === today.getFullYear() ? "" : " " + d.getFullYear()}, ${time}`;
}

module.exports = { recentTranscripts, whenText };
