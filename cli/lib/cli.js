"use strict";
/* sessionlens analyze (phase 11, step 4): one agent session log → the review, in the terminal, as Markdown for a CI
   job's summary or as the Report .json. The same analysis as the panel (media/analyze.js) with the lint engine of the
   profile's language (cli/lib/engines.js); no verdicts, so calibration stays at its defaults and a check on trial is
   low. No network: nothing leaves the machine.

   run(argv, io) → the exit code. io: { stdout, stderr, env, isTTY, cwd }, so tests run it without a process.
   0: the report is written (whatever its colour, unless --fail-on); 1: --fail-on matched the session's colour;
   2: the CLI could not do its work (a file, the profile, a log it cannot read, an engine that did not load). */
const fs = require("fs");
const path = require("path");
const { parseArgs } = require("node:util");
const { loadEngine } = require("./engines");
const report = require("./report");

const MEDIA = require("./media");
const Lens = require(path.join(MEDIA, "lens.js"));
const LensRules = require(path.join(MEDIA, "rules.js"));
const LensAnalyze = require(path.join(MEDIA, "analyze.js"));
const LensReport = require(path.join(MEDIA, "report.js"));

/* In CI nobody can approve a plan, and nobody can be asked for a specification: these describe where the session ran,
   not how the agent worked. With --spec, no_spec is a finding again: it then says the file has no requirements. */
const ciContext = (hasSpec) => new Set(hasSpec ? ["stop_markers_missing"] : ["no_spec", "stop_markers_missing"]);
const FAIL_ON = { none: [], red: ["red"], yellow: ["red", "yellow"] };

const USAGE = `Usage: sessionlens analyze <log> --profile <name> [options]

Reviews an AI agent's session log (Claude Code, Codex, Cursor) for how the agent worked on the tests.

Options:
  --profile <name>   the project's profile (required): ${Lens.PROFILES.join(", ")}
  --spec <file>      the specification the tests should cover
  --rules <file>     a rules.json exported from the Rules tab of the editor extension
  --ci               stop_markers_missing (and no_spec, without --spec) are context, not counted in the verdict
  --fail-on <level>  none (default), red or yellow: exit with 1 when the session is that colour or worse
  --json             the Report .json
  --md               Markdown, for a CI job's summary
  --no-color         no colours in the text (NO_COLOR does the same)
  -h, --help         this text
  --version          the version

Exit codes: 0 the report is written; 1 --fail-on matched; 2 the CLI could not do its work.
`;

const OPTIONS = {
  profile: { type: "string" },
  spec: { type: "string" },
  rules: { type: "string" },
  ci: { type: "boolean" },
  "fail-on": { type: "string" },
  json: { type: "boolean" },
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
  const [command, file, ...rest] = args.positionals;
  if (command !== "analyze" || !file || rest.length)
    return fail(`expected: sessionlens analyze <log> --profile <name>\nRun sessionlens --help for the options.`);
  if (!o.profile) return fail(`--profile is required: ${Lens.PROFILES.join(", ")}`);
  if (!Lens.PROFILES.includes(o.profile)) return fail(`unknown profile "${o.profile}": ${Lens.PROFILES.join(", ")}`);
  const failOn = o["fail-on"] || "none";
  if (!FAIL_ON[failOn]) return fail(`--fail-on is none, red or yellow, not "${failOn}"`);
  if (o.json && o.md) return fail("--json and --md: one output at a time");

  const read = (p) => fs.readFileSync(path.resolve(io.cwd || process.cwd(), p), "utf8");
  const files = {};
  for (const [key, p] of [
    ["log", file],
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

  const cfg = Lens.profile(o.profile);
  const res = Lens.importAny(files.log, cfg, {});
  const convs = Array.isArray(res) && res.length && res[0].events ? res : [{ events: res }];
  if (convs.length > 1) return fail(`${file} holds ${convs.length} conversations; give the CLI one session per file`);
  const events = convs[0].events || [];
  if (!events.length) return fail(`${file}: no steps read; is it a session log of Claude Code, Codex or Cursor?`);
  if (Lens.unreadToolCalls(files.log, events))
    io.stderr.write(`sessionlens: ${file}: its tool calls are in a format SessionLens does not read; the review has only the messages\n`);

  const engine = await loadEngine(Lens.lintLanguage(cfg));
  if (engine.state === "failed") return fail(`the ${Lens.lintLanguage(cfg)} lint engine did not load: ${engine.error}`);

  const s = {
    name: path.basename(file),
    task: "",
    profile: cfg.profile,
    created: new Date().toISOString(),
    events,
    findings: [],
    verdicts: {},
    spec: files.spec || "",
    dropped: [],
    usage: Lens.usageOf(files.log, {}) || undefined,
  };
  LensAnalyze.analyze(s, { settings: {}, overrides });
  if (s.lintPending) return fail("the lint engine was still loading");

  const opts = {
    version: Lens.ANALYSIS_VERSION,
    file,
    context: o.ci ? ciContext(!!files.spec) : null,
    color: !!io.isTTY && !o["no-color"] && !(io.env && io.env.NO_COLOR),
  };
  io.stdout.write(o.json ? report.json(s, opts) : o.md ? report.md(s, opts) : report.text(s, opts));
  return FAIL_ON[failOn].includes(LensReport.json(s, { context: opts.context }).verdict) ? 1 : 0;
}

module.exports = { run };
