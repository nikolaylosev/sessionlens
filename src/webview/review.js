// @ts-check
/* SessionLens panel — a session's tab: review, specification, model segmentation. Part of the panel's source (src/webview); `npm run build` bundles it into
   media/app.js. Split out of the single app.js in phase 7 (7B.4) without changing behaviour. */
import { $, LABEL, SEV, T, VCOL, VLABEL, esc, fkey, srcLabel, state } from "./common.js";
import { curS, needEngine, profileVerdicts, updateSession } from "./store.js";
import { analyze, analyzeNow } from "./analysis.js";
import { keptEdits, keptOutputs, pickTranscript, piDeps, profileSummary, readFile } from "./sessions.js";
import { download } from "./calibration.js";

export function initReview() {
  $("#raw-copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("#raw").value);
    $("#raw-copy").textContent = T("copied");
    setTimeout(() => ($("#raw-copy").textContent = T("copy")), 1200);
  });
  $("#raw-dl").addEventListener("click", () => {
    const s = curS();
    download(`${(s.task || s.name).replace(/\W+/g, "-")}-model-dump.txt`, s.ai_raw || "");
  });
  $("#spec-file").addEventListener("change", (ev) => {
    const f = ev.target.files[0];
    if (f)
      readFile(f, (t) => {
        $("#spec").value = t;
      });
    ev.target.value = "";
  });
  // a plan or a document of test cases the agent wrote, offered as the specification (0.1.130)
  $("#spec-offer").addEventListener("click", async (ev) => {
    const btn = /** @type {HTMLElement} */ (ev.target).closest("[data-offer]");
    if (!btn) return;
    const o = LensSpec.offers(curS().events)[Number(btn.getAttribute("data-offer"))];
    if (!o) return;
    await needEngine(curS().profile);
    await updateSession(state.current, (s) => {
      s.spec = o.text;
      analyze(s);
    });
    renderReview();
    $("#spec-d").open = true; // show what was taken, so it can be corrected by hand
  });
  $("#spec-save").addEventListener("click", async () => {
    const spec = $("#spec").value;
    await needEngine(curS().profile);
    await updateSession(state.current, (s) => {
      s.spec = spec;
      analyze(s);
    });
    renderReview();
  });

  // ---- model segmentation (optional; regex parsing is the default and the fallback) ----
  $("#seg-run").addEventListener("click", async () => {
    const sid = state.current,
      s = curS(),
      btn = $("#seg-run"),
      st = $("#seg-status");
    s.seg_error = null;
    s.seg_raw = null;
    {
      const miss = LensAI.missingKey(state.settings, "segment");
      if (miss) {
        st.textContent = T("err_no_key_for", { p: miss });
        st.className = "err";
        return;
      }
    }
    btn.disabled = true;
    st.textContent = T("seg_wait");
    const before = JSON.parse(JSON.stringify(s.events));
    try {
      const r = await LensSeg.segment(s, state.settings, LensAI.callModel, LensAI.parseArray);
      const seg = {
        at: new Date().toISOString(),
        n: r.segments.length,
        coverage: r.coverage,
        chunks: r.chunks || null,
        spec_suggested: r.spec_suggested,
        raw: r.request + "\n\n" + T("resp") + "\n" + r.raw,
      };
      const events = s.events; // segment() rewrote them in place
      await needEngine(s.profile);
      await updateSession(sid, (x) => {
        x.events = events;
        x.seg = seg;
        x.seg_error = null;
        x.seg_raw = null;
        analyze(x);
      });
      renderReview();
      st.textContent = segStatus(curS());
    } catch (e) {
      const err = e.message,
        raw = e.raw || null;
      await updateSession(sid, (x) => {
        x.events = before;
        x.seg = null; // regex parsing stands, untouched
        x.seg_error = err;
        x.seg_raw = raw; // but the reason and the exchange are kept
      });
      st.textContent = T("seg_fallback", { msg: e.message });
      renderReview();
      st.textContent = T("seg_fallback", { msg: e.message });
    }
    btn.disabled = false;
  });
  $("#seg-spec").addEventListener("click", async () => {
    const s = curS();
    if (!(s.seg && s.seg.spec_suggested)) return;
    await needEngine(s.profile);
    await updateSession(state.current, (x) => {
      if (x.seg && x.seg.spec_suggested) {
        x.spec = x.seg.spec_suggested;
        analyze(x);
      }
    });
    renderReview();
    $("#spec-d").open = true; // show what was lifted, so it can be corrected by hand
  });
  $("#seg-reset").addEventListener("click", async () => {
    const s = curS();
    if (!s.source_text) return;
    await needEngine(s.profile);
    await updateSession(state.current, (x) => {
      const cfg = Lens.profile(x.profile);
      // the session's own conversation of the file, not the first one (fixed in 0.1.115)
      const from = { cursorOutputs: x.source_outputs, cursorEdits: x.source_edits, cursorProject: x.source_project };
      x.events = Lens.pickConversation(x.events, Lens.importAny(x.source_text, cfg, from)) || x.events;
      x.seg = null;
      x.importGen = Lens.IMPORT_GEN;
      analyze(x);
    });
    renderReview();
    $("#seg-status").textContent = T("seg_none");
  });
  $("#reimport-go").addEventListener("click", () => reimport());

  $("#ai-run").addEventListener("click", async () => {
    const sid = state.current;
    const s = curS();
    const spec = $("#spec").value;
    s.spec = spec;
    const btn = $("#ai-run"),
      st = $("#ai-status");
    btn.disabled = true;
    st.textContent = state.settings.verify ? T("ai_wait_verify") : T("ai_wait");
    try {
      const r = await LensAI.review(s, state.settings);
      await needEngine(s.profile);
      // Saved by id through updateSession: a refresh from another tab or the sidebar may have replaced the loaded copy
      // while this call was in flight, and a conflicting save is read again and this result applied to the fresh copy.
      await updateSession(sid, (cur) => {
        cur.spec = spec;
        cur.findings = cur.findings.filter((f) => f.source !== "ai");
        analyze(cur);
        cur.findings = Lens.sortFindings([...cur.findings, ...r.findings]);
        cur.dropped = r.dropped || [];
        cur.ai_at = new Date().toISOString();
        cur.ai_truncated = r.truncated;
        cur.ai_raw = r.raw;
        cur.ai_verify_error = r.verifyError || null;
      });
      if (state.current === sid) {
        renderReview();
        st.textContent = T("ai_status", {
          n: r.findings.length,
          dropped: r.dropped && r.dropped.length ? T("ai_dropped", { n: r.dropped.length }) : "",
          repaired: r.repaired ? T("ai_repaired") : "",
          err: r.verifyError ? " · " + r.verifyError : "",
        });
      }
    } catch (e) {
      if (state.current === sid) st.textContent = T("error") + e.message;
      if (e.raw) {
        const err = e.message;
        await updateSession(sid, (cur) => {
          cur.ai_raw = e.raw;
          cur.ai_error = err;
        });
        if (state.current === sid && curS()) renderRaw(curS());
      }
    }
    if (state.current === sid) btn.disabled = false;
  });
  // The review call can succeed while the (separately routed, possibly different) verification model
  // fails — e.g. rate-limited or briefly overloaded. Retry just that step, on the findings already here,
  // instead of re-running the whole (often slower and costlier) review.
  $("#ai-verify-again").addEventListener("click", async () => {
    const sid = state.current;
    const btn = $("#ai-verify-again"),
      st = $("#ai-status");
    const aiFindings = state.loaded[sid].findings.filter((f) => f.source === "ai");
    btn.disabled = true;
    st.textContent = T("ai_reverify_wait");
    try {
      const v = await LensAI.verify(state.loaded[sid], aiFindings, state.settings);
      // saved by id, same reason as in #ai-run above
      await updateSession(sid, (cur) => {
        cur.findings = Lens.sortFindings([...cur.findings.filter((f) => f.source !== "ai"), ...v.kept]);
        cur.dropped = v.dropped || [];
        cur.ai_verify_error = v.error || null;
      });
      if (state.current === sid) {
        renderReview();
        st.textContent =
          T("ai_reverify_status", { n: v.kept.length, dropped: v.dropped && v.dropped.length ? T("ai_dropped", { n: v.dropped.length }) : "" }) +
          (v.error ? " · " + v.error : "");
      }
    } catch (e) {
      if (state.current === sid) st.textContent = T("error") + e.message;
    }
    if (state.current === sid) btn.disabled = false;
  });
}

/* "Import again" (0.1.114): a session imported before 0.1.113 lacks what test_deleted and config_weakened read
   (Lens.needsReimport). Its transcript is parsed again into the same session, which keeps its id, name, specification
   and verdicts: from the text kept at import, or from the file picked again. A file that does not look like this
   session, or verdicts that would no longer match a finding, are asked about first. */
export async function reimport() {
  const sid = state.current,
    s = curS();
  if (!s) return;
  // the text kept at import has no subagents in it, nor Cursor's files before and after an edit: they are read when
  // the file is picked (0.1.127)
  // (only for an import before 0.1.127: a later one has read the file already, with what it had)
  const fromFile = (s.importGen || 0) < 9 && (Lens.subagentsMissing(s) || Lens.cursorEditsMissing(s));
  let text = fromFile ? null : s.source_text,
    cursorOutputs = s.source_outputs,
    cursorEdits = s.source_edits,
    cursorProject = s.source_project,
    cursorId = s.source_cursor_id,
    cursorUsage = null,
    fromLog = false;
  if (!text) {
    const source = await chooseDialog(T("reimport_pick"), [
      { label: T("pick_source_claude"), value: "claude", primary: true },
      { label: T("pick_source_codex"), value: "codex" },
      { label: T("pick_source_cursor"), value: "cursor" },
      { label: T("pick_source_other"), value: "other" },
    ]);
    if (source === null) return;
    const r = await pickTranscript(source);
    if (!r) return;
    text = r.text;
    cursorOutputs = r.cursorOutputs;
    cursorEdits = r.cursorEdits;
    cursorProject = r.cursorProject;
    cursorId = r.cursorId || cursorId;
    cursorUsage = r.cursorUsage || null;
  }
  // a Cursor session: what the Cursor hook logged of its chat meanwhile (0.1.130), over what was kept at import
  if (cursorId && window.__slCursorLog) {
    const log = await window.__slCursorLog(cursorId);
    if (log && Array.isArray(log.outputs) && log.outputs.length) [cursorOutputs, fromLog] = [log.outputs, true];
    if (log && Array.isArray(log.edits) && log.edits.length) [cursorEdits, fromLog] = [log.edits, true];
    if (log && log.usage) cursorUsage = log.usage;
  }
  const cfg = Lens.profile(s.profile);
  // a file with several conversations: the one closest to this session
  const events = Lens.pickConversation(s.events, Lens.importAny(text, cfg, { cursorOutputs, cursorEdits, cursorProject }));
  if (!events) {
    await alertDialog(T("no_events"));
    return;
  }
  const match = Lens.transcriptMatch(s.events, events);
  if (match < 0.8 && !(await confirmDialog(T("reimport_other", { p: Math.round(match * 100) })))) return;
  await needEngine(s.profile);
  // the verdicts that match a finding now and would not after the new import
  const keys = (x) => new Set([...(x.findings || []), ...(x.calibHidden || [])].map(fkey).filter((k) => s.verdicts[k]));
  const gen = state.gens[sid];
  // a copy of the verdicts: the trial analysis moves them to the new findings (carryVerdicts), and Cancel keeps them
  const trial = Object.assign({}, s, { events, seg: null, findings: s.findings.filter((f) => f.source === "ai"), verdicts: Object.assign({}, s.verdicts) });
  analyzeNow(trial);
  state.gens[sid] = gen;
  // a verdict is lost when no finding of the new import has it, under its old key or the one it moved to (0.1.127)
  const kept = new Set([...(trial.findings || []), ...(trial.calibHidden || [])].map((f) => trial.verdicts[fkey(f)]).filter(Boolean));
  const lost = [...keys(s)].filter((k) => !kept.has(s.verdicts[k])).length;
  if (lost && !(await confirmDialog(T("reimport_lost", { n: lost })))) return;
  await updateSession(sid, (x) => {
    x.events = events;
    x.seg = null;
    x.seg_error = null;
    x.seg_raw = null;
    // a kept text without the subagents is replaced, or dropped when the new one is too long to keep (0.1.127)
    if (fromFile && text.length >= 400000) delete x.source_text;
    else if ((!x.source_text || fromFile) && text.length < 400000) {
      x.source_text = text;
      x.source_outputs = keptOutputs(cursorOutputs);
      x.source_edits = keptEdits(cursorEdits);
      x.source_project = cursorProject;
    }
    // what the hook logged is kept with the text, so Back to regex parsing reads it too (0.1.130)
    if (fromLog && x.source_text) {
      x.source_outputs = keptOutputs(cursorOutputs);
      x.source_edits = keptEdits(cursorEdits);
    }
    if (cursorId) x.source_cursor_id = cursorId;
    const usage = Lens.usageOf(text, { cursorUsage }); // the text kept, or the file picked again
    if (usage) x.usage = usage;
    Object.assign(x, Lens.transcriptOrigin(text, { cursorProject })); // a session imported before 0.1.124 has neither
    x.importGen = Lens.IMPORT_GEN;
    analyze(x, "import");
  });
  if (state.current === sid) renderReview();
}

// ---------- review ----------
// 3462455 → "3.5M", 18404 → "18k", 950 → "950"
export function compact(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return +(v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return +(v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return Math.round(v / 1e3) + "k";
  return String(Math.round(v));
}
// the tokens in full, on hover: how much the cache gave, how much was written to it, the requests, the models
export function usageTip(u) {
  const pct = u.input ? Math.round((100 * (u.cached || 0)) / u.input) : 0;
  return [
    T("m_tokens_in", { n: (u.input || 0).toLocaleString("en-US"), p: pct }),
    u.cacheWrite ? T("m_tokens_write", { n: u.cacheWrite.toLocaleString("en-US") }) : "",
    T("m_tokens_out", { n: (u.output || 0).toLocaleString("en-US") }),
    Number.isInteger(u.requests) ? T("m_tokens_req", { n: u.requests }) : "",
    u.models && u.models.length ? T("m_tokens_models", { m: u.models.join(", ") }) : "",
    // no prices yet: where to put them (0.1.130)
    Object.keys(prices()).length ? "" : T("m_cost_hint"),
  ]
    .filter(Boolean)
    .join("\n");
}
// the person's prices per million tokens (sessionlens.tokenPrices, read only), 0.1.130
const prices = () => (state.settings && state.settings.tokenPrices) || {};
// 12.4 → "12.40", 0.004 → "<0.01", 1234.5 → "1,235": the money is the person's own, so no sign
export function money(v) {
  if (v < 0.01) return "<0.01";
  return v >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2);
}
/* The cost with the person's prices, or null when they have set none, or the session has no tokens per model (one
   imported before 0.1.130): { text, tip } for the metrics and the report */
export function sessionCost(s) {
  if (!s.usage || !Object.keys(prices()).length) return null;
  const c = Lens.usageCost(s.usage, prices());
  if (!c) return null;
  if (c.cost === null) return { text: "—", tip: T("m_cost_missing", { m: c.missing.map((m) => m || T("m_cost_nomodel")).join(", ") }), cost: null };
  // what the person called their prices ("API equivalent" on a subscription) goes with the number
  const label = (c.labels || []).join(", ");
  return { text: "≈ " + money(c.cost) + (label ? ` (${label})` : ""), tip: T("m_cost_tip"), cost: c.cost, label };
}
// a window of a subscription's limit by its length: 300 → "5 h", 10080 → "week"
const windowName = (min) => (min === 10080 ? T("m_limit_week") : min % 60 === 0 ? T("m_limit_hours", { n: min / 60 }) : T("m_limit_minutes", { n: min }));
/* What the session used of its subscription's limits (Codex writes them, 0.1.130), or null: { text, tip } for the
   metrics, md for the report */
export function sessionLimits(s) {
  const l = s.usage && s.usage.limits;
  if (!l || !Array.isArray(l.windows) || !l.windows.length) return null;
  const part = (w) => `+${w.used}% ${windowName(w.minutes)}` + (w.spans > 1 ? " " + T("m_limit_spans", { n: w.spans }) : "");
  const tipOf = (w) =>
    w.spans > 1
      ? T("m_limit_tip_spans", { w: windowName(w.minutes), u: w.used, n: w.spans })
      : T("m_limit_tip_one", { w: windowName(w.minutes), u: w.used, a: w.from, b: w.to });
  return {
    text: l.windows.map(part).join(" · "),
    tip: [T("m_limit_head", { p: l.plan || "?" }), ...l.windows.map(tipOf), T("m_limit_others")].join("\n"),
    md: T("md_limits", { list: l.windows.map(part).join(", "), p: l.plan || "?" }),
  };
}

export function renderReview() {
  const s = curS();
  $("#review-empty").hidden = !!s;
  $("#review").hidden = !s;
  if (!s) return;
  const v = Lens.verdict(s.findings),
    m = s.metrics || Lens.metrics(s.events, Lens.profile(s.profile));
  const runs = s.events.filter((e) => e.kind === "run_tests" && e.tests),
    last = runs[runs.length - 1];
  $("#hdr").style.setProperty("--v", VCOL[v]);
  const unv = !Lens.isValidated(s.profile, profileVerdicts(s.profile));
  $("#hdr").innerHTML =
    `<h1>${esc(Lens.displayName(s))}<span class="badge">${esc(VLABEL[v])}</span></h1><div class="m">${esc(Lens.otherName(s))} · <span class="pi-hdr" title="${esc(profileSummary(Lens.profileInfo(s.profile, piDeps(s.profile))))}">${esc(s.profile)}</span> · ${esc(T("events", { n: s.events.length }))} · ${T("hdr_result")}: ${last ? esc(T("passed_failed", { p: last.tests.passed, f: last.tests.failed })) : T("no_runs")}</div>${unv ? `<span class="warn">${esc(T("unverified", { p: s.profile, n: Lens.UNVERIFIED_MIN }))}</span>` : ""}`;
  $("#metrics").innerHTML = [
    `${T("m_reads")} <b>${esc(m.reads)}</b>`,
    `${T("m_edits")} <b>${esc(m.edits)}</b>`,
    `Read:Edit <b>${esc(m.readEdit ?? "—")}</b>${m.readEdit !== null && m.readEdit < 1 ? " ⚠" : ""}`,
    `${T("m_runs")} <b>${esc(m.runs)}</b>`,
    `${T("m_to_green")} <b>${esc(m.editsToGreen ?? "—")}</b>`,
    // the session's tokens (0.1.130), when its transcript had them
    s.usage
      ? `<span title="${esc(usageTip(s.usage))}">${T("m_tokens")} <b>${esc(T("m_tokens_val", { in: compact(s.usage.input), out: compact(s.usage.output) }))}</b></span>`
      : "",
    // and their cost, with the person's prices (0.1.130)
    ((c) => (c ? `<span title="${esc(c.tip)}">${T("m_cost")} <b>${esc(c.text)}</b></span>` : ""))(sessionCost(s)),
    // the share of a subscription's limits the session used (Codex, 0.1.130)
    ((l) => (l ? `<span title="${esc(l.tip)}">${T("m_limits")} <b>${esc(l.text)}</b></span>` : ""))(sessionLimits(s)),
  ]
    .filter(Boolean)
    .map((x) => `<span>${x}</span>`)
    .join("");
  $("#reimport").hidden = !Lens.needsReimport(s);
  const toolCode = s.events.some((e) => e.file && e.new_content);
  $("#seg-hint").textContent = !s.seg && !toolCode && s.events.some((e) => e.kind === "message") ? T("seg_hint_chat") : "";
  $("#seg-status").textContent = s.seg ? segStatus(s) : s.seg_error ? T("seg_fallback", { msg: s.seg_error }) : T("seg_none");
  $("#seg-status").className = s.seg_error ? "err" : "muted";
  $("#seg-extra").hidden = !s.seg;
  $("#seg-spec").hidden = !(s.seg && s.seg.spec_suggested);
  $("#seg-reset").hidden = !s.source_text;
  $("#spec").value = s.spec || "";
  // offered only while the session has no specification: the person's own one is never replaced
  const offers = (s.spec || "").trim() ? [] : LensSpec.offers(s.events).slice(0, 3);
  $("#spec-offer").hidden = !offers.length;
  $("#spec-offer").innerHTML = offers
    .map(
      (o, i) =>
        `<div class="row actions"><span class="muted">${esc(T(o.kind === "plan" ? "spec_offer_plan" : "spec_offer_cases", { f: o.file, n: o.n }))}</span>` +
        `<button class="btn tiny" data-offer="${i}">${esc(T("spec_offer_use"))}</button></div>`,
    )
    .join("");
  $("#spec-count").textContent =
    s.specParsed && s.specParsed.n
      ? T("spec_count", { n: s.specParsed.n, oos: s.specParsed.oos ? T("spec_oos", { n: s.specParsed.oos }) : "" }) +
        (s.specParsed.hasIds ? "" : T("spec_auto"))
      : (s.spec || "").trim()
        ? T("spec_unparsed")
        : T("spec_none");
  $("#spec-d").open = !s.spec;
  renderCoverage(s);
  $("#ai-status").textContent = s.ai_at
    ? T("ai_last", { at: s.ai_at.slice(0, 16).replace("T", " ") }) +
      (s.ai_truncated ? T("ai_truncated") : "") +
      (s.ai_verify_error ? " · " + s.ai_verify_error : "")
    : "";
  $("#ai-verify-again").hidden = !s.ai_verify_error;
  $("#lint-note").textContent = s.lintNote || "";
  $("#mark-reviewed").textContent = s.reviewed ? T("reviewed_on") : T("mark_reviewed");
  $("#mark-reviewed").classList.toggle("on", !!s.reviewed);
  $("#suppressed").textContent =
    s.suppressed && s.suppressed.length
      ? T("suppressed", { list: s.suppressed.map((x) => `${x.check} (${srcLabel(x.source)}, ${Math.round(x.precision * 100)}% / ${x.n})`).join(", ") })
      : "";
  const F = state.filter;
  const srcOf = (f) => (f.source === "ai" ? "ai" : f.source === "spec" ? "spec" : f.source === "lint" ? "lint" : "formal");
  // sources toggle independently, like severities: turning one on must not hide the rest
  const visible = s.findings.filter((f) => F.src[srcOf(f)] !== false && F.sev[f.severity] && (!F.undecided || !s.verdicts[fkey(f)]));
  $("#f-count").textContent = visible.length === s.findings.length ? `(${s.findings.length})` : T("f_of", { v: visible.length, n: s.findings.length });
  const cnt = { all: s.findings.length };
  for (const k of ["formal", "lint", "spec", "ai"]) cnt[k] = s.findings.filter((f) => srcOf(f) === k).length;
  const present = ["formal", "lint", "spec", "ai"].filter((k) => cnt[k]);
  const allOn = present.every((k) => F.src[k] !== false);
  $("#filter").innerHTML =
    `<button class="chip ${allOn ? "on" : ""}" data-src="all">${T("chip_all")} ${esc(cnt.all)}</button>` +
    present
      .map(
        (k) =>
          `<button class="chip ${F.src[k] !== false ? "on" : ""}" data-src="${esc(k)}">${esc({ formal: T("chip_formal"), lint: T("chip_lint"), spec: T("chip_spec"), ai: T("chip_ai") }[k] || k)} ${esc(cnt[k])}</button>`,
      )
      .join("") +
    `<span class="sep"></span>` +
    LensChecks.SEVERITIES.map((sv) => `<button class="chip sev-${esc(sv)} ${F.sev[sv] ? "on" : ""}" data-sev="${esc(sv)}">${esc(SEV[sv])}</button>`).join("") +
    `<button class="chip ${F.undecided ? "on" : ""}" data-und="1">${T("chip_undecided")}</button>`;
  $("#filter")
    .querySelectorAll("[data-src]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.dataset.src;
        if (k === "all")
          present.forEach((x) => (F.src[x] = true)); // "all" is a reset, never a way to hide everything
        else {
          const toggled = F.src[k] === false; // false → on, otherwise off
          const anyLeft = present.some((x) => (x === k ? toggled : F.src[x] !== false));
          if (anyLeft) F.src[k] = toggled;
          else present.forEach((x) => (F.src[x] = true)); // never leave an empty list: reset instead
        }
        renderReview();
      }),
    );
  $("#filter")
    .querySelectorAll("[data-sev]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        F.sev[b.dataset.sev] = !F.sev[b.dataset.sev];
        renderReview();
      }),
    );
  $("#filter")
    .querySelector("[data-und]")
    .addEventListener("click", () => {
      F.undecided = !F.undecided;
      renderReview();
    });
  // 0.1.117: a lint finding is tagged with the engine that ran in this session's profile; the filter and the
  // Calibration table say "lint", since there the sessions of all profiles meet. The Python engine is two (0.1.129):
  // a Ruff rule's finding says "ruff"
  const engine = {
    eslint: "eslint",
    "eslint-cypress": "eslint",
    "eslint-detox": "eslint",
    "tree-sitter": "tree-sitter",
    "tree-sitter-ruff": "tree-sitter",
    "robot-parser": "robot",
  }[Lens.profileInfo(s.profile, piDeps(s.profile)).engine.kind];
  const tagLabel = (src, f) => (src === "lint" && engine ? (/^ruff\//.test(f.rule || "") ? "ruff" : engine) : srcLabel(src));
  const fl = $("#findings");
  fl.innerHTML = visible.length
    ? visible
        .map((f) => {
          const k = fkey(f),
            vd = s.verdicts[k] || {};
          const ai = f.source === "ai",
            sp = f.source === "spec",
            src = f.source || "formal";
          return `<div class="f ${esc(f.severity)} ${vd.v ? "done" : ""} ${ai ? "ai" : ""} ${sp ? "spec" : ""}" data-k="${esc(k)}"><div class="sev ${esc(f.severity)}">${esc(SEV[f.severity] || f.severity)} <span class="srctag ${esc(src)}">${esc(tagLabel(src, f))}</span>${f.demoted ? ` <span class="demoted">${T("demoted")}</span>` : ""}${f.trial ? ` <span class="demoted" title="${esc(T("trial_hint"))}">${T("trial")}</span>` : ""}</div><div class="msg">${esc(f.message)}</div>${f.evidence ? `<div class="chk">«${esc(f.evidence)}»</div>` : ""}${f.code ? `<details class="snip-d"><summary>${T("code_toggle")}</summary><pre class="snip">${esc(f.code)}</pre></details>` : ""}<div class="chk">${ai ? esc(LABEL[f.check] || f.check) : esc(f.check)}${f.seq >= 0 ? ` · <a href="#e${esc(f.seq)}">seq ${esc(f.seq)}</a>` : ""}</div>
        <div class="vb"><button class="btn tiny ghost v-ok ${vd.v === "ok" ? "on" : ""}">${T("btn_ok")}</button><button class="btn tiny ghost v-fp ${vd.v === "fp" ? "on fp" : ""}">${T("btn_fp")}</button><input class="note" placeholder="${T("ph_note")}" value="${esc(vd.note || "")}"></div></div>`;
        })
        .join("")
    : `<div class="empty">${s.findings.length ? T("empty_filter") : T("empty_findings")}</div>`;
  fl.querySelectorAll(".f").forEach((d) => {
    const k = d.dataset.k;
    d.querySelector(".v-ok").addEventListener("click", () => setVerdict(k, "ok", d.querySelector(".note").value));
    d.querySelector(".v-fp").addEventListener("click", () => setVerdict(k, "fp", d.querySelector(".note").value));
    d.querySelector(".note").addEventListener("change", (e) => {
      if (s.verdicts[k]) setVerdict(k, s.verdicts[k].v, e.target.value);
    });
  });
  fl.querySelectorAll("a[href^='#e']").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const t = document.getElementById(a.getAttribute("href").slice(1));
      if (t) {
        t.closest("details").open = true;
        t.scrollIntoView({ block: "center" });
        t.classList.add("flag");
      }
    }),
  );
  renderRaw(s);
  const dr = s.dropped || [];
  const dups = dr.filter((f) => f.duplicate).length;
  $("#dropped-d").hidden = !dr.length;
  $("#dropped-count").textContent = dups ? T("dropped_count_dup", { n: dr.length, d: dups }) : `(${dr.length})`;
  $("#dropped").innerHTML =
    `<div class="dropped">${dr.map((f, i) => `<p data-i="${esc(i)}"><b>${esc(LABEL[f.check] || f.check)}</b>: ${esc(f.message)} — <i>${esc(f.why || T("not_proven"))}</i>${f.model_why ? `<br><span class="muted">${T("model_said")}: ${esc(f.model_why)}</span>` : ""} <button class="btn tiny ghost drop-restore">${T("dropped_restore")}</button></p>`).join("")}</div>`;
  $("#dropped")
    .querySelectorAll(".drop-restore")
    .forEach((b) =>
      b.addEventListener("click", async () => {
        const i = +b.closest("p").dataset.i;
        if (!curS()) return;
        await updateSession(state.current, (cur) => {
          const dropped = cur.dropped || [];
          const f = dropped[i];
          if (!f) return;
          const { why, model_why, duplicate, restored, ...clean } = f;
          cur.findings = Lens.sortFindings([...cur.findings, clean]);
          dropped.splice(i, 1);
          cur.dropped = dropped;
        });
        renderReview();
      }),
    );
  const flagged = new Set(s.findings.map((f) => f.seq));
  const ph = {};
  Lens.phases(s.events).forEach((p) => (ph[p.start] = p.name));
  const names = { plan: T("ph_plan"), code: T("ph_code"), run: T("ph_run") };
  $("#timeline").innerHTML = s.events
    .map((e) => {
      const fail = e.tests && (e.tests.failed || e.tests.errors);
      let extra = e.tests ? ` — ${T("passed_failed", { p: e.tests.passed, f: e.tests.failed })}` : "";
      if (e.assert_delta && (e.assert_delta.weakened.length || e.assert_delta.removed.length)) extra += " — ⚠ " + T("asserts").toLowerCase();
      return (
        (ph[e.seq] ? `<li class="ph">${esc(names[ph[e.seq]])}</li>` : "") +
        `<li id="e${esc(e.seq)}" class="${esc(e.kind)}${fail ? " fail" : ""}${flagged.has(e.seq) ? " flag" : ""}"><span class="seq">${esc(e.seq)}</span><span class="k">${esc(e.kind)}</span> ${esc(e.file || e.cmd || "")}${esc(extra)}${["message", "user"].includes(e.kind) ? `<span class="t">${esc(String(e.text || "").slice(0, 1000))}</span>` : ""}</li>`
      );
    })
    .join("");
  const deltas = s.events.filter((e) => e.assert_delta);
  $("#asserts").innerHTML = deltas.length
    ? `<table><tr>${T("asserts_hdr")
        .map((h) => `<th>${esc(h)}</th>`)
        .join("")}</tr>${deltas
        .map((e) => {
          const d = e.assert_delta;
          const w = d.weakened
            .map((x) => `${x.test}: ${x.reason}`)
            .concat(d.removed.map((r) => `${r.test}: ${r.before}→${r.after}`))
            .join("; ");
          return `<tr><td>${esc(e.seq)}</td><td>${esc(e.file)}</td><td>${esc(d.old)}</td><td>${esc(d.new)}</td><td>${d.identical ? `<span class="muted">${T("identical")}</span>` : esc(w) || `<span class="muted">${T("no_weak")}</span>`}</td></tr>`;
        })
        .join("")}</table>`
    : `<p class="muted">${T("no_compare", { tail: s.events.filter((e) => e.new_content).length ? T("code_once") : T("no_code") })}</p>`;
  // the tests that assert through a page object's expect…() methods, and how many assertions each method has (0.1.127)
  const po = Lens.poAssertions(s.events, Lens.profile(s.profile));
  if (po.length)
    $("#asserts").innerHTML += `<h4>${T("po_asserts")}</h4><table><tr>${T("po_asserts_hdr")
      .map((h) => `<th>${esc(h)}</th>`)
      .join("")}</tr>${po
      .map(
        (x) =>
          `<tr><td>${esc(x.file)}: ${esc(x.test)}</td><td>${esc(x.own)}</td><td>${x.calls
            .map((c) => (c.asserts == null ? `${esc(c.method)}: <span class="muted">${T("po_unknown")}</span>` : `${esc(c.method)}: ${esc(c.asserts)}`))
            .join(", ")}</td></tr>`,
      )
      .join("")}</table>`;
  const msgs = s.events.filter((e) => ["message", "user"].includes(e.kind));
  $("#transcript").innerHTML = msgs.length
    ? msgs
        .map((x) => `<p class="${x.kind === "user" ? "u" : ""}"><b>${x.kind === "user" ? T("user") : T("agent")}</b> (seq ${esc(x.seq)})<br>${esc(x.text)}</p>`)
        .join("")
    : `<p class="muted">${T("no_msgs")}</p>`;
}

export function renderRaw(s) {
  const d = $("#raw-d");
  if (!state.settings.debugModel) {
    d.hidden = true;
    return;
  }
  const lintDump =
    (s.lintLog && s.lintLog.length) || (s.lintWhy && s.lintWhy.length)
      ? "=== ESLint ===\n" + (s.lintLog || []).join("\n") + ((s.lintWhy || []).length ? "\n-- errors --\n" + s.lintWhy.join("\n") : "")
      : null;
  const segDump = s.seg_raw ? `=== ${T("seg_failed_hdr")}: ${s.seg_error || ""} ===\n${s.seg_raw}` : s.seg && s.seg.raw;
  const parts = [lintDump, segDump, s.ai_raw].filter(Boolean);
  if (!parts.length) {
    d.hidden = true;
    return;
  }
  const all = parts.join("\n\n\n");
  d.hidden = false;
  $("#raw-count").textContent = s.ai_error || s.seg_error ? T("raw_error") : T("raw_size", { n: all.length });
  $("#raw").value = all;
}

export function renderCoverage(s) {
  const c = s.coverage,
    el = $("#coverage");
  if (!c) {
    el.innerHTML = s.spec ? `<p class="muted">${T((s.events || []).some((e) => e.new_content) ? "no_readable_tests" : "no_code")}</p>` : "";
    return;
  }
  const spec = LensSpec.parse(s.spec);
  /* 0.1.125: requirements without IDs (R1, R2… numbered by the parser) cannot be named by a test, so their coverage is
     not checked and no spec finding is made (LensSpec.checks). Until then the table showed every one as "none" in red,
     with every test under "No requirement reference", and nothing said why: a pasted code review taken for the spec
     looked like a spec nothing covered, while the high no_spec was gone. Now it says so, and an empty cell is no
     failure. A coverage stored before 0.1.121 has no hasIds and reads as one with IDs, as it did. */
  const ids = c.hasIds !== false;
  el.innerHTML = `${ids ? "" : `<p class="muted">${T("cov_no_ids")}</p>`}<table class="cov"><tr><th>ID</th><th>${T("cov_requirement")}</th><th>${T("cov_tests")}</th></tr>${spec.requirements
    .map((r) => {
      const t = c.covered[r.id] || [];
      const cell = t.length ? ["yes", esc(t.join(", "))] : ids ? ["no", T("md_none")] : ["", "—"];
      return `<tr><td>${esc(r.id)}</td><td>${esc(r.text.slice(0, 70))}</td><td class="${cell[0]}">${cell[1]}</td></tr>`;
    })
    .join("")}</table>${ids && c.unlinked.length ? `<p class="muted">${T("cov_unlinked")}: ${esc(c.unlinked.map((t) => t.name).join(", "))}</p>` : ""}`;
}

export async function setVerdict(k, v, note) {
  const vd = { v, note: note || "", at: new Date().toISOString() };
  await updateSession(state.current, (s) => {
    s.verdicts[k] = vd;
  });
  renderReview();
}

export function segStatus(s) {
  const g = s.seg,
    spec = g.spec_suggested ? T("seg_spec") : "";
  return g.chunks
    ? T("seg_status_chunks", { n: g.n, c: Math.round(g.coverage * 100), ok: g.chunks.ok, total: g.chunks.ok + g.chunks.failed, spec })
    : T("seg_status", { n: g.n, c: Math.round(g.coverage * 100), spec });
}
