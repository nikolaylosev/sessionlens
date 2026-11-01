"use strict";
/* What the CLI prints for one analyzed session (phase 11, step 3): the terminal text, the Markdown for a CI job's summary
   (--md) and the Report .json (--json, media/report.js, the same file the panel exports). The panel's PR report is not
   reused for --md: it is built around verdicts (it waits for one on every high finding and lists confirmed, rejected
   and undecided findings), and a CI run has none; the headline lines are the panel's own strings.

   opts: { version, file, context, color, calibration }. context (--ci): a Set of check names set aside as context, not
   counted in the verdict (see LensReport.json); color: ANSI colours in the terminal text; calibration (--verdicts):
   { verdicts, files, off, demoted }, how many verdicts calibrated the checks and which they switched off or demoted. */
const path = require("path");

const MEDIA = require("./media");
const I18N = require(path.join(MEDIA, "i18n.js"));
const LensReport = require(path.join(MEDIA, "report.js"));
const T = (k, v) => I18N.t(k, v);
I18N.set("en"); // the UI is English only (0.1.110)

const SEVERITIES = ["high", "medium", "low"];
const ICON = { high: "🔴", medium: "🟡", low: "⚪" };
const ANSI = { red: 31, yellow: 33, green: 32, high: 31, medium: 33, low: 2, dim: 2, bold: 1 };
const paint = (on, style, text) => (on ? `\x1b[${ANSI[style]}m${text}\x1b[0m` : text);

// 1234 → "1k", as the panel shows tokens
function compact(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return +(v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return +(v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return Math.round(v / 1e3) + "k";
  return String(Math.round(v));
}
const tokens = (u) =>
  T("md_tokens", {
    in: compact(u.input),
    p: u.input ? Math.round((100 * (u.cached || 0)) / u.input) : 0,
    out: compact(u.output),
    req: Number.isInteger(u.requests) ? ", " + T("m_tokens_req", { n: u.requests }) : "",
  });

// "37 verdicts from 2 files, off: weak_assert, demoted: magic_number"
function calibrationLine(c) {
  const n = (x, one) => `${x} ${one}${x === 1 ? "" : "s"}`;
  return [
    `${n(c.verdicts, "verdict")} from ${n(c.files, "file")}`,
    c.off.length ? `off: ${c.off.join(", ")}` : "",
    c.demoted.length ? `demoted: ${c.demoted.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
// why calibration hid a finding, as the panel's PR report says it
const whyHidden = (f) => (f.precision != null ? T("md_hidden_why", { p: Math.round(f.precision * 100), n: f.verdicts }) : "");

// the parts both outputs show, from the Report .json
function parts(s, opts) {
  const r = LensReport.json(s, { context: opts.context });
  const m = r.metrics || {};
  const count = SEVERITIES.map((sev) => `${r.findings.filter((f) => f.severity === sev).length} ${T("sev_" + sev)}`).join(", ");
  const spec =
    r.spec && r.spec.n
      ? T("md_spec", {
          n: r.spec.n,
          unc: s.coverage ? T("md_unc", { list: s.coverage.uncovered.length ? s.coverage.uncovered.join(", ") : T("md_none") }) : "",
        })
      : T("md_no_spec");
  return {
    r,
    title: r.task || (opts.file ? path.basename(opts.file) : r.session) || "",
    verdict: T("md_verdict", {
      v: T("verdict_" + r.verdict),
      p: r.profile,
      r: m.reads,
      e: m.edits,
      re: m.readEdit ?? "—",
      runs: m.runs,
      g: m.editsToGreen ?? "—",
    }),
    count,
    usage: s.usage ? tokens(s.usage) : "",
    spec,
    lint: s.lintNote || "",
    calibration: opts.calibration ? calibrationLine(opts.calibration) : "",
    // the findings by severity, then in the order of the session
    findings: SEVERITIES.flatMap((sev) => r.findings.filter((f) => f.severity === sev)),
  };
}
const plain = (md) => md.replace(/\*\*/g, "");
const step = (f) => (f.seq >= 0 ? `#${f.seq}` : "");
const footer = (opts) => `SessionLens ${opts.version || ""}`.trim();

function text(s, opts = {}) {
  const p = parts(s, opts);
  const c = !!opts.color;
  const out = [
    paint(c, "bold", `${footer(opts)} · ${p.r.profile}${opts.file ? " · " + opts.file : ""}`),
    paint(c, p.r.verdict, plain(p.verdict)),
    p.count,
    ...(p.usage ? [p.usage] : []),
    plain(p.spec),
    ...(p.lint ? [`Lint: ${p.lint}`] : []),
    ...(p.calibration ? [`Calibration: ${p.calibration}`] : []),
    "",
  ];
  const w = Math.max(0, ...p.findings.map((f) => f.check.length));
  for (const f of p.findings) out.push(`${paint(c, f.severity, f.severity.padEnd(6))}  ${f.check.padEnd(w)}  ${step(f).padEnd(4)}  ${f.message}`);
  if (!p.findings.length) out.push(paint(c, "dim", "No findings."));
  if (p.r.context && p.r.context.length) out.push("", paint(c, "dim", `Context, not counted in CI: ${p.r.context.map((f) => f.check).join(", ")}`));
  if (p.r.hiddenByCalibration.length) {
    const rows = p.r.hiddenByCalibration.map((f) => `${f.check}${whyHidden(f) ? ` (${whyHidden(f)})` : ""}`);
    out.push("", paint(c, "dim", `Hidden by calibration: ${[...new Set(rows)].join(", ")}`));
  }
  return out.join("\n") + "\n";
}

// a message quotes the session's code: no HTML of its own in a job summary
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function md(s, opts = {}) {
  const p = parts(s, opts);
  const line = (f) => `- ${ICON[f.severity]} **${T("sev_" + f.severity)}** ${esc(f.message)}${f.seq >= 0 ? ` _(seq ${f.seq})_` : ""} · \`${f.check}\``;
  const out = [
    T("md_title", { t: esc(p.title) }),
    "",
    p.verdict,
    ...(p.usage ? [p.usage] : []),
    p.spec,
    ...(p.lint ? [`**Lint:** ${esc(p.lint)}`] : []),
    ...(p.calibration ? [`**Calibration:** ${esc(p.calibration)}`] : []),
    "",
  ];
  out.push(`### Findings: ${p.count}`, ...(p.findings.length ? p.findings.map(line) : ["None."]), "");
  if (p.r.context && p.r.context.length) out.push("### Context, not counted in CI", ...p.r.context.map(line), "");
  if (p.r.hiddenByCalibration.length) out.push(T("md_hidden"), ...p.r.hiddenByCalibration.map((f) => line(f) + (whyHidden(f) ? ` · ${whyHidden(f)}` : "")), "");
  out.push(`_${footer(opts)}_`);
  return out.join("\n") + "\n";
}

const json = (s, opts = {}) =>
  JSON.stringify(
    { ...LensReport.json(s, { context: opts.context }), sessionlens: opts.version || null, ...(opts.calibration ? { calibration: opts.calibration } : {}) },
    null,
    1,
  ) + "\n";

module.exports = { text, md, json };
