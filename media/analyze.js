// @ts-check
/* One analysis of a session, shared by the panel (src/webview/analysis.js) and the CLI (phase 11): the checks, the
   specification check, the lint engines, calibration and the Rules tab's overrides, in that order. No window and no
   panel state: what the panel keeps in its state comes in as options, so the same session gives the same findings in
   both. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else /** @type {any} */ (root).LensAnalyze = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const L = () => (typeof Lens !== "undefined" ? Lens : require("./lens.js"));
  const S = () => (typeof LensSpec !== "undefined" ? LensSpec : require("./spec.js"));
  const LI = () => (typeof LensLint !== "undefined" ? LensLint : require("./lint.js"));
  const R = () => (typeof LensRules !== "undefined" ? LensRules : require("./rules.js"));

  /* s: a session ({ profile, events, spec, findings, verdicts, task }). It gets findings, coverage, specParsed,
     suppressed, calibHidden, metrics, task, lintNote / lintWhy / lintLog, and lintPending while a lint engine is still
     loading (not a final result). opts.settings: lint on or off and the engines' settings; opts.calibStats: verdict
     counts per check and source (Lens.calibrate); opts.overrides: the Rules tab's edits, as a rules.json gives them. */
  function analyze(s, opts = {}) {
    const lens = L();
    const settings = opts.settings || {};
    const overrides = opts.overrides || {};
    const cfg = lens.profile(s.profile);
    const formal = lens.runChecks(s.events, cfg);
    const gherkin = lens.gherkinChecks(s.events); // profile-agnostic: runs on any .feature file regardless of s.profile
    const spec = S().parse(s.spec || "");
    const sc = S().checks(spec, s.events, cfg.language);
    const ai = (s.findings || []).filter((f) => f.source === "ai");
    let base = formal;
    s.lintNote = "";
    delete s.lintPending;
    if (settings.lint !== false) {
      const lr = LI().run(s, cfg, settings);
      s.lintNote = lr.note;
      s.lintWhy = lr.why || [];
      s.lintLog = lr.log || [];
      if (lr.pending) s.lintPending = true; // the engine is still loading here: not a final result
      if (lr.ran) base = LI().merge(formal, lr.findings, lens.lintLanguage(cfg)); // supersede only when the linter actually parsed
    }
    // phase 8: calibration per check and source, after the merge (a superseded regex finding is gone before it) and
    // before the Rules tab's overrides
    const cal = lens.calibrate([...base, ...gherkin, ...sc.findings, ...ai], opts.calibStats, overrides);
    s.findings = lens.sortFindings(R().apply(cal.findings, overrides));
    s.coverage = sc.coverage;
    s.specParsed = { n: spec.requirements.length, oos: spec.outOfScope.length, hasIds: spec.requirements.some((r) => !r.auto) };
    s.suppressed = cal.suppressed;
    s.calibHidden = cal.hidden; // what an "off" check found: counted for calibration, never shown
    lens.carryVerdicts(s); // a verdict on a finding the new version words differently stays with it (0.1.116)
    s.metrics = lens.metrics(s.events, cfg);
    s.task = s.task || lens.taskId(s.events);
    return s;
  }

  return { analyze };
});
