// @ts-check
/* The review of one analyzed session as data: the Report .json (schema sessionlens/finding@1) the panel exports and the
   CLI prints with --json, built in one place so both give the same file. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else /** @type {any} */ (root).LensReport = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const L = () => (typeof Lens !== "undefined" ? Lens : require("./lens.js"));

  // which model found a model finding, and which one verified it (0.1.115); nothing for the other sources
  const modelOf = (f) => Object.assign({}, f.model ? { model: f.model } : {}, f.verifier ? { verifier: f.verifier } : {});

  /* 0.1.116: what calibration hides is in the reports too, so a green report does not read as "nothing found".
     Each hidden finding carries the record that hid it (s.suppressed: precision and verdicts of its check and source). */
  function hiddenRows(s) {
    const why = new Map((s.suppressed || []).map((x) => [x.check + "|" + x.source, x]));
    return (s.calibHidden || []).map((f) => {
      const src = f.source || "formal",
        w = why.get(f.check + "|" + src);
      return {
        check: f.check,
        severity: f.severity,
        seq: f.seq,
        message: f.message,
        source: src,
        precision: w ? w.precision : null,
        verdicts: w ? w.n : null,
        verdict: (s.verdicts || {})[L().fkey(f)] || null,
      };
    });
  }

  const row = (s, f) => ({
    check: f.check,
    severity: f.severity,
    seq: f.seq,
    message: f.message,
    evidence: f.evidence || null,
    source: f.source || "formal",
    ...modelOf(f),
    verdict: (s.verdicts || {})[L().fkey(f)] || null,
  });

  /* opts.context (the CLI's --ci): check names whose findings describe where the session ran, not how the agent worked.
     They leave findings for a list of their own, "context", and do not count in the verdict. */
  function json(s, opts = {}) {
    const context = opts.context || null;
    const findings = context ? s.findings.filter((f) => !context.has(f.check)) : s.findings;
    return {
      schema: "sessionlens/finding@1",
      session: s.name,
      task: s.task,
      profile: s.profile,
      created: s.created,
      verdict: L().verdict(findings),
      metrics: s.metrics,
      spec: s.specParsed,
      findings: findings.map((f) => row(s, f)),
      ...(context ? { context: s.findings.filter((f) => context.has(f.check)).map((f) => row(s, f)) } : {}),
      hiddenByCalibration: hiddenRows(s),
      dropped: s.dropped || [],
    };
  }

  return { json, modelOf };
});
