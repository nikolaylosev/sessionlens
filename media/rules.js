// @ts-check
/* Rule book: the text, severity and on/off state of every check, in one editable place.
   Defaults come from the built-in dictionary; overrides live in chrome.storage and can be exported as a
   rules.json the team keeps in the repository. Nothing here decides what a check looks for — only how it is
   worded, how loudly it speaks, and whether it speaks at all. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else /** @type {any} */ (root).LensRules = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const T = (k, v) => (typeof I18N !== "undefined" ? I18N : require("./i18n.js")).t(k, v);
  const L = () => (typeof Lens !== "undefined" ? Lens : require("./lens.js"));

  /* Groups, default severities and good examples are derived from the check registry (media/checks.js) —
     this file only decides how a check is worded, how loudly it speaks and whether it speaks at all. */
  const C = () => (typeof LensChecks !== "undefined" ? LensChecks : require("./checks.js"));
  const { CHECKS, SEVERITIES, GROUPS_ORDER } = C();
  const GROUPS = Object.fromEntries(GROUPS_ORDER.map((g) => [g, Object.keys(CHECKS).filter((c) => CHECKS[c].group === g)]));
  const DEFAULT_SEVERITY = Object.fromEntries(Object.entries(CHECKS).map(([c, v]) => [c, v.severity]));
  /* A rule an agent follows states both sides: what to do and what not to do. The "don't" comes from a confirmed
     finding — it is real code from a real session — and the "do" is the shortest correct form of the same thing. */
  const GOOD = Object.fromEntries(
    Object.entries(CHECKS)
      .filter(([, v]) => v.good !== null)
      .map(([c, v]) => [c, v.good]),
  );
  const exampleGood = (check, overrides) => {
    const own = (overrides || {})[check] || {};
    return own.good !== undefined ? own.good : GOOD[check] || "";
  };

  const ALL = Object.values(GROUPS).flat();
  const groupOf = (check) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(check)) || "code";

  /* The full book as the panel shows it: default text from the dictionary, overlaid with the user's edits. */
  function book(overrides) {
    const o = overrides || {};
    return ALL.map((check) => {
      const own = o[check] || {};
      return {
        check,
        group: groupOf(check),
        rule: own.rule !== undefined ? own.rule : L().RULES[check] || "",
        severity: own.severity || DEFAULT_SEVERITY[check] || "medium",
        enabled: own.enabled !== false,
        good: own.good !== undefined ? own.good : GOOD[check] || "",
        edited: own.rule !== undefined || own.good !== undefined || !!own.severity || own.enabled === false,
      };
    });
  }

  /* Applied at analysis time: drop disabled checks, restate severities. Never changes what a check detects. */
  function apply(findings, overrides) {
    const o = overrides || {};
    return findings
      .filter((f) => (o[f.check] || {}).enabled !== false)
      .map((f) => {
        const sev = (o[f.check] || {}).severity;
        return sev && !f.demoted ? { ...f, severity: sev } : f;
      });
  }
  const ruleText = (check, overrides) => {
    const own = (overrides || {})[check] || {};
    if (own.rule !== undefined) return own.rule;
    C().warnUnknown(check, "LensRules.ruleText");
    return L().RULES[check] || "";
  };
  const disabledChecks = (overrides) =>
    Object.entries(overrides || {})
      .filter(([, v]) => v && v.enabled === false)
      .map(([k]) => k);

  /* A check ticked on by hand (enabled: true, which calibration never hides) is onByHand (0.1.135): `enabled` cannot say
     it, it is true in every row of an edited rule. A row with nothing else edited holds only that: the text and the
     severity in it would become edits on import, and a severity by hand outranks a check's trial. */
  function toJson(overrides) {
    const onByHand = (check) => ((overrides || {})[check] || {}).enabled === true;
    return JSON.stringify(
      {
        schema: "sessionlens/rules@1",
        updated: new Date().toISOString(),
        rules: book(overrides)
          .filter((r) => r.edited || onByHand(r.check))
          .map(({ check, rule, good, severity, enabled, edited }) => ({
            check,
            ...(edited ? { rule, good, severity, enabled } : {}),
            ...(onByHand(check) ? { onByHand: true } : {}),
          })),
      },
      null,
      1,
    );
  }
  /* Replaces the overrides wholesale (no merge). Rows that cannot be applied are reported, not silently lost:
     ignored = [{ index, check, reason }], reason ∈ "no_check" | "unknown_check" | "bad_severity".
     A "bad_severity" row is still imported — only its severity field is dropped. */
  function fromJson(text) {
    const data = JSON.parse(text);
    const rows = Array.isArray(data) ? data : data.rules;
    if (!Array.isArray(rows)) throw new Error(T("rules_bad_file"));
    const overrides = {},
      ignored = [];
    rows.forEach((r, index) => {
      if (!r || !r.check) {
        ignored.push({ index, check: (r && r.check) || "", reason: "no_check" });
        return;
      }
      if (!ALL.includes(r.check)) {
        ignored.push({ index, check: r.check, reason: "unknown_check" });
        return;
      }
      const out = (overrides[r.check] = /** @type {any} */ ({}));
      if (typeof r.rule === "string") out.rule = r.rule;
      if (typeof r.good === "string") out.good = r.good;
      if (SEVERITIES.includes(r.severity)) out.severity = r.severity;
      else if (r.severity !== undefined && r.severity !== null && r.severity !== "") ignored.push({ index, check: r.check, reason: "bad_severity" });
      if (r.enabled === false) out.enabled = false;
      else if (r.onByHand === true) out.enabled = true;
    });
    return { overrides, ignored };
  }
  /* A session as the evidence names it (0.1.139): its name, with the task in brackets when that is another. Until then
     the task alone, so the owner's session DD-004 of task DD-011 read as DD-011 next to the real DD-011. */
  const sessionLabel = (/** @type {any} */ s) => {
    const name = s.name || s.task || "";
    return s.task && s.task !== name ? `${name} (${s.task})` : name;
  };
  /* A note that is a reviewer's mark, not a rule (0.1.139): the same words on confirmed findings of three or more checks.
     The owner wrote "проанализировать" (analyse this) on 40 findings of 12 checks, and it became the evidence of most
     proposed rules and the input of a skill. confirmed: [{ f: { check }, vd: { note } }] → the set of such notes */
  function markNotes(/** @type {any[]} */ confirmed) {
    const by = new Map();
    for (const c of confirmed) {
      const n = String((c.vd && c.vd.note) || "").trim();
      if (n) by.set(n, (by.get(n) || new Set()).add(c.f.check));
    }
    return new Set([...by].filter(([, ks]) => ks.size >= 3).map(([n]) => n));
  }
  // a snippet that is code (the finding's evidence or its marked line), not the finding's own words (Lens.snippet falls
  // back to the message): "Not like this" shows code only
  const fromCode = (/** @type {any} */ f) => {
    const norm = (/** @type {any} */ x) =>
      String(x || "")
        .replace(/\s+/g, " ")
        .replace(/…$/, "")
        .trim();
    const sn = norm(f.snippet),
      m = norm(f.message);
    return !!sn && !m.startsWith(sn.slice(0, 60)) && !sn.startsWith(m.slice(0, 60));
  };
  /* Where a finding is, in a rule's evidence: its step, or for a finding with no step (the model's, seq -1) a quote of
     what it found (0.1.140: the evidence read "seq -1"). */
  const where = (/** @type {any} */ f) => {
    if (f.seq >= 0) return `seq ${f.seq}`;
    const q = String(f.snippet || f.message || "")
      .replace(/\s+/g, " ")
      .trim();
    return `«${q.length > 80 ? q.slice(0, 79) + "…" : q}»`;
  };
  /* A proposed rule as Markdown, for CLAUDE.md / AGENTS.md and as the input of a skill. list: the rule's confirmed
     findings [{ s: session summary, f: { check, seq, message, snippet }, vd: { note } }]; marks: markNotes() of all.
     Since 0.1.139 the model's categories (ai_*) have no rule text of their own: the rule is the reviewers' notes. */
  function ruleMarkdown(/** @type {string} */ k, /** @type {any[]} */ list, /** @type {Set<string>} */ marks, /** @type {any} */ overrides) {
    const note = (/** @type {any} */ x) => {
      const n = String((x.vd && x.vd.note) || "").trim();
      return n && !marks.has(n) ? n : "";
    };
    const bad = [...new Set(list.filter((x) => fromCode(x.f)).map((x) => x.f.snippet))].slice(0, 2);
    const good = exampleGood(k, overrides);
    const own = (CHECKS[k] || {}).ruleKey === "r_ai" ? [...new Set(list.map(note).filter(Boolean))] : [];
    const rule = own.length ? [T("rules_rule"), "", ...own.map((n) => `- ${n}`)] : [`${T("rules_rule")} ${ruleText(k, overrides)}`];
    return [
      `## ${T("rule_hdr", { k, n: list.length, s: new Set(list.map((x) => x.s.id)).size })}`,
      "",
      ...rule,
      "",
      ...(bad.length ? [T("md_bad"), ...bad.map((b) => "```\n" + b + "\n```")] : []),
      good ? `${T("md_good")}\n\n\`\`\`\n${good}\n\`\`\`` : "",
      "",
      T("rules_ev"),
      ...list.slice(0, 5).map((x) => `- ${sessionLabel(x.s)}, ${where(x.f)}${note(x) ? ` — «${note(x)}»` : ""}`),
      "",
    ].join("\n");
  }
  /* The proposed rules as a skill's input (0.1.141): each rule's evidence without its sessions and steps, only the
     reviewers' notes, once each. A skill keeps no history (the owner's audit of a generated skill, 26.11: dates, steps
     and verdicts in it, the same story in five files); a note can hold a decision of the project, which the skill keeps
     as its result. An evidence line with no note goes; so does the heading of an evidence list left empty. */
  function skillInput(/** @type {string} */ md) {
    const out = [];
    let notes = null;
    const flush = () => {
      if (notes && notes.length) out.push(T("rules_notes"), ...[...new Set(notes)].map((n) => `- ${n}`));
      notes = null;
    };
    for (const line of String(md || "").split("\n")) {
      if (line.trim() === T("rules_ev")) {
        flush();
        notes = [];
        continue;
      }
      if (notes) {
        if (/^- /.test(line)) {
          const m = /— «(.*)»\s*$/.exec(line);
          if (m && m[1].trim()) notes.push(m[1].trim());
          continue;
        }
        flush();
      }
      out.push(line);
    }
    flush();
    return out.join("\n");
  }
  /* A skill's examples/ folder: for each picked rule, up to perRule files the agent really wrote, at the step of a
     confirmed finding of that rule, one session first; secrets masked, cut at maxChars. confirmedOf(check) gives
     [{ s, f }]: the session and its confirmed finding. → { files: [README, …], rows, masked }.
     Since 0.1.139 one file at one step is one copy: a rule that needs a file another rule already took refers to that
     copy (the owner's skill had the same two files in raw_locator/ and positional_locator/, byte for byte). A README row
     says when the session changed the file later: the example is the version at the finding's step, not the last. */
  /** @param {string[]} keys @param {(k: string) => any[]} confirmedOf @param {{ perRule: number, maxChars: number }} opts */
  function skillExamples(keys, confirmedOf, opts) {
    const files = [],
      rows = [],
      used = new Set(),
      copies = new Map(); // session|file|step → its path
    for (const k of keys) {
      const cand = confirmedOf(k)
        .map(({ s, f }) => ({ s, f, e: s.events.find((/** @type {any} */ x) => x.seq === f.seq) }))
        .filter((x) => x.e && x.e.new_content && !x.e.fragment_only);
      const bySession = new Set();
      const order = [...cand.filter((x) => !bySession.has(x.s.id) && bySession.add(x.s.id)), ...cand]; // one per session first
      let n = 0,
        named = 0;
      for (const { s, f, e } of order) {
        if (n >= opts.perRule) break;
        const id = `${s.id}|${e.file || "seq" + f.seq}`;
        if (used.has(id + "|" + k)) continue;
        used.add(id + "|" + k);
        n++;
        const later = (s.events || []).find((/** @type {any} */ x) => x.seq > f.seq && e.file && x.file === e.file && /^(?:write|edit)$/.test(x.kind));
        const row = { path: "", k, session: sessionLabel(s), seq: f.seq, message: f.message, masked: 0, cut: false, later: later ? later.seq : null };
        const copy = copies.get(id + "|" + f.seq);
        if (copy) Object.assign(row, { path: copy.path, shared: true });
        else {
          const base = ((e.file || "").split("/").pop() || `from-chat-seq${f.seq}.txt`).replace(/[^\w.\-]/g, "_");
          const red = L().redactSecrets(e.new_content.slice(0, opts.maxChars));
          Object.assign(row, { path: `examples/${k}/${++named}-${base}`, masked: red.count, cut: e.new_content.length > opts.maxChars });
          files.push({ path: row.path, content: red.text });
          copies.set(id + "|" + f.seq, row);
        }
        rows.push(row);
      }
    }
    if (!files.length) return { files: [], rows: [], masked: 0 };
    const cell = (/** @type {any} */ x) => String(x).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim().slice(0, 160);
    const notes = (/** @type {any} */ r) =>
      [
        r.masked ? T("ex_masked", { n: r.masked }) : "",
        r.cut ? T("ex_truncated", { n: opts.maxChars }) : "",
        r.later != null ? T("ex_changed_later", { seq: r.later }) : "",
      ]
        .filter(Boolean)
        .join("; ");
    const readme = [
      T("ex_readme_title"),
      "",
      T("ex_readme_body"),
      "",
      T("ex_col"),
      "|---|---|---|---|---|",
      ...rows.map(
        (r) =>
          `| \`${r.path.replace("examples/", "")}\` | ${r.k} | ${cell(r.session)} | ${r.seq} | ${cell(r.message)}${notes(r) ? " (" + notes(r) + ")" : ""} |`,
      ),
      "",
    ].join("\n");
    return { files: [{ path: "examples/README.md", content: readme }, ...files], rows, masked: rows.reduce((a, r) => a + r.masked, 0) };
  }
  return {
    GROUPS,
    DEFAULT_SEVERITY,
    GOOD,
    ALL,
    book,
    apply,
    ruleText,
    exampleGood,
    disabledChecks,
    toJson,
    fromJson,
    groupOf,
    skillExamples,
    skillInput,
    ruleMarkdown,
    markNotes,
    sessionLabel,
    where,
  };
});
