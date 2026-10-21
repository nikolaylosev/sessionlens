// @ts-check
/* The Cursor hook of SessionLens (0.1.130). A Cursor Agent transcript keeps the agent's commands but not their output,
   so a red test run looks like any other step. Cursor runs this script after each command and each file edit of the
   agent (~/.cursor/hooks.json) and gives it the event as JSON on stdin; the script appends one line to
   ~/.cursor/sessionlens/log/<conversation_id>.jsonl, and the import adds what the transcript lacks.

   What is kept (Cursor 3.25, captured 21 Oct 2026, test/fixtures/cursor-hooks):
   - shell  (afterShellExecution): the command, the end of its output, how long it ran, the call's id;
   - exit   (postToolUse / postToolUseFailure of a Shell call): the exit code, which afterShellExecution does not have;
   - edit   (afterFileEdit): the old and new text of each edit;
   - file   (postToolUse of a write or an edit): the whole file after it, for exact versions of a test;
   - stop   (stop): the status and the tokens of the reply.
   Nothing else: prompts, replies and reads are in the transcript already.

   A command and its output can hold a token (`curl -v`, `env`): they are masked with Lens.redactSecrets. Code is kept
   as it is: it is on disk in the project and in Cursor's transcript anyway, and masked code would hide the very
   hard-coded secret SessionLens looks for.

   Never in the agent's way: whatever happens, the script prints {} and exits 0. Built into media/cursor-hook.js, one
   file with what it needs from lens.js, by `npm run build`. */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const Lens = require("../../media/lens.js");

const VERSION = 1;
const MAX_COMMAND = 2000;
const MAX_OUTPUT = 20000; // as much of a command's output as a stored session keeps (sessions.js keptOutputs)
const MAX_EDIT = 20000;
const MAX_EDITS = 50;
const MAX_FILE = 200000; // as much of a file's earlier version as the import keeps (lens.js prev_content)
// a conversation id is a file name here: nothing that could leave the log folder
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
// Cursor's tools that write a file, as postToolUse names them (an edit too comes as Write, with the whole file)
const WRITES = new Set(["Write", "StrReplace", "Edit", "MultiEdit", "EditNotebook", "ApplyPatch"]);

const str = (v) => (typeof v === "string" ? v : "");
const head = (s, n) => (s.length > n ? s.slice(0, n) : s);
const tail = (s, n) => (s.length > n ? s.slice(-n) : s);
const mask = (s) => Lens.redactSecrets(s).text;
const num = (v) => (typeof v === "number" && isFinite(v) ? v : undefined);

/* Cursor's tool_output is a JSON string ({"output":…,"exitCode":0}); a failure may say it some other way */
function exitCodeOf(out) {
  if (out && typeof out === "object") return num(out.exitCode);
  try {
    return num(JSON.parse(str(out)).exitCode);
  } catch (e) {
    return undefined;
  }
}

/* the line to append for one event, or null: an event SessionLens does not keep */
function record(p, now) {
  if (!p || typeof p !== "object" || !SAFE_ID.test(str(p.conversation_id))) return null;
  const base = { v: VERSION, ts: now.toISOString(), conversation_id: p.conversation_id, generation_id: str(p.generation_id) || undefined };
  const ev = p.hook_event_name;
  if (ev === "afterShellExecution") {
    const output = str(p.output);
    return Object.assign(base, {
      event: "shell",
      tool_use_id: str(p.tool_use_id) || undefined,
      command: mask(head(str(p.command), MAX_COMMAND)),
      output: mask(tail(output, MAX_OUTPUT)),
      output_chars: output.length,
      duration: num(p.duration),
    });
  }
  if (ev === "afterFileEdit") {
    const edits = (Array.isArray(p.edits) ? p.edits : []).slice(0, MAX_EDITS);
    return Object.assign(base, {
      event: "edit",
      file_path: str(p.file_path),
      edits: edits.map((e) => ({ old: head(str(e && e.old_string), MAX_EDIT), new: head(str(e && e.new_string), MAX_EDIT) })),
    });
  }
  if ((ev === "postToolUse" || ev === "postToolUseFailure") && p.tool_name === "Shell") {
    const code = exitCodeOf(p.tool_output);
    return Object.assign(base, {
      event: "exit",
      tool_use_id: str(p.tool_use_id) || undefined,
      command: mask(head(str(p.tool_input && p.tool_input.command), MAX_COMMAND)),
      exit_code: code,
      failed: ev === "postToolUseFailure" || (code !== undefined && code !== 0),
    });
  }
  if (ev === "postToolUse" && WRITES.has(p.tool_name) && p.tool_input && typeof p.tool_input.content === "string") {
    const content = p.tool_input.content;
    if (content.length > MAX_FILE) return null; // a cut file is no version of it
    return Object.assign(base, { event: "file", file_path: str(p.tool_input.file_path) || str(p.tool_input.path), content });
  }
  if (ev === "stop") {
    return Object.assign(base, {
      event: "stop",
      status: str(p.status) || undefined,
      model: str(p.model_id) || str(p.model) || undefined,
      input_tokens: num(p.input_tokens),
      output_tokens: num(p.output_tokens),
      cache_read_tokens: num(p.cache_read_tokens),
      cache_write_tokens: num(p.cache_write_tokens),
    });
  }
  return null;
}

const logDir = (env) => env.SESSIONLENS_HOOK_LOG || path.join(os.homedir(), ".cursor", "sessionlens", "log");

/* stdin text → the line written (or null); never throws */
function handle(input, { env = process.env, now = new Date() } = {}) {
  try {
    const r = record(JSON.parse(input), now);
    if (!r) return null;
    const dir = logDir(env);
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify(r) + "\n";
    fs.appendFileSync(path.join(dir, r.conversation_id + ".jsonl"), line);
    return line;
  } catch (e) {
    return null;
  }
}

/* Reads stdin to its end and answers {} once: also when stdin fails, something throws, or stdin never closes (then
   after 5 s, well inside Cursor's timeout; nothing is written) */
function main() {
  const chunks = [];
  let done = false;
  const finish = (write) => {
    if (done) return;
    done = true;
    if (write) handle(Buffer.concat(chunks).toString("utf8"));
    try {
      process.stdout.write("{}\n");
    } catch (e) {
      /* nobody reads it: fine */
    }
    process.exit(0);
  };
  process.on("uncaughtException", () => finish(false));
  setTimeout(() => finish(false), 5000).unref();
  process.stdin.on("data", (c) => chunks.push(c));
  process.stdin.on("error", () => finish(false));
  process.stdin.on("end", () => finish(true));
}

module.exports = { record, handle, logDir, VERSION, MAX_OUTPUT, MAX_COMMAND, MAX_EDIT, MAX_EDITS, MAX_FILE };
if (require.main === module) main();
