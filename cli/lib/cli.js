"use strict";
/* sessionlens analyze (phase 11, step 4): one agent session log → the review, in the terminal, as Markdown for a CI
   job's summary or as the Report .json. The same analysis as the panel (media/analyze.js) with the lint engine of the
   profile's language (cli/lib/engines.js). Without --verdicts, calibration stays at its defaults and a check on trial
   is low; with it, the panel's own thresholds on the team's verdicts. No network: nothing leaves the machine.

   run(argv, io) → the exit code. io: { stdout, stderr, env, isTTY, cwd }, so tests run it without a process.
   0: the report is written (whatever its colour, unless --fail-on); 1: --fail-on matched the session's colour;
   2: the CLI could not do its work (a file, the profile, a log it cannot read, an engine that did not load). */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseArgs } = require("node:util");
const { loadEngine } = require("./engines");
const report = require("./report");
const { readVerdicts, levels } = require("./verdicts");
const { latestSession, sessionFiles } = require("./find-session");

const MEDIA = require("./media");
const Lens = require(path.join(MEDIA, "lens.js"));
const LensRules = require(path.join(MEDIA, "rules.js"));
const LensAnalyze = require(path.join(MEDIA, "analyze.js"));
const LensReport = require(path.join(MEDIA, "report.js"));
const { claudeSubagents } = require(path.join(MEDIA, "claude-subagents.js"));

/* In CI nobody can approve a plan, and nobody can be asked for a specification: these describe where the session ran,
   not how the agent worked. With --spec, no_spec is a finding again: it then says the file has no requirements. */
const ciContext = (hasSpec) => new Set(hasSpec ? ["stop_markers_missing"] : ["no_spec", "stop_markers_missing"]);
const FAIL_ON = { none: [], red: ["red"], yellow: ["red", "yellow"] };

const USAGE = `Usage: sessionlens analyze <log> --profile <name> [options]
       sessionlens analyze --latest --profile <name> [options]
       sessionlens analyze <folder> --profile <name> [options]   every session in it, with a summary

Reviews an AI agent's session log (Claude Code, Codex, Cursor) for how the agent worked on the tests.

Options:
  --latest           the newest session of Claude Code, Codex or Cursor that worked in this folder, instead of <log>
  --profile <name>   the project's profile (required): ${Lens.PROFILES.join(", ")}
  --spec <file>      the specification the tests should cover
  --rules <file>     a rules.json exported from the Rules tab of the editor extension
  --verdicts <path>  a verdicts.json exported from the Calibration tab, or a folder of them, to calibrate the checks;
                     can be given several times
  --ci               stop_markers_missing (and no_spec, without --spec) are context, not counted in the verdict
  --fail-on <level>  none (default), red or yellow: exit with 1 when the session is that colour or worse
  --json             the Report .json
  --md               Markdown, for a CI job's summary
  --json-file <file> also write the Report .json to this file, whatever is printed
  --no-color         no colours in the text (NO_COLOR does the same)
  -h, --help         this text
  --version          the version

Exit codes: 0 the report is written; 1 --fail-on matched; 2 the CLI could not do its work.
`;

const OPTIONS = {
  profile: { type: "string" },
  spec: { type: "string" },
  rules: { type: "string" },
  latest: { type: "boolean" },
  verdicts: { type: "string", multiple: true },
  ci: { type: "boolean" },
  "fail-on": { type: "string" },
  json: { type: "boolean" },
  "json-file": { type: "string" },
  md: { type: "boolean" },
  "no-color": { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean" },
};

async function run(argv, io) {
  const fail = (msg) => {
    io.stderr.write(`sessionlens: ${msg}\n`);
    return 2;
  };
  let args;
  try {
    args = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (e) {
    return fail(`${e.message}\nRun sessionlens --help for the options.`);
  }
  const o = args.values;
  if (o.help) {
    io.stdout.write(USAGE);
    return 0;
  }
  if (o.version) {
    io.stdout.write(Lens.ANALYSIS_VERSION + "\n");
    return 0;
  }
  const [command, given, ...rest] = args.positionals;
  if (command !== "analyze" || (!given && !o.latest) || rest.length)
    return fail(`expected: sessionlens analyze <log> --profile <name>\nRun sessionlens --help for the options.`);
  if (given && o.latest) return fail("a log or --latest: one of them");
  if (!o.profile) return fail(`--profile is required: ${Lens.PROFILES.join(", ")}`);
  if (!Lens.PROFILES.includes(o.profile)) return fail(`unknown profile "${o.profile}": ${Lens.PROFILES.join(", ")}`);
  const failOn = o["fail-on"] || "none";
  if (!FAIL_ON[failOn]) return fail(`--fail-on is none, red or yellow, not "${failOn}"`);
  if (o.json && o.md) return fail("--json and --md: one output at a time");

  const cwd = io.cwd || process.cwd();
  let file = given;
  if (o.latest) {
    const found = latestSession(cwd, io.home || os.homedir());
    if (!found) return fail(`no session of Claude Code, Codex or Cursor found for ${cwd}; give the log's path`);
    file = found.file;
    io.stderr.write(`sessionlens: the latest session here, ${found.agent}: ${file}\n`);
  }
  const isFolder = (() => {
    try {
      return fs.statSync(path.resolve(cwd, file)).isDirectory();
    } catch {
      return false;
    }
  })();
  if (isFolder && o.spec) return fail("--spec is for one session: a folder's sessions have tasks of their own");

  const read = (p) => fs.readFileSync(path.resolve(cwd, p), "utf8");
  const files = {};
  for (const [key, p] of [
    ["spec", o.spec],
    ["rules", o.rules],
  ])
    if (p)
      try {
        files[key] = read(p);
      } catch (e) {
        return fail(`cannot read ${p}: ${e.code === "ENOENT" ? "no such file" : e.message}`);
      }

  let overrides = {};
  if (files.rules)
    try {
      const r = LensRules.fromJson(files.rules);
      overrides = r.overrides;
      for (const x of r.ignored) io.stderr.write(`sessionlens: ${o.rules}: rule ${x.index + 1} (${x.check || "no check"}) is ignored: ${x.reason}\n`);
    } catch (e) {
      return fail(`${o.rules} is not a rules.json: ${e.message}`);
    }

  let calib = null;
  if (o.verdicts)
    try {
      calib = readVerdicts(o.verdicts, cwd);
    } catch (e) {
      return fail(e.message);
    }

  const cfg = Lens.profile(o.profile);
  const engine = await loadEngine(Lens.lintLanguage(cfg));
  if (engine.state === "failed") return fail(`the ${Lens.lintLanguage(cfg)} lint engine did not load: ${engine.error}`);

  const base = {
    version: Lens.ANALYSIS_VERSION,
    context: o.ci ? ciContext(!!files.spec) : null,
    calibration: calib ? { verdicts: calib.verdicts, files: calib.files, ...levels(calib.stats, Lens, overrides) } : null,
    color: !!io.isTTY && !o["no-color"] && !(io.env && io.env.NO_COLOR),
  };

  /* One log → { s, opts } with its session analyzed, or { reason } when it cannot be reviewed. */
  const review = (log) => {
    let raw;
    try {
      raw = read(log);
    } catch (e) {
      return { reason: `cannot read ${log}: ${e.code === "ENOENT" ? "no such file" : e.message}` };
    }
    // a Claude Code session's subagents lie next to its file: their steps are part of the session, as in the panel
    const subagents = claudeSubagents(path.resolve(cwd, log));
    const text = subagents.length ? Lens.joinSubagents(raw, subagents) : raw;
    const res = Lens.importAny(text, cfg, {});
    const convs = Array.isArray(res) && res.length && res[0].events ? res : [{ events: res }];
    if (convs.length > 1) return { reason: `${log} holds ${convs.length} conversations; give the CLI one session per file` };
    const events = convs[0].events || [];
    if (!events.length) return { reason: `${log}: no steps read; is it a session log of Claude Code, Codex or Cursor?` };
    if (Lens.subagentsMissing({ events }))
      io.stderr.write(
        `sessionlens: ${log}: the session started subagents and their files are not next to it (<session>/subagents/); the review misses their steps\n`,
      );
    if (Lens.unreadToolCalls(text, events))
      io.stderr.write(`sessionlens: ${log}: its tool calls are in a format SessionLens does not read; the review has only the messages\n`);
    const s = {
      name: path.basename(log),
      task: "",
      profile: cfg.profile,
      created: new Date().toISOString(),
      events,
      findings: [],
      verdicts: {},
      spec: files.spec || "",
      dropped: [],
      usage: Lens.usageOf(text, {}) || undefined,
    };
    LensAnalyze.analyze(s, { settings: {}, overrides, calibStats: calib ? calib.stats : undefined });
    if (s.lintPending) return { reason: "the lint engine was still loading" };
    return { s, opts: { ...base, file: log, subagents: subagents.length } };
  };

  // before anything is printed: a file that cannot be written is exit 2, with nothing on stdout
  const writeJson = (content) => {
    if (!o["json-file"]) return null;
    try {
      const target = path.resolve(cwd, o["json-file"]);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
      return null;
    } catch (e) {
      return `cannot write ${o["json-file"]}: ${e.message}`;
    }
  };

  if (isFolder) {
    const logs = sessionFiles(path.resolve(cwd, file));
    if (!logs.length) return fail(`${file}: no .jsonl logs in this folder`);
    const sessions = [],
      skipped = [];
    for (const full of logs) {
      const rel = path.relative(path.resolve(cwd, file), full);
      const r = review(full);
      if (r.reason) skipped.push({ file: rel, reason: r.reason.split(full).join(rel) });
      else sessions.push({ s: r.s, opts: { ...r.opts, file: rel } });
    }
    if (!sessions.length) return fail(`${file}: none of its ${logs.length} logs could be reviewed: ${skipped[0].reason}`);
    const opts = { ...base, folder: file, profile: cfg.profile };
    const error = writeJson(report.summaryJson(sessions, skipped, opts));
    if (error) return fail(error);
    io.stdout.write(
      o.json ? report.summaryJson(sessions, skipped, opts) : o.md ? report.summaryMd(sessions, skipped, opts) : report.summaryText(sessions, skipped, opts),
    );
    return sessions.some(({ s }) => FAIL_ON[failOn].includes(LensReport.json(s, { context: base.context }).verdict)) ? 1 : 0;
  }

  const r = review(file);
  if (r.reason) return fail(r.reason);
  const { s, opts } = r;
  const error = writeJson(report.json(s, opts));
  if (error) return fail(error);
  io.stdout.write(o.json ? report.json(s, opts) : o.md ? report.md(s, opts) : report.text(s, opts));
  return FAIL_ON[failOn].includes(LensReport.json(s, { context: opts.context }).verdict) ? 1 : 0;
}

module.exports = { run };
