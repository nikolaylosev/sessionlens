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
  /* A generated skill, checked without a model (0.1.141), as the owner's requirements for a skill say (26.11):
     sizes and what an agent reads, one numbering in every file, no history, examples with names the sessions' code has
     and that follow the skill's own rules, a script whose patterns catch the bad example and not the good one.
     files: [{ path, content }] of the skill; ctx: { code: [text of the sessions' code], check?: (code, lang) =>
     [{ check, line }] } (the app's lint and regex checks on a snippet). → { stats, issues: [{ level, key, rule, text }] },
     level "error" or "warn"; key names the kind of problem, text says it for the person. */
  const SKILL_MAX = 8000,
    DESC_MAX = 400,
    READ_MAX = 30000,
    BAD_MAX_LINES = 3;
  // names a snippet may call that no project defines: the language's own and the test frameworks' API
  const KNOWN_API = new Set(
    (
      "require import console log warn error Promise all race resolve reject then catch finally setTimeout clearTimeout Date now " +
      "Math max min round floor ceil abs random JSON parse stringify String Number Boolean Array from isArray of Object keys values " +
      "entries assign freeze Set Map has get set add delete clear map filter find findIndex some every reduce forEach includes " +
      "indexOf lastIndexOf push pop shift unshift slice splice concat join split replace replaceAll match matchAll test exec " +
      "trim trimStart trimEnd padStart padEnd startsWith endsWith toLowerCase toUpperCase toString toFixed sort reverse flat flatMap " +
      "fill at length RegExp Error encodeURIComponent decodeURIComponent fetch text json " +
      "test describe step skip only fixme fail slow beforeEach afterEach beforeAll afterAll use info expect poll soft toPass " +
      "page context browser request goto reload click dblclick fill press type check uncheck hover focus blur selectOption " +
      "setInputFiles dispatchEvent tap isVisible isHidden isEnabled isChecked textContent innerText inputValue getAttribute count " +
      "all allInnerTexts allTextContents first last nth and or locator getByRole getByText getByLabel getByPlaceholder getByAltText " +
      "getByTitle getByTestId frameLocator contentFrame waitFor waitForURL waitForResponse waitForRequest waitForEvent " +
      "waitForLoadState route unroute fulfill abort continue on off once evaluate screenshot url title status ok body headers " +
      "post put patch newPage close addInitScript clearCookies cookies addCookies storageState " +
      "assert def print len range str int float dict list tuple isinstance raises fixture mark parametrize approx"
    ).split(" "),
  );
  function checkSkill(/** @type {{path: string, content: string}[]} */ files, /** @type {any} */ ctx) {
    ctx = ctx || {};
    const issues = /** @type {{level: string, key: string, rule: string, text: string}[]} */ ([]);
    const add = (/** @type {string} */ level, /** @type {string} */ key, /** @type {string} */ rule, /** @type {any} */ v) =>
      issues.push({ level, key, rule, text: T("sc_" + key, Object.assign({ r: rule }, v || {})) });
    const own = files.filter((f) => !/^(?:examples|skill-history)\//.test(f.path));
    const get = (/** @type {RegExp} */ rx) => own.find((f) => rx.test(f.path));
    const skill = get(/^SKILL\.md$/),
      rules = get(/^references\/rules\.md$/),
      script = get(/^scripts\/.*\.sh$/);
    // ---- sizes, and what an agent reads at work: SKILL.md and the rules ----
    const desc = ((/^---\n([\s\S]*?)\n---/.exec((skill && skill.content) || "") || [])[1] || "").match(/^description:\s*(.*)$/m);
    const stats = {
      skill: skill ? skill.content.length : 0,
      description: desc ? desc[1].replace(/^["']|["']$/g, "").length : 0,
      read: (skill ? skill.content.length : 0) + (rules ? rules.content.length : 0),
      files: own.length,
    };
    if (!skill) add("error", "no_skill", "");
    if (!rules) add("error", "no_rules", "");
    if (stats.skill > SKILL_MAX) add("warn", "skill_long", "", { n: stats.skill, max: SKILL_MAX });
    if (stats.description > DESC_MAX) add("warn", "desc_long", "", { n: stats.description, max: DESC_MAX });
    if (stats.read > READ_MAX) add("warn", "read_long", "", { n: stats.read, max: READ_MAX });
    // ---- an update keeps every rule's number and name (ctx.before: the skill's files before it) ----
    if (Array.isArray(ctx.before) && ctx.before.length) {
      const names = (/** @type {{path: string, content: string}[]} */ fs) => {
        const m = new Map();
        for (const f of fs.filter((x) => /^(?:SKILL\.md|references\/.*\.md)$/.test(x.path)))
          for (const h of f.content.matchAll(/^##\s+(P-\d{2,})\b[.:)\s-]*(.*)$/gm)) if (!m.has(h[1])) m.set(h[1], h[2].trim());
        return m;
      };
      const was = names(ctx.before),
        now = names(own);
      const norm = (/** @type {string} */ x) =>
        x
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();
      for (const [id, name] of was)
        if (!now.has(id)) add("error", "rule_dropped", id, { x: name });
        else if (name && now.get(id) && norm(name) !== norm(/** @type {string} */ (now.get(id)))) add("warn", "rule_renamed", id, { x: name, y: now.get(id) });
    }
    // ---- one numbering ----
    const ids = (/** @type {string} */ t) => [...t.matchAll(/\bP-(\d{2,})\b/g)].map((m) => "P-" + m[1]);
    const inSkill = new Set(ids((skill && skill.content) || ""));
    const heads = [...((rules && rules.content) || "").matchAll(/^##\s+(P-\d{2,})\b/gm)].map((m) => m[1]);
    const entries = new Set(heads);
    for (const id of new Set(heads.filter((h, i) => heads.indexOf(h) !== i))) add("error", "dup_entry", id);
    for (const id of inSkill) if (rules && !entries.has(id)) add("error", "no_entry", id);
    for (const id of entries) if (skill && !inSkill.has(id)) add("warn", "not_in_skill", id);
    for (const f of own) if (/\bAP-\d+/.test(f.content)) add("error", "second_numbering", "", { f: f.path });
    // ---- no history: steps and dates outside code ----
    for (const f of own.filter((x) => /\.md$/.test(x.path))) {
      const prose = f.content.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
      const m = /\bseq\s*#?\d+|\b\d{1,2}\.\d{1,2}\.(?:\d{2}|\d{4})\b|\b20\d\d-\d\d-\d\d\b/i.exec(prose);
      if (m) add("warn", "history", "", { f: f.path, x: m[0] });
    }
    // ---- the rules' entries: Bad short; Good with known names, following every rule ----
    const known = new Set(KNOWN_API);
    for (const t of ctx.code || []) for (const m of String(t).matchAll(/[A-Za-z_$][\w$]*/g)) known.add(m[0]);
    const goods = /** @type {{id: string, code: string, lang: string}[]} */ ([]),
      bads = /** @type {{id: string, text: string}[]} */ ([]);
    for (const sec of ((rules && rules.content) || "").split(/^(?=##\s+P-\d{2,}\b)/m)) {
      const id = (/^##\s+(P-\d{2,})/.exec(sec) || [])[1];
      if (!id) continue;
      // the parts of an entry by their labels at the start of a line, bold or not, English or Russian (the owner's skill)
      const parts = /** @type {Record<string, string>} */ ({});
      const marks = [...sec.matchAll(SKILL_LABEL)];
      marks.forEach((m, i) => {
        const kind = LABEL_KIND[m[1].toLowerCase()];
        const end = i + 1 < marks.length ? /** @type {number} */ (marks[i + 1].index) : sec.length;
        parts[kind] = (parts[kind] || "") + sec.slice(/** @type {number} */ (m.index) + m[0].length, end);
      });
      const bad = parts.bad || "",
        good = parts.good || "";
      const badCode = [...bad.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n") || bad.replace(/`/g, "");
      const lines = badCode.split("\n").filter((l) => l.trim());
      if (lines.length > BAD_MAX_LINES) add("warn", "bad_long", id, { n: lines.length, max: BAD_MAX_LINES });
      bads.push({ id, text: badCode });
      for (const m of good.matchAll(/```(\w*)\n([\s\S]*?)```/g)) goods.push({ id, lang: m[1].toLowerCase(), code: m[2] });
    }
    for (const g of goods) {
      // a name it defines itself is known in it
      const defined = new Set(
        [...g.code.matchAll(/(?:function\s+|(?:const|let|var|class|def)\s+)([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*(?=[(:=,)][^\n]*=>)/g)].map(
          (m) => m[1] || m[2],
        ),
      );
      const code = g.code.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/\/\/.*$|#.*$/gm, "");
      const unknown = new Set();
      if ((ctx.code || []).length)
        for (const m of code.matchAll(/(?<![\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
          const n = m[1];
          if (n.length < 3 || known.has(n) || defined.has(n) || /^to[A-Z]/.test(n) || NOT_A_CALL.has(n)) continue;
          unknown.add(n);
        }
      if (unknown.size) add("warn", "unknown_name", g.id, { x: [...unknown].join(", ") });
      if (typeof ctx.check === "function") for (const f of ctx.check(g.code, g.lang) || []) add("error", "good_breaks", g.id, { x: f.check, n: f.line || "?" });
    }
    // ---- the script: labels are rule ids; each pattern catches its bad example and not a good one ----
    if (script) {
      const t = script.content;
      if (/\bgrep\b/.test(t) && !/\bgrep\b[^\n|]*\s-[\w]*H/.test(t)) add("warn", "grep_no_h", "");
      // the skill's own examples, when it has them (sessionlens adds the folder), are no code to check
      if (
        files.some((f) => /^(?:examples|skill-history\/bad)\//.test(f.path)) &&
        !/--exclude-dir[= ]?["']?[^\n]*(?:examples|skill-history|\.sessionlens)/.test(t)
      )
        add("warn", "no_exclude", "");
      for (const m of t.matchAll(/^\s*check\s+"((?:\\.|[^"\\])*)"\s+"((?:\\.|[^"\\])*)"/gm)) {
        const label = m[1],
          id = (/\bP-\d{2,}\b/.exec(label) || [])[0];
        if (!id) {
          add("error", "check_no_id", "", { x: label.slice(0, 60) });
          continue;
        }
        if (rules && !entries.has(id)) add("error", "check_unknown", id);
        let rx;
        try {
          const src = m[2]
            .replace(/\\(["\\$`])/g, "$1")
            .replace(/\[\[:space:\]\]/g, "\\s")
            .replace(/\[\[:digit:\]\]/g, "\\d")
            .replace(/\[\[:alnum:\]\]/g, "[A-Za-z0-9]")
            .replace(/\[\[:alpha:\]\]/g, "[A-Za-z]");
          rx = new RegExp(src);
        } catch {
          add("warn", "check_regex", id);
          continue;
        }
        const own2 = bads.filter((b) => b.id === id);
        if (own2.length && !own2.some((b) => b.text.split("\n").some((l) => rx.test(l)))) add("warn", "check_misses", id);
        const hit = goods.find((g) => g.code.split("\n").some((l) => rx.test(l)));
        if (hit) add("error", "check_false", id, { x: hit.id });
      }
    }
    return { stats, issues };
  }
  /* "Хорошо (`auth-08`, шаг 4–5): …" and "Хорошо — порядок: …" in the owner's skill: a short note in brackets or after a
     dash may come before the colon */
  const SKILL_LABEL = /^\s*(?:\*\*)?(Bad|Good|Why|Exception|Плохо|Хорошо|Зачем|Исключение)(?:\s*\([^)\n]*\)|\s+[—–-][^:\n]{0,60})?(?::\*\*|\*\*:|:)/gim;
  const LABEL_KIND = /** @type {Record<string, string>} */ ({
    bad: "bad",
    плохо: "bad",
    good: "good",
    хорошо: "good",
    why: "why",
    зачем: "why",
    exception: "exception",
    исключение: "exception",
  });
  // words a snippet "calls" that are no function: keywords before a bracket
  const NOT_A_CALL = new Set([
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "return",
    "function",
    "await",
    "async",
    "typeof",
    "new",
    "super",
    "with",
    "elif",
    "not",
    "and",
    "lambda",
    "print",
  ]);
  /* The history of a skill (0.1.141): outside the skill, for people (the owner's requirements, 26.11: verdicts, dates,
     steps and whole files of the sessions do not go into the skill, an agent reads none of them). The app saves the
     files under skill-history/ in the project's .sessionlens/skill-history/<skill>/, and SKILL.md gets one line naming
     that folder. skill-history/README.md says what is where; reviews.md lists, for each picked rule, its findings
     confirmed, rejected as false and left for later, with the session, the step and the reviewer's note;
     bad/ holds the files of the sessions at a confirmed finding's step (skillExamples). reviewedOf(check) →
     [{ s, f, vd }] for every finding of that check with a verdict. */
  const HISTORY_DIR = "skill-history/",
    BAD_DIR = HISTORY_DIR + "bad/";
  const historyPath = (/** @type {string} */ name) => `.sessionlens/skill-history/${name}/`;
  function skillHistory(/** @type {string[]} */ keys, /** @type {(k: string) => any[]} */ reviewedOf, /** @type {any} */ opts) {
    const name = opts.name,
      at = String(opts.at || "").slice(0, 10);
    const line = (/** @type {any} */ x) =>
      `- ${sessionLabel(x.s)}, ${where(x.f)}: ${String(x.f.message || "")
        .replace(/\s+/g, " ")
        .slice(0, 160)}${String((x.vd && x.vd.note) || "").trim() ? ` — «${String(x.vd.note).trim()}»` : ""}`;
    const reviews = [T("sh_reviews_title", { name }), "", T("sh_reviews_body", { at }), ""];
    for (const k of keys) {
      const all = reviewedOf(k);
      reviews.push(`## ${k}`, "");
      for (const [v, title] of [
        ["ok", "sh_confirmed"],
        ["fp", "sh_false"],
        ["later", "sh_later"],
      ]) {
        const l = all.filter((x) => x.vd && x.vd.v === v);
        if (l.length) reviews.push(T(title, { n: l.length }), ...l.map(line), "");
      }
    }
    const readme = [
      T("sh_readme_title", { name }),
      "",
      T("sh_readme_body", { name, at, dir: historyPath(name) }),
      "",
      `- \`reviews.md\` — ${T("sh_readme_reviews")}`,
      ...(opts.bad ? [`- \`bad/\` — ${T("sh_readme_bad")}`] : []),
      "",
      T("sh_readme_rules", { list: keys.map((k) => `\`${k}\``).join(", ") }),
      "",
    ];
    return [
      { path: HISTORY_DIR + "README.md", content: readme.join("\n") },
      { path: HISTORY_DIR + "reviews.md", content: reviews.join("\n") },
    ];
  }
  /* An updated skill (0.1.141): the files the model returned over the skill's files as they were; every other file of
     the skill stays, and those it says to remove go. → files, with the old ones in their place */
  function mergeSkill(
    /** @type {{path: string, content: string}[]} */ before,
    /** @type {{path: string, content: string}[]} */ changed,
    /** @type {string[]} */ remove,
  ) {
    const gone = new Set(remove || []);
    const out = new Map(before.filter((f) => !gone.has(f.path)).map((f) => [f.path, f]));
    for (const f of changed) out.set(f.path, f);
    return [...out.values()];
  }
  /* The history of an update: skill-history/changes-<date>.md, what the model says it changed, the files it removed
     (to delete by hand: saving writes files, it deletes none) and the files it kept as they were. */
  function skillChanges(/** @type {any} */ o) {
    const day = String(o.at || "").slice(0, 10);
    const lines = [T("sh_changes_title", { name: o.name, at: day }), ""];
    lines.push(...(o.changes.length ? o.changes.map((/** @type {any} */ c) => `- ${c.id ? `${c.id}: ` : ""}${c.what}`) : [T("sh_changes_none")]), "");
    if (o.remove.length) lines.push(T("sh_changes_remove"), ...o.remove.map((/** @type {string} */ p) => `- \`${p}\``), "");
    if (o.kept.length) lines.push(T("sh_changes_kept"), ...o.kept.map((/** @type {string} */ p) => `- \`${p}\``), "");
    return { path: `${HISTORY_DIR}changes-${day}.md`, content: lines.join("\n") };
  }
  // the one line of SKILL.md that names its history: for people, an agent does not need to read it
  const historyLine = (/** @type {string} */ name) => T("sh_skill_line", { dir: historyPath(name) });
  /* A skill's bad examples, whole files (skill-history/bad/ since 0.1.141, examples/ in the skill before): for each
     picked rule, up to perRule files the agent really wrote, at the step of a
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
          Object.assign(row, { path: `${BAD_DIR}${k}/${++named}-${base}`, masked: red.count, cut: e.new_content.length > opts.maxChars });
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
        (r) => `| \`${r.path.replace(BAD_DIR, "")}\` | ${r.k} | ${cell(r.session)} | ${r.seq} | ${cell(r.message)}${notes(r) ? " (" + notes(r) + ")" : ""} |`,
      ),
      "",
    ].join("\n");
    return { files: [{ path: BAD_DIR + "README.md", content: readme }, ...files], rows, masked: rows.reduce((a, r) => a + r.masked, 0) };
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
    skillHistory,
    mergeSkill,
    skillChanges,
    historyLine,
    historyPath,
    checkSkill,
    ruleMarkdown,
    markNotes,
    sessionLabel,
    where,
  };
});
