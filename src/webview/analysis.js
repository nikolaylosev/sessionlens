// @ts-check
/* SessionLens panel — analysis of a session. Part of the panel's source (src/webview); `npm run build` bundles it into
   media/app.js. Split out of the single app.js in phase 7 (7B.4) without changing behaviour. */
import { devLog, state } from "./common.js";
import { calibStatsBySource, genNow } from "./store.js";

export function initAnalysis() {}

// ---------- analysis (shared by import, spec save, re-run) ----------
/* Phase 6: every analysis reports how long it took to the host's Output channel (VS Code build only; numbers and
     names only). event: "import", "background" or "reanalyze" (everything else: spec save, segmentation, AI, a tab). */
export function analyze(s, event) {
  const t0 = Date.now();
  analyzeNow(s);
  const ms = Math.max(0, Date.now() - t0);
  try {
    window.__slLogTiming(event || "reanalyze", String(s.profile || ""), ms, Array.isArray(s.events) ? s.events.length : 0);
  } catch (e) {
    /* a log line is never worth an error */
  }
  if (window.SL_DEV_LOG) devLog("analyze", analyzeSummary(s, event || "reanalyze", ms));
}

/* What the developer's log keeps of an analysis (0.1.141): the counts, by severity and by check, and what was hidden;
   not the findings themselves, which a verdict names when it is given. */
export function analyzeSummary(s, event, ms) {
  const by = (list, key) => {
    const out = {};
    for (const f of list || []) out[f[key]] = (out[f[key]] || 0) + 1;
    return out;
  };
  return {
    session: s.id,
    name: s.name,
    event,
    profile: s.profile,
    ms,
    events: Array.isArray(s.events) ? s.events.length : 0,
    findings: (s.findings || []).length,
    severity: by(s.findings, "severity"),
    checks: by(s.findings, "check"),
    hidden: by(s.calibHidden, "check"),
    lintPending: !!s.lintPending,
  };
}

/* The analysis itself is media/analyze.js, shared with the CLI; the panel gives it its settings, calibration and
   Rules tab, and keeps which rules the result was computed with. */
export function analyzeNow(s) {
  LensAnalyze.analyze(s, { settings: state.settings, calibStats: calibStatsBySource(), overrides: state.ruleOverrides });
  // which rules these findings were computed with; "" (not analyzed) while the lint engine was still loading, so
  // ensureFresh() and the background pass analyze it again (phase 5)
  state.gens[s.id] = s.lintPending ? "" : genNow();
}
