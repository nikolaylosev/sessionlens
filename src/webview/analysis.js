// @ts-check
/* SessionLens panel — analysis of a session. Part of the panel's source (src/webview); `npm run build` bundles it into
   media/app.js. Split out of the single app.js in phase 7 (7B.4) without changing behaviour. */
import { state } from "./common.js";
import { calibStatsBySource, genNow } from "./store.js";

export function initAnalysis() {}

// ---------- analysis (shared by import, spec save, re-run) ----------
/* Phase 6: every analysis reports how long it took to the host's Output channel (VS Code build only; numbers and
     names only). event: "import", "background" or "reanalyze" (everything else: spec save, segmentation, AI, a tab). */
export function analyze(s, event) {
  const t0 = Date.now();
  analyzeNow(s);
  try {
    window.__slLogTiming(event || "reanalyze", String(s.profile || ""), Math.max(0, Date.now() - t0), Array.isArray(s.events) ? s.events.length : 0);
  } catch (e) {
    /* a log line is never worth an error */
  }
}

/* The analysis itself is media/analyze.js, shared with the CLI; the panel gives it its settings, calibration and
   Rules tab, and keeps which rules the result was computed with. */
export function analyzeNow(s) {
  LensAnalyze.analyze(s, { settings: state.settings, calibStats: calibStatsBySource(), overrides: state.ruleOverrides });
  // which rules these findings were computed with; "" (not analyzed) while the lint engine was still loading, so
  // ensureFresh() and the background pass analyze it again (phase 5)
  state.gens[s.id] = s.lintPending ? "" : genNow();
}
