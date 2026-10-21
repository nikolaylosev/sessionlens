// @ts-check
/* Specification as an object + coverage matrix. No DOM. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else /** @type {any} */ (root).LensSpec = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const T = (k, v) => (typeof I18N !== "undefined" ? I18N : require("./i18n.js")).t(k, v);
  // a quoted text cut at a word break with "…" (0.1.124; it was cut mid-word): Lens.clip, loaded before this file
  const clip = (t, n) => (typeof Lens !== "undefined" ? Lens : require("./lens.js")).clip(t, n);
  /* A requirement's ID: R1 / S1 (TASK-1/R1), or since 0.1.130 a key as a test management tool gives it: NAV-01, REQ-12,
     CIP-T123 (Zephyr), US-45. A key needs a mark after it (. : ) or a dash), not only a space: "UTF-8 encoding is used"
     and "ISO-8601 dates" are text, not requirements; in a section headed as requirements a space is enough (KEY_IN_REQ). */
  const KEY = "[A-Z][A-Z0-9]{1,9}-[A-Z]{0,3}\\d{1,6}";
  const ID_RE = new RegExp(
    String.raw`^\s*(?:[-*]\s*|\d+[.)]\s*|#{1,4}\s*)?(?:((?:[A-Z]{2,10}-\d+\/)?[RS]\d{1,3})[.:)\s]|(` + KEY + String.raw`)(?:[.:)]|\s+[—–-]\s))\s*(.+)$`,
  );
  const KEY_IN_REQ = new RegExp(String.raw`^\s*(?:[-*]\s*|\d+[.)]\s*)?()(` + KEY + String.raw`)\s+(.+)$`);
  const OOS_HEAD = /вне\s+scope|out of scope|не\s+входит|исключ/i;
  const REQ_HEAD = /требован|requirement|сценари|scenario|критери|acceptance/i;
  const GWT_RE = /^\s*(?:Scenario|Сценарий)\s*[:\-]\s*(.+)$/i;
  /* A plan of Playwright's planner agent (planner_save_plan, 0.1.130): "## Test Scenarios", a suite "### 1. Name" with
     "**Seed:** `tests/seed.spec.ts`", and a scenario "#### 1.1. Name" with its steps. The generator names each test as
     its scenario and puts no number in it, so a scenario is a requirement with its number as the ID that a test covers
     by its title (byTitle); the seed tests are no tests without a requirement. */
  const PLAN_HEAD = /^##\s+Test Scenarios\s*$/m;
  const PLAN_ITEM = /^####\s+(\d{1,3}\.\d{1,3})\.\s+(.+)$/;
  const PLAN_SEED = /^\*\*Seed:\*\*\s*`([^`]+)`/;
  function parsePlan(text, spec) {
    for (const line of text.split("\n")) {
      const m = PLAN_ITEM.exec(line.trim());
      if (m) spec.requirements.push({ id: m[1], text: m[2].trim(), byTitle: true });
      const seed = PLAN_SEED.exec(line.trim());
      if (seed && !spec.seeds.includes(seed[1])) spec.seeds.push(seed[1]);
    }
    return spec;
  }

  function parse(text) {
    const spec = { requirements: [], outOfScope: [], openQuestions: [], seeds: [], raw: text || "" };
    if (!text || !text.trim()) return spec;
    if (PLAN_HEAD.test(text) && text.split("\n").some((l) => PLAN_ITEM.test(l.trim()))) return parsePlan(text, spec);
    let section = "",
      auto = 0;
    for (const raw of text.split("\n")) {
      const line = raw.replace(/\s+$/, "");
      if (/^\s*#{1,4}\s/.test(line) || /^[A-ZА-ЯЁ][^:]{2,40}:\s*$/.test(line)) {
        /* a heading that starts with an ID is a requirement, not a section (0.1.130: "### NAV-01. The menu opens", the
           way an agent writes a document of test cases, was taken for a heading, and the text under it for requirements) */
        const h = /^\s*#/.test(line) && line.match(ID_RE);
        if (h) {
          if (section === "oos") spec.outOfScope.push(line.replace(/^\s*#+\s*/, ""));
          else spec.requirements.push({ id: h[1] || h[2], text: h[3].trim() });
          continue;
        }
        section = OOS_HEAD.test(line) ? "oos" : /открыт|open question|вопрос/i.test(line) ? "open" : REQ_HEAD.test(line) ? "req" : "";
        continue;
      }
      let m = line.match(ID_RE) || (section === "req" && line.match(KEY_IN_REQ));
      if (m && section !== "oos") {
        spec.requirements.push({ id: m[1] || m[2], text: m[3].trim() });
        continue;
      }
      m = line.match(GWT_RE);
      if (m) {
        spec.requirements.push({ id: "S" + ++auto, text: m[1].trim(), auto: true });
        continue;
      }
      if (section === "oos" && /^\s*[-*]\s+/.test(line)) spec.outOfScope.push(line.replace(/^\s*[-*]\s+/, "").trim());
      else if (section === "open" && /^\s*[-*]\s+/.test(line)) spec.openQuestions.push(line.replace(/^\s*[-*]\s+/, "").trim());
      else if (section === "req" && /^\s*[-*]\s+/.test(line) && !m)
        spec.requirements.push({ id: "R" + ++auto, text: line.replace(/^\s*[-*]\s+/, "").trim(), auto: true });
    }
    // An informal spec — "1. navigation 2. search", or a few lines with no headings — still states requirements.
    // Fall back to inline numbering, then to non-empty lines, so the coverage matrix has something to work with.
    if (!spec.requirements.length && text.trim()) {
      const inline = [...text.matchAll(/(?:^|[\s(])(\d{1,2})[.)]\s*([^\d\n][^\n]*?)(?=\s+\d{1,2}[.)]\s|$|\n)/g)]
        .map((m) => m[2].trim())
        .filter((t) => t.length > 2);
      const source =
        inline.length >= 2
          ? inline
          : text
              .split("\n")
              .map((l) => l.replace(/^\s*[-*\d.)\s]+/, "").trim())
              .filter((l) => l.length > 3 && !/^#/.test(l));
      source.forEach((t, i) => spec.requirements.push({ id: "R" + (i + 1), text: t.slice(0, 200), auto: true }));
    }
    return spec;
  }

  // tests in code: [{name, header, body, file}] — header = name + docstring/comment/first lines where IDs are referenced
  const EXTRACT = {
    python: /(?:^|\n)((?:[ \t]*#[^\n]*\n)*)[ \t]*(?:async\s+)?def\s+(test\w*)\s*\([^)]*\)[^\n]*:\s*\n((?:[ \t]+[^\n]*\n?)*)/g,
    // it/test with a modifier that still makes a test (only, skip, fixme…), not test.describe/step/beforeEach…; not the
    // end of another word (submit("…")). A body stops at the next test or a describe/context block (0.1.110: a describe
    // block was a test named after it, and a test.skip(…) after a test was swallowed by that test's body).
    typescript:
      /((?:[ \t]*\/\/[^\n]*\n)*)[ \t]*(?<![\w.$])(?:it|test)(?:\.(?:only|skip|fixme|fail|slow|concurrent|todo))?\s*\(\s*(['"`])([^'"`]+)\2[^\n]*\n((?:(?![ \t]*(?:(?:it|test)(?:\.(?:only|skip|fixme|fail|slow|concurrent|todo))?|(?:test\.)?describe(?:\.\w+)?|context)\s*\()[^\n]*\n?)*)/g,
    java: /((?:[ \t]*(?:\/\/|\*)[^\n]*\n)*)[ \t]*@Test[^\n]*\n\s*(?:public\s+)?void\s+(\w+)\s*\([^)]*\)[^\n]*\n((?:(?![ \t]*@Test)[^\n]*\n?)*)/g,
    csharp:
      /((?:[ \t]*\/\/[^\n]*\n)*)[ \t]*\[(?:Test|Fact|Theory|TestMethod|TestCase)\b[^\n]*\n(?:[ \t]*\[[^\n]*\n)*\s*(?:public\s+)?(?:async\s+)?(?:Task|void)\s+(\w+)\s*\([^)]*\)[^\n]*\n((?:(?![ \t]*\[(?:Test|Fact|Theory|TestMethod|TestCase)\b)[^\n]*\n?)*)/g,
    karate: /((?:[ \t]*#[^\n]*\n)*)[ \t]*Scenario(?: Outline)?:\s*([^\n]+)\n((?:(?![ \t]*Scenario)[^\n]*\n?)*)/g,
    go: /((?:[ \t]*\/\/[^\n]*\n)*)[ \t]*func\s+(Test\w+)\s*\([^)]*\)[^\n]*\n((?:(?!func\s+Test)[^\n]*\n?)*)/g,
    // Kotlin (phase 7): @Test on its own line or before `fun`, other annotations and modifiers allowed; a name in backticks
    kotlin:
      /((?:[ \t]*(?:\/\/|\*|\/\*\*)[^\n]*\n)*)[ \t]*@Test\b(?:\([^)\n]*\))?[ \t]*(?:\n(?:[ \t]*@[^\n]*\n)*[ \t]*)?(?:(?:public|internal|override|suspend|open)\s+)*fun\s+(`[^`\n]+`|\w+)\s*\([^)]*\)[^\n]*\n((?:(?![ \t]*@Test\b)[^\n]*\n?)*)/g,
  };
  /* Robot Framework (phase 7): the test cases (or RPA tasks) section up to the next *** section; a name is a line
     without indentation, its body the indented lines under it. [Documentation] and [Tags] are in the body, so a
     requirement ID in them links the test like a docstring does. */
  function robotTests(code) {
    const out = [];
    let inCases = false,
      cur = null;
    const flush = () => {
      if (cur) {
        out.push({ name: cur.name, header: cur.name + " " + cur.lines.slice(0, 6).join(" "), body: cur.lines.join("\n") + "\n" });
        cur = null;
      }
    };
    for (const line of String(code).split("\n")) {
      const sec = /^\*{3}\s*([^*]+?)\s*\*{3}/.exec(line);
      if (sec) {
        flush();
        inCases = /^(?:test\s*cases?|tasks?)$/i.test(sec[1]);
        continue;
      }
      if (!inCases) continue;
      if (/^\S/.test(line) && !/^#/.test(line)) {
        flush();
        cur = { name: line.trim().split(/\s{2,}|\t/)[0], lines: [] };
      } else if (cur && line.trim()) cur.lines.push(line.trim());
    }
    flush();
    return out;
  }
  /* Which extractor reads a file: by the profile's language, and by the file's extension for the language-agnostic
     profiles. null: nothing here can find the tests in it, so the file does not count for coverage (phase 7: before,
     every unknown case silently used the Python pattern and found nothing, so every requirement looked uncovered). */
  /** @type {Array<[RegExp, string]>} */
  const BY_EXT = [
    [/\.py$/, "python"],
    [/\.java$/, "java"],
    [/\.kts?$/, "kotlin"],
    [/\.cs$/, "csharp"],
    [/\.(?:ts|tsx|js|jsx|mjs|cjs)$/, "typescript"],
    [/\.go$/, "go"],
    [/\.feature$/, "karate"],
    [/\.robot$/, "robot"],
  ];
  const extOf = (file) => {
    for (const [rx, x] of BY_EXT) if (rx.test(file || "")) return x;
    return null;
  };
  const hasExt = (file) => /\.[\w-]+$/.test(file || "");
  const ALL = ["python", "java", "kotlin", "csharp", "typescript", "go", "karate", "robot"];
  const MOBILE = ["python", "java", "kotlin", "csharp", "typescript"];
  // → an extractor name, a list of names (code whose file says nothing about its language: try each), or null
  function extractorFor(language, file) {
    const byExt = extOf(file);
    switch (language) {
      case "typescript":
      case "cypress":
      case "detox":
        return "typescript";
      case "python":
      case "csharp":
      case "go":
        return language;
      case "java":
        return byExt === "kotlin" ? "kotlin" : "java";
      case "robot":
        return byExt === "robot" || !hasExt(file) ? "robot" : null;
      case "api":
        return byExt || "typescript"; // as in 0.1.103: code without a known extension is read as TS/JS
      case "mobile":
        return byExt ? (MOBILE.includes(byExt) ? byExt : null) : hasExt(file) ? null : MOBILE;
      case "any":
        return byExt || (hasExt(file) ? null : ALL);
      default:
        return null;
    }
  }
  function supports(language, file) {
    return extractorFor(language, file) !== null;
  }
  /* A comment line, per extractor: the same prefixes the leading group of its EXTRACT pattern accepts. A body runs up
     to the next test's first line, so it also takes the comment right above the next test; extract() hands that
     comment back to the test it belongs to (python needs nothing: its body is the indented lines only). */
  const COMMENT_LINE = {
    typescript: /^[ \t]*\/\/[^\n]*$/,
    java: /^[ \t]*(?:\/\/|\*)[^\n]*$/,
    kotlin: /^[ \t]*(?:\/\/|\*|\/\*\*)[^\n]*$/,
    csharp: /^[ \t]*\/\/[^\n]*$/,
    karate: /^[ \t]*#[^\n]*$/,
    go: /^[ \t]*\/\/[^\n]*$/,
  };
  // → [body without the comment lines at its end, those lines]
  function splitTrailingComment(body, x) {
    const rx = COMMENT_LINE[x];
    if (!rx) return [body, ""];
    const lines = body.split("\n");
    const end = lines.length && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length; // the final "\n"
    let start = end;
    while (start > 0 && rx.test(lines[start - 1])) start--;
    if (start === end) return [body, ""];
    return [lines.slice(0, start).join("\n") + (start ? "\n" : ""), lines.slice(start, end).join("\n") + "\n"];
  }
  function extract(code, x) {
    if (x === "robot") return robotTests(code);
    const rx = EXTRACT[x];
    rx.lastIndex = 0;
    const out = [];
    const ms = [...code.matchAll(rx)];
    let carried = ""; // the comment above this test, found at the end of the previous test's body
    ms.forEach((m, i) => {
      const name = (x === "typescript" ? m[3] : m[2]).replace(/^`|`$/g, "");
      let body = x === "typescript" ? m[4] : m[3];
      const lead = carried + (m[1] || "");
      carried = "";
      const next = ms[i + 1];
      if (next && next.index === m.index + m[0].length) [body, carried] = splitTrailingComment(body, x);
      const doc = (body.match(/^\s*(?:"""|''')([\s\S]*?)(?:"""|''')/) || [])[1] || "";
      out.push({ name, header: lead + " " + name + " " + doc + " " + body.split("\n").slice(0, 3).join(" "), body, at: m.index });
    });
    return out;
  }
  function tests(code, language, file) {
    const x = extractorFor(language, file);
    if (x === null) return [];
    if (Array.isArray(x)) return x.flatMap((one) => extract(code, one));
    return extract(code, x);
  }
  // words longer than four letters that say nothing about a feature, so they are no keyword of an out-of-scope item
  const COMMON =
    /^(?:about|above|after|again|along|among|before|being|below|between|could|every|other|their|there|these|those|through|under|until|where|which|while|within|without|would|should|через|между|после|перед|также|кроме|только|более|менее|когда|чтобы|потом|который|которая|которые|всегда|никогда)$/i;
  const REF_RE = /\b(?:[A-Z]{2,10}-\d+\/)?([RS]\d{1,3})\b/g;
  /* The IDs a test's title or comment names. Since 0.1.121 also in a name written the way the language writes names:
     test_r1_total (snake_case) and testR1Total (camelCase) name R1. */
  function refs(text) {
    const s = new Set();
    const t = (text || "")
      .replace(/_/g, " ")
      .replace(/([a-z\d])([A-Z])/g, "$1 $2")
      .replace(/\b([rs])(\d{1,3})\b/g, (m, l, d) => l.toUpperCase() + d);
    for (const m of t.matchAll(REF_RE)) s.add(m[1]);
    return s;
  }

  /* Whether a test's title or comment names a key (0.1.130): NAV-01 as written, or the way a name has to write it,
     nav_01 or NAV01, in any case; not inside a word or a longer number (NAV-010, XNAV-01) */
  const KEY_ID = new RegExp("^" + KEY + "$");
  function namesKey(id, text) {
    const m = /^([A-Z][A-Z0-9]*)-([A-Z]*)(\d+)$/.exec(id);
    if (!m) return false;
    return new RegExp(`(?<![A-Za-z0-9])${m[1]}[-_ ]?${m[2]}${m[2] ? "[-_]?" : ""}${m[3]}(?!\\d)`, "i").test(text || "");
  }

  /* A test made in a loop over the cases (0.1.130): test(`${item.id}: …`) inside for (const item of LINKS) or
     LINKS.forEach((item) => …), the IDs in the array (Tests-mcp: NAV-02…NAV-20 in two arrays, every one "with no
     test"). → the text of the array the title takes its value from, or "" when the title names no loop variable or the
     array is not found. Its IDs are the ones written as strings. */
  function loopSource(code, at, name) {
    const from = Math.max(0, at - 600),
      before = code.slice(from, at);
    let v = "",
      src = "",
      inlineAt = -1;
    const forOf = [...before.matchAll(/for\s*\(\s*(?:const|let|var)\s+(\w+)\s+of\s+([\w$.]+|\[)/g)].pop();
    const each = [...before.matchAll(/([\w$.]+)\s*\.forEach\(\s*(?:async\s*)?\(?\s*(\w+)/g)].pop();
    const last = forOf && (!each || forOf.index > each.index) ? "for" : each ? "each" : "";
    if (last === "for") {
      [v, src] = [forOf[1], forOf[2]];
      if (src === "[") inlineAt = from + forOf.index + forOf[0].length - 1;
    } else if (last === "each") [v, src] = [each[2], each[1]];
    if (!v || !new RegExp("\\$\\{\\s*" + v + "\\b").test(name)) return "";
    if (inlineAt < 0) {
      const decl = new RegExp("(?:const|let|var)\\s+" + src.split(".").pop() + "\\s*(?::[^=\\n]+)?=\\s*\\[").exec(code);
      if (!decl) return "";
      inlineAt = decl.index + decl[0].length - 1;
    }
    let depth = 0;
    for (let i = inlineAt; i < code.length; i++) {
      if (code[i] === "[") depth++;
      else if (code[i] === "]" && !--depth) return code.slice(inlineAt, i + 1);
    }
    return "";
  }
  const asString = (id, text) => new RegExp("['\"`]" + id.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "['\"`]").test(text);

  // a test's title as a plan's scenario names it: case, spaces and a final period aside
  const title = (t) =>
    String(t || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\.$/, "")
      .toLowerCase();
  const sameFile = (a, b) => a === b || a.endsWith("/" + b) || b.endsWith("/" + a);

  function coverage(spec, events, language) {
    const byFile = {};
    for (const e of events) if (e.new_content) byFile[e.file || T("in_msg")] = e.new_content;
    // phase 7: when no written file is one the coverage can read, there is no coverage to report (null), rather
    // than every requirement looking uncovered
    const readable = Object.keys(byFile).filter((file) => supports(language, file));
    if (!readable.length) return null;
    const all = [];
    for (const file of readable)
      for (const t of tests(byFile[file], language, file))
        all.push({ ...t, file, looped: /\$\{/.test(t.name) && typeof t.at === "number" ? loopSource(byFile[file], t.at, t.name) : "" });
    const ids = spec.requirements.map((r) => r.id);
    const covered = {};
    ids.forEach((id) => (covered[id] = []));
    const unlinked = [];
    const seeds = spec.seeds || [];
    for (const t of all) {
      const named = refs(t.header);
      /* an R ID by its R part: a test names R1 for TASK-1/R1 as for R1 (0.1.130: a spec written with the ticket's
         prefix had every requirement "with no test"); a key as namesKey reads it */
      const r = spec.requirements
        .filter((q) =>
          q.byTitle
            ? title(q.text) === title(t.name)
            : named.has(q.id.replace(/^.*\//, "")) || (KEY_ID.test(q.id) && namesKey(q.id, t.header)) || (!!t.looped && asString(q.id, t.looped)),
        )
        .map((q) => q.id);
      if (!r.length && !seeds.some((f) => sameFile(t.file, f))) unlinked.push(t);
      r.forEach((id) => covered[id].push(t.name));
    }
    return { tests: all, covered, uncovered: ids.filter((id) => !covered[id].length), unlinked, hasIds: spec.requirements.some((r) => !r.auto) };
  }

  function checks(spec, events, language) {
    const F = (check, severity, seq, message) => ({ check, severity, seq, message, source: "spec" });
    const lastCode = [...events].reverse().find((e) => e.new_content);
    if (!lastCode) return { findings: [], coverage: null };
    if (!spec || !spec.requirements.length) return { findings: [F("no_spec", "high", lastCode.seq, T("no_spec"))], coverage: null };
    const cov = coverage(spec, events, language);
    const out = [];
    if (!cov) return { findings: [], coverage: null };
    // a specification without IDs (R1, R2… numbered by the parser) cannot be named by a test: no uncovered requirement
    // to report, as with test_without_requirement (0.1.121; until then every requirement was reported)
    if (cov.hasIds)
      for (const id of cov.uncovered) {
        const r = spec.requirements.find((x) => x.id === id);
        out.push(F("spec_uncovered", "high", lastCode.seq, T("uncovered", { id, text: clip(r.text, 90) })));
      }
    if (cov.hasIds) for (const t of cov.unlinked) out.push(F("test_without_requirement", "medium", lastCode.seq, T("unlinked", { name: t.name })));
    /* An out-of-scope item's keywords: its first two words longer than four letters that are not common words and that
       no requirement uses ("payment" in "Payment by PayPal" when R1 is about the payment total). A test touches the
       item when one keyword starts a word of its name, or all of them start words of its body; until 0.1.119 any
       keyword anywhere counted, inside other words too ("#overflows" for "Refund flows"). */
    const reqWords = new Set(spec.requirements.flatMap((r) => r.text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []));
    for (const o of spec.outOfScope) {
      const kw = (o.match(/[\p{L}\p{N}]+/gu) || []).filter((w) => w.length > 4 && !COMMON.test(w) && !reqWords.has(w.toLowerCase())).slice(0, 2);
      if (!kw.length) continue;
      const rxs = kw.map((w) => new RegExp("(?<![\\p{L}\\p{N}_])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu"));
      if (cov.tests.some((t) => rxs.some((rx) => rx.test(t.name)) || rxs.every((rx) => rx.test(t.body))))
        out.push(F("out_of_scope_tested", "medium", lastCode.seq, T("oos", { text: clip(o, 80) })));
    }
    return { findings: out, coverage: cov };
  }
  /* What the agent wrote in the session that could be its specification (0.1.130): a plan it saved with Playwright's
     planner (the step's plan), or a document it wrote (.md, .txt) whose requirements have IDs, two at least (a document
     of test cases: "### NAV-01. …"). The last version of each file, newest first. The panel offers them while the
     session has no specification; nothing is taken without the person's click. → [{ file, kind: "plan" | "cases", n, text }] */
  function offers(events) {
    const last = new Map();
    for (const e of events || []) {
      if (!e || !e.file) continue;
      if (typeof e.plan === "string" && e.plan) last.set(e.file, { kind: "plan", text: e.plan, seq: e.seq });
      else if (/\.(?:md|markdown|txt)$/i.test(e.file) && !e.fragment_only) {
        // the import keeps a document's text as doc_content: new_content is for code
        const text = typeof e.doc_content === "string" ? e.doc_content : e.new_content;
        if (typeof text === "string") last.set(e.file, { kind: "cases", text, seq: e.seq });
      }
    }
    const out = [];
    for (const [file, o] of last) {
      const n = parse(o.text).requirements.filter((r) => !r.auto).length;
      if (o.kind === "plan" ? n >= 1 : n >= 2) out.push({ file, kind: o.kind, n, text: o.text, seq: o.seq });
    }
    return out.sort((a, b) => b.seq - a.seq).map(({ file, kind, n, text }) => ({ file, kind, n, text }));
  }
  return { parse, tests, coverage, checks, refs, supports, extractorFor, offers };
});
