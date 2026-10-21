// @ts-check
"use strict";
/* The output of an agent's commands in a Cursor Agent session (0.1.121). Host side only: a webview cannot read files.

   A Cursor transcript (~/.cursor/projects/<workspace>/agent-transcripts/<id>/<id>.jsonl) keeps no command output, but
   Cursor keeps it in its own databases under the same id. Checked on the IDE and CLI 2026.10.01 (Oct 2026):

   - the CLI: ~/.cursor/chats/<md5 of the workspace path>/<id>/store.db. Table `blobs` holds the conversation as JSON
     messages (`assistant` with `tool-call` parts, `tool` with `tool-result` parts, matched by `toolCallId`); a result
     is a string "Exit code: N\n\nCommand output: …". Table `meta`, key "0", is hex JSON whose `latestRootBlobId`
     names a root blob that lists the message blob ids, as raw bytes, in order. `meta` also holds an encryption key,
     which is never read further, logged or copied.
   - the IDE: <Cursor user data>/User/globalStorage/state.vscdb, table `cursorDiskKV`: `composerData:<id>` lists the
     bubbles in order (`fullConversationHeadersOnly`), and `bubbleId:<id>:<bubble>` holds a tool call as
     `toolFormerData` with `name` (`run_terminal_command_v2`), `params` (JSON, `command`) and `result` (JSON, `output`,
     `exitCode` only when it is not 0). An edit (`edit_file_v2`, since 0.1.127) has `params.relativeWorkspacePath` (an
     absolute path in practice) and `result.beforeContentId` / `afterContentId`: keys of the same table whose value is
     the whole file before and after, named by its SHA-256 (the hash of "" for a file that did not exist).
   - the CLI keeps no file before an edit, only "Wrote contents to …", but it keeps what the agent read: a Read's
     result is the file with every tenth line marked by its number ("    10|"). The file before an edit is the last
     version the session saw of it (0.1.130): a whole Read (no offset or limit, not cut with "... N lines not shown
     ...", 10 lines or more with every mark in place, so a message such as "File not found" is never taken for a
     file), a Write's text, or a StrReplace applied to the version before it.
     A StrReplace whose old text is not there once, a failed call, a command that may write files (sed -i, git
     checkout, a formatter, a redirect) or a call of another tool that names the file make the version unknown, and
     an edit after that has none.

   Both are opened read-only through Node's built-in node:sqlite and closed at once. Without node:sqlite (VS Code
   before Node 22.13), with no database, or with a format this code does not know, there is no output, and the
   session is imported without it, as before. Nothing here writes anywhere. */

const fs = require("fs");
const os = require("os");
const path = require("path");

const ID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_OUTPUT = 200000; // per command; a runner's summary is at the end, so the end is kept
const MAX_FILE = 400000; // a file before or after an edit; a longer one is left out
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
// a shell command that may change files the session read: after it, every version known is dropped
const MAY_WRITE =
  /(?:^|[\s;&|(])(?:sed\s+(?:-\w+\s+)*-\w*i|perl\s+-\w*i|git\s+(?:checkout|restore|stash|reset|apply|am|pull|merge|rebase|cherry-pick|revert|switch)|mv|cp|rm|patch|tee|truncate|prettier|black|isort|autopep8|gofmt|rustfmt|(?<![-\w])format)\b|--fix\b|--write\b/;
const REDIRECT = (cmd) => />/.test(cmd.replace(/\d*>&\d+|\d*>>?\s*\/dev\/null/g, ""));

function sqlite() {
  try {
    return require("node:sqlite");
  } catch {
    return null;
  }
}
const asText = (v) => (typeof v === "string" ? v : v instanceof Uint8Array ? Buffer.from(v).toString("utf8") : "");
const parse = (v) => {
  try {
    return JSON.parse(asText(v));
  } catch {
    return null;
  }
};
const tail = (s) => (s.length > MAX_OUTPUT ? s.slice(-MAX_OUTPUT) : s);

// <id>.jsonl in agent-transcripts/<id>/ → the id, else null
function transcriptId(file) {
  const id = path.basename(String(file || ""), ".jsonl");
  return ID_RX.test(id) ? id : null;
}

function ideDatabase(home, platform, env) {
  const user =
    platform === "darwin"
      ? path.join(home, "Library", "Application Support", "Cursor")
      : platform === "win32"
        ? path.join(env.APPDATA || path.join(home, "AppData", "Roaming"), "Cursor")
        : path.join(env.XDG_CONFIG_HOME || path.join(home, ".config"), "Cursor");
  return path.join(user, "User", "globalStorage", "state.vscdb");
}

function cliDatabase(home, id) {
  const chats = path.join(home, ".cursor", "chats");
  let dirs = [];
  try {
    dirs = fs.readdirSync(chats);
  } catch {
    return null;
  }
  for (const d of dirs) {
    const p = path.join(chats, d, id, "store.db");
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// a Read's result → the file, or null when it is not a whole file with its line marks
function readText(result, args) {
  if (typeof result !== "string" || !args || args.offset != null || args.limit != null) return null;
  const lines = result.split("\n");
  // a long file is cut: "... 153 lines not shown ..."
  if (lines.length < 10 || lines.some((l) => /^\.\.\. \d+ lines not shown \.\.\.$/.test(l))) return null;
  for (let n = 10; n <= lines.length; n += 10) {
    const mark = String(n).padStart(6) + "|";
    if (!lines[n - 1].startsWith(mark)) return null;
    lines[n - 1] = lines[n - 1].slice(mark.length);
  }
  return lines.join("\n");
}

/* The CLI's calls in order → each Write's and StrReplace's file before and after ({ path, before, after }), where the
   version before is known (see the top of the file) */
function cliEdits(calls, results) {
  const known = new Map(),
    edits = [];
  const forget = (p) => known.delete(p);
  for (const c of calls) {
    const a = c.args || {},
      r = results.get(c.id),
      p = typeof a.path === "string" ? a.path : "";
    if (c.name === "Read") {
      const text = p ? readText(r, a) : null;
      if (text != null && text.length <= MAX_FILE) known.set(p, text);
    } else if (c.name === "Write" && p && typeof a.contents === "string") {
      const before = known.get(p);
      if (typeof r !== "string" || !r.startsWith("Wrote contents to")) forget(p);
      else {
        if (before != null && a.contents.length <= MAX_FILE) edits.push({ path: p, before, after: a.contents });
        if (a.contents.length <= MAX_FILE) known.set(p, a.contents);
        else forget(p);
      }
    } else if (c.name === "StrReplace" && p) {
      const before = known.get(p),
        from = a.old_string,
        to = a.new_string;
      forget(p);
      if (before == null || typeof from !== "string" || !from || typeof to !== "string") continue;
      if (typeof r !== "string" || !/has been updated/.test(r)) continue;
      const n = before.split(from).length - 1;
      if (!n || (n > 1 && !a.replace_all)) continue;
      const after = before.split(from).join(to);
      if (after.length > MAX_FILE) continue;
      edits.push({ path: p, before, after });
      known.set(p, after);
    } else if (c.name === "Shell") {
      const cmd = typeof a.command === "string" ? a.command : "";
      if (MAY_WRITE.test(cmd) || REDIRECT(cmd)) known.clear();
      else for (const k of [...known.keys()]) if (cmd.includes(path.posix.basename(k))) forget(k);
    } else {
      const text = JSON.stringify(a);
      for (const k of [...known.keys()]) if (text.includes(path.posix.basename(k))) forget(k);
    }
  }
  return edits;
}

/* The CLI's store.db → { outputs: [{command, output, exitCode}] for its Shell calls, in order, edits }; null when the
   format is not known */
function fromCli(db) {
  const meta = db.prepare("SELECT value FROM meta WHERE key = '0'").get();
  const info = meta ? parse(Buffer.from(asText(meta.value), "hex")) : null;
  const rootId = info && typeof info.latestRootBlobId === "string" ? info.latestRootBlobId : "";
  const blobs = new Map(
    db
      .prepare("SELECT id, data FROM blobs")
      .all()
      .map((r) => [String(r.id), r.data]),
  );
  const root = blobs.get(rootId);
  if (!root) return null;
  const rootBuf = Buffer.from(/** @type {Uint8Array} */ (root));
  const ordered = [];
  for (const [id, data] of blobs) {
    if (!/^[0-9a-f]+$/i.test(id) || id.length % 2) continue;
    const at = rootBuf.indexOf(Buffer.from(id, "hex"));
    if (at < 0) continue;
    const m = parse(data);
    if (m && typeof m === "object" && typeof m.role === "string") ordered.push([at, m]);
  }
  ordered.sort((a, b) => a[0] - b[0]);
  const calls = [],
    results = new Map();
  for (const [, m] of ordered) {
    for (const p of Array.isArray(m.content) ? m.content : []) {
      if (!p || typeof p !== "object") continue;
      if (m.role === "assistant" && p.type === "tool-call" && typeof p.toolName === "string") {
        const args = typeof p.args === "string" ? parse(p.args) : p.args || p.input;
        if (args && typeof args === "object") calls.push({ id: p.toolCallId, name: p.toolName, args });
      } else if (m.role === "tool" && p.type === "tool-result") results.set(p.toolCallId, p.result);
    }
  }
  const shells = calls.filter((c) => c.name === "Shell" && typeof c.args.command === "string");
  const outputs = shells.map((c) => {
    const r = results.get(c.id);
    const text = typeof r === "string" ? r : r == null ? "" : JSON.stringify(r);
    const code = /^Exit code:\s*(-?\d+)/.exec(text);
    return { command: c.args.command, output: tail(text), exitCode: code ? Number(code[1]) : null };
  });
  const edits = cliEdits(calls, results);
  return outputs.length || edits.length ? { outputs: outputs.length ? outputs : null, edits: edits.length ? edits : null } : null;
}

/* The IDE's state.vscdb → { outputs, edits } for the chat with this id: the same list of commands, and each edit's
   file before and after ({ path, before, after }, before "" for a new file); null when the chat or the format is not
   there */
function fromIde(db, id) {
  const raw = (key) => {
    const r = db.prepare("SELECT value FROM cursorDiskKV WHERE key = ?").get(key);
    return r ? asText(r.value) : null;
  };
  const get = (key) => {
    const r = raw(key);
    return r == null ? null : parse(r);
  };
  const file = (cid) => (typeof cid !== "string" ? null : cid.endsWith(EMPTY_SHA256) ? "" : raw(cid));
  const composer = get("composerData:" + id);
  const headers = composer && Array.isArray(composer.fullConversationHeadersOnly) ? composer.fullConversationHeadersOnly : null;
  if (!headers) return null;
  const out = [],
    edits = [];
  for (const h of headers) {
    if (!h || typeof h.bubbleId !== "string") continue;
    const b = get(`bubbleId:${id}:${h.bubbleId}`);
    const t = b && b.toolFormerData;
    if (!t || (t.name !== "run_terminal_command_v2" && t.name !== "edit_file_v2")) continue;
    const params = typeof t.params === "string" ? parse(t.params) : t.params;
    const result = typeof t.result === "string" ? parse(t.result) : t.result;
    if (t.name === "edit_file_v2") {
      const before = file(result && result.beforeContentId),
        after = file(result && result.afterContentId);
      const p = params && typeof params.relativeWorkspacePath === "string" ? params.relativeWorkspacePath : "";
      if (p && before != null && after != null && before.length <= MAX_FILE && after.length <= MAX_FILE) edits.push({ path: p, before, after });
      continue;
    }
    if (!params || typeof params.command !== "string") continue;
    const output = result && typeof result.output === "string" ? result.output : "";
    out.push({ command: params.command, output: tail(output), exitCode: result && Number.isInteger(result.exitCode) ? result.exitCode : result ? 0 : null });
  }
  return out.length || edits.length ? { outputs: out.length ? out : null, edits: edits.length ? edits : null } : null;
}

/* For a transcript file picked by the person: the commands Cursor kept for it, and the files before and after each
   edit (the IDE's since 0.1.127, the CLI's since 0.1.130), or why there is nothing.
   → { outputs: [{command, output, exitCode}] | null, edits?: [{path, before, after}], source: "cli" | "ide" } | { outputs: null, reason }
   The options are for tests: another home, platform or environment, and a stand-in for node:sqlite (null: none). */
/** @param {string} file @param {{ home?: string, platform?: string, env?: Record<string, string | undefined>, sqliteModule?: any }} [opts] */
function cursorOutputs(file, { home = os.homedir(), platform = process.platform, env = process.env, sqliteModule } = {}) {
  const id = transcriptId(file);
  if (!id) return { outputs: null, reason: "not a Cursor transcript name" };
  const S = sqliteModule === undefined ? sqlite() : sqliteModule;
  if (!S || !S.DatabaseSync) return { outputs: null, reason: "node:sqlite is not available" };
  const tries = [
    ["cli", cliDatabase(home, id)],
    ["ide", ideDatabase(home, platform, env)],
  ];
  let reason = "no Cursor database has this chat";
  for (const [source, file] of tries) {
    if (!file || !fs.existsSync(file)) continue;
    let db = null;
    try {
      db = new S.DatabaseSync(file, { readOnly: true });
      const got = source === "cli" ? fromCli(db) : fromIde(db, id);
      if (got && got.outputs && !got.edits) return { outputs: got.outputs, source };
      if (got && (got.outputs || got.edits)) return { outputs: got.outputs, edits: got.edits, source };
    } catch (e) {
      reason = `the ${source} database could not be read: ${String((e && e.code) || (e && e.message) || e).slice(0, 80)}`;
    } finally {
      try {
        if (db) db.close();
      } catch {
        /* closed already */
      }
    }
  }
  return { outputs: null, reason };
}

module.exports = { cursorOutputs, transcriptId, ideDatabase, MAX_OUTPUT, MAX_FILE };
