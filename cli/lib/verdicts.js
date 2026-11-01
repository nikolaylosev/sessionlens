"use strict";
/* --verdicts (phase 11): the reviewers' verdicts a team keeps in its repository, exported from the extension's
   Calibration tab (verdicts.json) or a Report .json, as the counts media/analyze.js calibrates with: per check and
   source, the same counts the panel keeps, so the same verdicts give the same result in the panel and in CI.

   readVerdicts(paths, cwd) → { stats: { check: { source: { total, ok, fp } } }, verdicts, files }. A path is a file or
   a folder of .json files, one per reviewer. The same finding in two files counts once (a reviewer's file exported
   twice, two people's copies of one session), the first verdict wins. Throws with the reason when a file cannot be
   read or holds no list of verdicts.

   levels(stats, Lens, overrides) → { off, demoted }: the checks these verdicts switch off or demote, "check" or
   "check (source)" when the check has verdicts under several sources, for the report's line about calibration. */
const fs = require("fs");
const path = require("path");

// the file itself, or a folder's .json files in name order
function filesOf(p, cwd) {
  const full = path.resolve(cwd, p);
  let st;
  try {
    st = fs.statSync(full);
  } catch (e) {
    throw new Error(`cannot read ${p}: ${e.code === "ENOENT" ? "no such file or folder" : e.message}`);
  }
  if (!st.isDirectory()) return [{ name: p, full }];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({ name: path.join(p, f), full: path.join(full, f) }));
}

// as the panel's import reads a file: a list of rows (verdicts.json), or a Report .json with its findings
function rowsOf({ name, full }) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (e) {
    throw new Error(`cannot read ${name}: ${e instanceof SyntaxError ? "it is not JSON" : e.message}`);
  }
  if (data && Array.isArray(data.findings)) return data.findings.map((f) => ({ ...f, session: data.session }));
  if (!Array.isArray(data)) throw new Error(`${name} is not a verdicts.json: it holds no list of verdicts`);
  return data;
}

function readVerdicts(paths, cwd) {
  const files = paths.flatMap((p) => filesOf(p, cwd));
  const stats = {},
    seen = new Set();
  let verdicts = 0;
  for (const file of files)
    for (const r of rowsOf(file)) {
      if (!r || !r.check || !r.message) continue;
      const raw = r.verdict && (r.verdict.v || r.verdict);
      if (raw !== "ok" && raw !== "fp") continue; // what the panel gives; anything else is no verdict
      const source = r.source || "external";
      // a finding as the panel keys its verdict (Lens.fkey): check, step, the start of its text, in its session
      const key = [r.check, source, r.session || "", r.seq ?? "", String(r.message).slice(0, 40)].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const per = (stats[r.check] = stats[r.check] || {});
      const c = (per[source] = per[source] || { total: 0, ok: 0, fp: 0 });
      c.total++;
      c[raw]++;
      verdicts++;
    }
  return { stats, verdicts, files: files.length };
}

function levels(stats, Lens, overrides = {}) {
  const off = [],
    demoted = [];
  for (const [check, per] of Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))) {
    const name = (source) => (Object.keys(per).length > 1 ? `${check} (${source})` : check);
    for (const [source, c] of Object.entries(per)) {
      if (!Lens.isCalibrated(check, source)) continue;
      const { level } = Lens.calibLevel(c);
      if (level === "off" && (overrides[check] || {}).enabled !== true) off.push(name(source));
      else if (level === "demoted") demoted.push(name(source));
    }
  }
  return { off, demoted };
}

module.exports = { readVerdicts, levels };
