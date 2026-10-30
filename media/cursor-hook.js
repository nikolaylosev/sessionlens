/* Generated from src/hook by `npm run build` (scripts/build-webview.js). Do not edit: change src/hook. */
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// media/i18n.js
var require_i18n = __commonJS({
  "media/i18n.js"(exports2, module2) {
    (function(root, factory) {
      if (typeof module2 === "object" && module2.exports) module2.exports = factory();
      else root.I18N = factory();
    })(typeof self !== "undefined" ? self : exports2, function() {
      "use strict";
      const D = {
        en: {
          // ---- findings ----
          peeked: "Read {file} before the plan was approved — product code is off-limits during generation",
          pass_no_run: "Claims tests pass, but no test run in the preceding steps",
          pass_red: "Claims tests pass while the last run was {passed} passed / {failed} failed",
          pass_after_edit: "Claims tests pass, but {file} changed at seq {seq}, after the last run, and nothing ran since",
          weakened: "{file}: {test} — assertion weakened ({reason})",
          removed: "{file}: {test} — fewer assertions ({before} → {after})",
          weak_assert: "{file}: weak assertion “{line}” — checks “didn't crash”, not a value",
          weak_assert_once: "{file}: “{line}” reads the page once — it never waits or retries; use a web-first assertion, await expect(locator).toBeVisible()",
          fix_no_triage: "Edited {file} right after a failure (seq {seq}) with no triage: product bug / test bug / spec defect",
          fix_cause_only: "Edited {file} right after a failure (seq {seq}): the cause is named, but not whose error it is — product bug / test bug / spec defect",
          scope: "Edited {file}, which is not in the plan",
          churn: "{file}: {n} edits for one request — poking instead of understanding",
          sleep: "{file}: fixed delay (sleep) in a test",
          skip: "{file}: skip / retry added",
          focused: "{file}: focused test “{line}” — only it runs, the rest of the suite is silently skipped",
          debug_leftover: "{file}: debugging left in the test “{line}”",
          test_deleted_msg: "{file}: {n} {n|test|tests} deleted: {names}{after}",
          test_file_deleted_msg: "{file}: test file deleted{after}",
          after_red_run: " — right after a failing run (seq {seq})",
          product_edited: "{file}: product code changed in a testing task{after}",
          snapshot_cmd: "Snapshots updated: {cmd}{after}",
          snapshot_file: "{file}: snapshot written by hand{after}",
          config_weakened_msg: "{file}: test config loosened — {what}{after}",
          cw_change: "{key} {from} → {to}",
          cw_added: "{key} {to} added",
          cw_set: "{key} {to}",
          cw_excluded: "tests excluded “{line}”",
          cw_ignored: "failures ignored or tests skipped “{line}”",
          assumption: "Assumption instead of a question: “{snippet}”",
          no_plan: "Code written without a plan",
          no_approval: "Plan produced, but no stop and approval — straight to code",
          never_run: "Tests written in {n} {n|message|messages}, never executed — a hypothesis about tests, not tests",
          browser_unasserted_one: "Checked the page in the browser after the last test change (seq {first}); no test asserts what it saw",
          browser_unasserted: "Checked the page in the browser {n} times after the last test change (seq {first}–{last}); no test asserts what it saw",
          hard_date: "{file}: date in an assertion “{line}” — will go red when content changes",
          networkidle: "{file}: waitUntil: 'networkidle' on a live site — a flakiness source (Playwright advises against it)",
          cypress_async_hook: "{file}: async Cypress hook “{line}” — Cypress queues its commands, so an async hook runs out of order",
          networkidle_wait: "{file}: waits for 'networkidle' on a live site — a flakiness source (Playwright advises against it)",
          exact_count: "{file}: exact element count in an assertion — brittle when content changes",
          magic: "{file}: {test} — unexplained numbers in assertions: {nums} (Magic Number)",
          roulette: "{file}: {test} — {n} assertions without messages: on failure you can't tell which one (Assertion Roulette)",
          conditional: "{file}: {test} — branching/loop inside the test “{line}”: more than one path under test (Conditional Test Logic)",
          dup_assert: "{file}: {test} — identical assertion repeated: “{line}” (Duplicate Assert)",
          frustration: "User frustration signal: “{text}” — the agent misunderstood the task a step earlier",
          repeat: "User repeated the same request: “{text}”",
          expected_failure: "{file}: {n} {n|test|tests} marked as an expected failure — the suite reports green while the bug {n|it documents|they document} is open",
          r_expected_failure: "An expected failure hides a live bug behind a green suite. Report the bug first and say in the test which ticket keeps it red.",
          no_spec: "No specification: impossible to tell which checks are requirements and which are the agent's guesses",
          uncovered: "Requirement {id} has no test: “{text}”",
          unlinked: "Test {name} references no requirement — what does it check?",
          oos: "There is a test for something explicitly out of scope: “{text}”",
          in_msg: "code in message",
          in_msgs: "code in messages (version {v})",
          // ---- rules ----
          r_peeked: "Product code stays closed until the plan is approved. Missing information is a spec defect: ask, don't peek at the implementation.",
          r_pass: "Never say “tests pass” without running the test runner immediately before. Paste the full output.",
          r_weakened: "Do not weaken existing assertions (== → in, concrete value → ANY / is not None, removing checks). A failing assertion calls for triage, not an edit.",
          r_weak: "Assert only concrete values from the specification. “Didn't crash”, “not empty”, “status < 500” are forbidden.",
          r_triage: "After a test fails, do not edit it. First three hypotheses: product bug / test bug / spec defect — then wait for a decision.",
          r_scope: "Change only files from the approved plan. Need another file — say so first.",
          r_churn: "More than three edits to one file — stop and explain what is unclear instead of trying again.",
          r_sleep: "No sleep with a constant and no skip / retry. Wait only via wait_until() from helpers.",
          r_config: "Don't loosen the test runner's config to get green: no more retries, no longer timeouts, no excluded tests. A flaky or slow test is a finding to report.",
          r_snapshot: "Don't update snapshots to make a failing test pass. A snapshot diff is a finding: show it, say whether the change is intended, and update only after the user agrees.",
          r_product_edited: "In a testing task, do not change the product code. A failing test is a finding: report it as a possible product bug and wait — a quiet fix hides it.",
          r_test_deleted: "Never delete a test or a test file to make the suite pass. A failing test calls for triage; removing one needs the user's explicit agreement.",
          r_focused: "Never leave .only / fit / fdescribe in a test. Only the focused test runs, the rest of the suite is silently skipped, and the run stays green.",
          r_debug_leftover: "Remove debugging calls before you finish: page.pause(), cy.pause(), cy.debug(), debugger, breakpoint(). They stop the run locally and hang or do nothing in CI.",
          r_cypress_async: "Don't use async/await in Cypress tests and hooks. Cypress queues its commands, so an async test can finish before they run. Chain the commands instead.",
          r_assume: "Don't write “I assume” / “let's say”. If the spec doesn't define behaviour, ask and stop.",
          r_plan: "After the plan — stop and wait for approval. Code only after an explicit “ok”.",
          r_browser: "A look at the page in the browser is a step towards a test, not the result. What you confirm by hand goes into a test as an assertion, and the test runs.",
          r_never_run: "Don't present tests as done until they have been run. No environment to run them — say so and mark the code as a draft.",
          r_date: "Don't assert concrete dates or changing content. Assert a pattern or move the value to config.",
          r_wait: "Don't make a test depend on timing or page internals: no waitUntil: 'networkidle', exact element counts, force: true, element handles, eval or waits without a timeout. Wait for and act on a specific element, as a user would.",
          r_magic: "Numbers in assertions come only from the spec, with a comment or a named constant.",
          r_roulette: "More than two assertions in a test — give each a message saying what it checks.",
          r_cond: "No if/for inside a test. One test — one path; variants via parametrisation.",
          r_dup: "Don't repeat the same assertion. Different input — different test.",
          r_frustration: "If the user corrected you — restate the task in your own words and wait for confirmation before continuing.",
          r_raw_locator: "Locate by role, label or exact text. A CSS selector is a guess about markup and breaks on the next redesign.",
          r_positional_locator: "Do not select by position (.first(), .nth()). Narrow the locator until it matches one element.",
          r_icon_glyph: "Do not locate by an icon font's character (a code such as \\uE9CC, from Unicode's Private Use Area). It says nothing about the element and changes with the icon font. Use the element's accessible name, an aria-label, a title or a test id.",
          r_no_spec: "Don't start without a specification. Ask for requirements or draft them and get them approved.",
          r_uncovered: "Every spec requirement — at least one test with its ID in the docstring.",
          r_unlinked: "Every test references a requirement ID. No requirement — either a spec defect or a redundant test.",
          r_oos: "Anything marked “out of scope” is not tested in this task.",
          r_ai: "Semantic finding from the model — write the rule from the evidence below.",
          r_ai_other: "The model's finding did not fit any review category — read its explanation and decide whether a rule is needed.",
          r_lint_valid_title: "Give every test a real title: a non-empty string that says which behaviour it checks — not a variable, not a copy of another test's title.",
          // ---- ai labels / errors ----
          ai_purpose: "test purpose",
          ai_coverage: "spec coverage",
          ai_fragility: "fragility",
          ai_missing: "missing case",
          ai_questions: "question instead of assumption",
          ai_fix_justification: "fix justification",
          ai_spec_defect: "spec defect",
          what_review: "review",
          review_per_file: "one request per file, {n} {n|file|files}",
          ai_other: "off-task (model ignored the categories)",
          what_verify: "verification",
          what_segmentation: "segmentation",
          err_daily_quota: "Daily quota for this model is used up — it resets at midnight Pacific. Switch to a model with a higher daily limit (gemini-3.1-flash-lite) or a local one. {msg}",
          err_refusal: "The model did not do the task ({what}) — it replied with a refusal or prose. A small local model often needs a smaller prompt: lower the code limit in Settings, or use a bigger model. Reply starts: “{head}”",
          err_no_key: "No API key — enter it in Settings",
          err_no_array: "No JSON array in the model reply ({what}). Reply starts: “{head}”",
          err_bad_json: "JSON in the model reply doesn't parse: {msg}; lenient parsing found nothing either ({what})",
          err_not_array: "Model reply is not an array",
          err_empty: "Gemini returned empty text (finishReason {reason}) — try another model or a smaller code limit",
          err_max_tokens: "Gemini reply cut by the token limit — lower the code limit in the prompt or use a model with a bigger window",
          verify_unparsed: "verification reply not parsed — all findings kept",
          verify_failed: "verification not performed: {msg}",
          not_grounded: "quote not found in the materials",
          no_verdict: "no verdict",
          not_proven: "not proven",
          s_gap: "Minimum gap between requests, ms",
          s_gap_hint: "free Gemini tiers allow about 10 requests a minute — 6500 keeps you under it",
          s_baseurl: "Server URL",
          s_baseurl_hint: "Ollama: http://localhost:11434/v1 · LM Studio: http://localhost:1234/v1",
          s_baseurl_hint_qwen: "International: https://dashscope-intl.aliyuncs.com/compatible-mode/v1 · mainland China: https://dashscope.aliyuncs.com/compatible-mode/v1 · the key must belong to the same region",
          s_baseurl_cancelled: "The address was not confirmed, so the model was not added.",
          s_baseurl_failed: "Could not save the address: {msg}",
          local_title: "Local sessions",
          local_scan: "Rescan",
          local_watch: "watch for changes",
          local_scanning: "scanning…",
          local_empty: "no transcripts found",
          repo_pick: "Repository for the full toolchain",
          lint_profile: "static analysis: none for this profile",
          lint_missing: "static analysis: bundle not loaded",
          lint_loading: "static analysis: engine loading…",
          lint_nocode: "static analysis: no code in the session",
          lint_errors: " · {n} {n|block|blocks} failed to parse",
          lint_more: "(+{n} more of the same in this file)",
          lint_ran: "{engine}: {n} {n|finding|findings} in {b} {b|block|blocks}{e}",
          lint_csp: "ESLint blocked by the extension security policy — remove the extension in chrome://extensions and load the folder again (a stale vendor-eslint.js is cached)",
          lint_failed: "{engine} could not parse any code block ({n} in all) — regex checks kept. First error: {why}",
          lint_on: "Static analysis",
          lint_off: "off",
          req_segment: "=== REQUEST: segmentation ({provider} / {model}) ===",
          seg_run: "Segment with model",
          seg_none: "regex parsing",
          seg_model: "model segmentation",
          seg_status: "segmented: {n} {n|block|blocks}, {c}% of lines covered{spec}",
          seg_spec: " · spec found",
          seg_wait: "segmenting…",
          seg_fallback: "segmentation failed ({msg}) — regex parsing kept",
          seg_hint_chat: "No code was written by tools in this session — the code lives in the messages, which is exactly where segmentation helps.",
          seg_nothing: "no messages to segment",
          seg_chunked: "message by message: {ok} done, {failed} left to the regex parser",
          seg_all_chunks_failed: "the model segmented none of the {n} messages — regex parsing kept",
          seg_status_chunks: "segmented: {n} {n|block|blocks}, {c}% of lines covered · {ok}/{total} messages{spec}",
          seg_failed_hdr: "SEGMENTATION FAILED",
          seg_use_spec: "Use the found specification",
          seg_reset: "Back to regex parsing",
          reimport_msg: "Imported with an older version of SessionLens, which read some steps differently: deleted tests, loosened runner configs, a Codex session's file changes, a command that only lists the tests, a weakened assertion's text, a Cursor session's browser and other MCP tools, a file edited with a $ in its new code, the assertions of a page object, a Claude Code session's subagents and Playwright's test agents, a file a shell command wrote, text Claude Code, Codex or Cursor put into your messages, or a diff in the agent's message. Import the transcript again to check; the session keeps its name, specification and verdicts.",
          reimport_go: "Import again",
          reimport_pick: "Pick the transcript of this session. Where is it?",
          reimport_other: "This file does not look like this session: {p}% of its steps are in it. Replace the session's steps with it anyway?",
          reimport_lost: "{n} {n|verdict|verdicts} would no longer match a finding: the steps are numbered differently now. Import again anyway?",
          req_review: "=== REQUEST: review ({provider} / {model}) ===",
          req_verify: "=== REQUEST: verification ({provider} / {model}) ===",
          req_compress: "=== REQUEST: compress rules.md ({provider} / {model}) ===",
          req_generate_skill: "=== REQUEST: generate skill ({provider} / {model}) ===",
          resp: "=== RESPONSE ===",
          call_error: "(call error: {msg})",
          // ---- app ----
          verdict_red: "Red",
          verdict_yellow: "Yellow",
          verdict_green: "Green",
          no_events: "Could not recognise any event. Supported: Claude Code, Codex and Cursor Agent JSONL, a Cursor Agent CLI stream-json log, claude.ai conversations.json, /export, chat text.",
          unread_tools: "This file has tool calls in a format SessionLens does not read, so only the conversation text was found: no files, edits or test runs to review. Import the text anyway?",
          many_convs: "The file has {n} conversations. Part of a name to load only that one (empty — all):",
          no_sessions: "No sessions yet.",
          events: "{n} {n|event|events}",
          findings_n: "findings",
          verdicts_n: "verdicts",
          spec_n: "spec {n} req.",
          code_toggle: "code",
          hdr_result: "result",
          no_runs: "no test runs",
          passed_failed: "{p} passed / {f} failed",
          unverified: "Profile {p} is not yet validated on real sessions (fewer than {n} verdicts) — treat code findings as hints",
          m_reads: "reads",
          m_edits: "edits",
          m_runs: "runs",
          m_tokens: "tokens",
          m_tokens_val: "{in} in · {out} out",
          m_tokens_in: "{n} input tokens, {p}% of them read from the cache",
          m_tokens_write: "{n} written to the cache",
          m_tokens_out: "{n} output tokens",
          m_tokens_req: "{n} {n|request|requests} to the model",
          m_tokens_models: "model: {m}",
          md_tokens: "Tokens: {in} in ({p}% from the cache), {out} out{req}.",
          m_cost: "cost",
          m_cost_tip: "With your prices per million tokens (sessionlens.tokenPrices), in their money",
          m_cost_missing: "No price for: {m}. Add it to sessionlens.tokenPrices in settings.json",
          m_cost_nomodel: "replies that name no model",
          m_cost_hint: "Cost: put your prices per million tokens in sessionlens.tokenPrices (settings.json)",
          md_cost: "Cost: {c}, with your prices per million tokens.",
          m_limits: "limits",
          m_limit_week: "week",
          m_limit_hours: "{n} h",
          m_limit_minutes: "{n} min",
          m_limit_spans: "({n} windows)",
          m_limit_head: "The share of the subscription's limits used while this session ran (Codex, {p} plan):",
          m_limit_tip_one: "{w} window: +{u}% ({a}% → {b}%)",
          m_limit_tip_spans: "{w} windows: {u}% of a window in all, over {n} windows that reset while it ran",
          m_limit_others: "Other sessions running at the same time count too.",
          md_limits: "Subscription limits used: {list} (Codex, {p} plan).",
          m_to_green: "edits to green",
          spec_none: "(none)",
          spec_offer_plan: "The agent saved a test plan, {f}: {n} {n|scenario|scenarios}.",
          spec_offer_cases: "The agent wrote test cases, {f}: {n} with IDs.",
          spec_offer_use: "Use as specification",
          spec_auto: " · numbered automatically, coverage not checked",
          spec_unparsed: "(text given, no requirements recognised — number them or use R1., R2.)",
          spec_count: "({n} {n|requirement|requirements}{oos})",
          spec_oos: ", {n} out of scope",
          ai_last: "last run {at}",
          ai_truncated: " · code was truncated",
          suppressed: "Disabled for low precision: {list}",
          f_of: "({v} of {n})",
          chip_all: "all",
          chip_formal: "regex",
          chip_spec: "spec",
          chip_ai: "model",
          chip_lint: "lint",
          chip_undecided: "no verdict",
          src_gherkin: "gherkin",
          src_external: "imported",
          demoted: "demoted for precision",
          trial: "new check, on trial",
          trial_hint: "A new check: its findings are shown as low until it has 10 verdicts. Mark them True or False: with 10, it gets its own severity, or calibration demotes it or switches it off.",
          btn_ok: "Confirm",
          btn_fp: "False",
          ph_note: "comment",
          empty_filter: "Nothing matches the filter.",
          empty_findings: "Formal checks found nothing. That doesn't mean the session is good — skim the timeline.",
          raw_error: "(last call failed)",
          raw_size: "({n} chars: every prompt and reply of this session)",
          copied: "Copied",
          copy: "Copy",
          ph_plan: "Plan",
          ph_code: "Code",
          ph_run: "Run and triage",
          asserts_hdr: ["seq", "compared", "before", "after", "weakened"],
          identical: "versions identical",
          no_weak: "no weakening",
          po_asserts: "Assertions through page objects",
          po_asserts_hdr: ["test", "own", "page object methods (assertions in each)"],
          po_unknown: "not in this session",
          no_compare: "Nothing to compare: the diff needs two versions of one file — Write→Edit in Claude Code JSONL, or two code versions with the same tests in chat messages. {tail}",
          code_once: "Code appears once in this session.",
          no_code: "No code found in this session.",
          cov_requirement: "requirement",
          cov_tests: "tests",
          cov_unlinked: "No requirement reference",
          cov_no_ids: "These requirements have no IDs, so no test can name one: their coverage is not checked, and no finding is made about it. To check it, number them R1., R2. … and name the ID in each test's title or in a comment above it.",
          no_readable_tests: "Coverage is not computed: SessionLens cannot find tests in the files of this session for this profile. The profile's details under Profile list the file types it reads.",
          user: "User",
          agent: "Agent",
          no_msgs: "No messages.",
          ai_status: "model: {n} {n|finding|findings}{dropped}{repaired}{err}",
          ai_dropped: ", {n} dropped by verification",
          ai_repaired: " · JSON was repaired",
          ai_wait: "calling the model…",
          ai_wait_verify: "calling the model, then verifying…",
          error: "error: ",
          ai_verify_again: "Verify again",
          ai_reverify_wait: "verifying again…",
          ai_reverify_status: "verification: {n} kept{dropped}",
          export_block: "{n} high {n|finding has|findings have} no verdict. Mark “Confirm” or “False” — only reviewed findings go into the PR report.",
          md_title: "## Session review: {t}",
          md_verdict: "**Verdict:** {v} · profile {p} · reads {r}, edits {e}, Read:Edit {re}, runs {runs}, edits to green {g}",
          md_spec: "**Specification:** {n} {n|requirement|requirements}{unc}",
          md_unc: ", untested: {list}",
          md_none: "none",
          md_no_spec: "**Specification:** not provided",
          md_bad: "**Not like this** — from the sessions:",
          md_good: "**Like this:**",
          md_confirmed: "### Confirmed findings",
          md_false: "### Rejected as false",
          md_undecided: "### No verdict (medium/low)",
          md_hidden: "### Hidden by calibration (low precision)",
          md_hidden_why: "precision {p}% over {n} {n|verdict|verdicts}",
          md_hidden_rest: "- and {n} medium or low {n|finding|findings}",
          md_copied: "Copied to clipboard",
          md_btn: "PR report (.md)",
          del_confirm: "Delete the session and its verdicts?",
          prec_hdr: ["check", "source", "total", "confirmed", "false", "precision", "status"],
          prec_empty: "No sessions of your own yet. The demo session's verdicts do not count here: they are about a made-up session.",
          st_off: "disabled",
          st_demoted: "demoted",
          st_need: "need {n} more",
          st_trial: "on trial, low: need {n} more",
          st_ok: "ok",
          st_not_calibrated: "not calibrated",
          st_why_ai: "The model's precision depends on the model and the prompt, not on the check, so calibration never switches it off. Untick the category on the Rules tab if you need to.",
          st_why_fact: "A fact, not a guess: calibration never switches it off.",
          st_why_external: "Imported findings are not calibrated.",
          st_why_kept: "Missing one costs more than a false alarm, so calibration never switches this check off or demotes it. Untick it on the Rules tab if you need to.",
          st_by_hand: "on by hand",
          st_by_hand_hint: "Calibration would switch it off (precision {p}%), but you ticked it on on the Rules tab, so it stays on.",
          rule_hdr: "{k} — {n} confirmed in {s} {s|session|sessions}",
          applied: "moved to {f} on",
          applied_at_title: "The day the rule went into {f}. Sessions the agent ran from that day on count as after. Change it if the rule was there earlier.",
          mark_applied: "Moved to {f}",
          rule_del_confirm: "Remove this rule from the {f} proposal list? Confirmed findings and verdicts are kept.",
          gen_result_del_confirm: "Delete this generated result? This cannot be undone.",
          gen_dup_msg: "The picked rules are the same as the last generation — nothing new to add. Overwrite that result, or create a new one anyway?",
          gen_dup_overwrite: "Overwrite last",
          gen_dup_new: "Create new",
          pick_source_msg: "Where is the transcript from? This decides where the file dialog opens — ~/.claude, ~/.codex and ~/.cursor are dot-folders a file dialog otherwise hides, and there's no way to browse from one into another.",
          pick_source_claude: "Claude Code",
          pick_source_codex: "Codex",
          pick_source_cursor: "Cursor Agent",
          pick_source_other: "Somewhere else",
          pick_failed: "Could not open the transcript: {e}. If SessionLens was updated a moment ago, reload the window (Command Palette → Developer: Reload Window) and try again.",
          eff_no_after: "effect: before {b} per session ({n}); no sessions after yet",
          eff: "effect: before {b} per session ({nb} {nb|session|sessions}) → after {a} ({na}){d}{few}",
          eff_few: " · little data",
          eff_late: " · {n} {n|session|sessions} imported after the move ran before it: if the rule was already there, change the date",
          eff_before: "before",
          eff_after: "after",
          no_rules: "No confirmed findings repeated often enough yet. Confirm findings in the Review tab.",
          pick_lbl: "Include in export:",
          pick_all: "All",
          pick_none: "None",
          dismissed_note: "{n} {n|rule|rules} hidden via Delete — {n|it stays|they stay} hidden until restored, even for new sessions.",
          rules_restore: "Restore hidden rules",
          rules_restore_confirm: "Restore every rule hidden via Delete? They'll reappear above once they meet the count threshold again.",
          unmark_applied: "Unmark",
          unmark_applied_confirm: 'Clear the "moved to {f}" mark for this rule? The before/after effect comparison restarts from now.',
          rules_title: "# Proposed rules for {f}",
          rules_rule: "**Rule:**",
          rules_ev: "Evidence:",
          ev_summary: "Evidence",
          rules_copied: "Copied",
          rules_copy: "Copy rules.md",
          rules_none: "_none_",
          compress_run: "Compress rules.md",
          compress_result: "Compressed rules.md",
          compress_dl: "Download .md",
          compress_wait: "compressing…",
          compress_none: "Nothing to compress yet — confirm findings first.",
          gen_skill_run: "Generate skill",
          gen_skill_result: "Generated skill",
          gen_skill_wait: "generating skill…",
          gen_skill_note: "examples/ (optional): real files the agent wrote in your sessions, exactly as written except for masked secrets. Check them before you share the skill.",
          gen_skill_stub_title: "Suggested CLAUDE.md / AGENTS.md text",
          gen_skill_stub_title_cursor: "Suggested .cursor/rules/sessionlens.mdc",
          gen_skill_stub_note_cursor: "Save this as .cursor/rules/sessionlens.mdc in the project. With alwaysApply: true, Cursor's Agent (in the editor and in the CLI) reads it in every chat of that project.",
          gen_skill_stub_note: "Keep {f} thin: instead of pasting the rules into each one, add this one line to every entry-point file you use. Claude Code, Codex and Cursor read it as a plain instruction, so one shared file works for all of them — no vendor-specific skills folder required.",
          gen_skill_save: "Save to folder…",
          gen_skill_saved: "Saved to {p}",
          gen_skill_saved_files: "Downloaded each file separately.",
          imp_not_json: "not JSON",
          imp_not_array: "expected an array of findings",
          imp_done: "verdicts merged: {m}, external findings added: {e}",
          imp_dup: " · {n} {n|row|rows} already imported, skipped",
          saved: "saved",
          key_label: "API key — {p}",
          key_saved: "saved ✓",
          key_not_set: "not set",
          key_keep_ph: "saved — leave empty to keep it",
          key_delete: "Delete key",
          key_delete_confirm: "Delete the saved API key for {p}? Its models stay in the list but will not work until a key is entered again.",
          key_deleted: "Key deleted.",
          key_save_failed: "Could not save the key: {msg}",
          err_timeout: "No reply within {s} s, the request was stopped.",
          err_local_remote: "This editor window is remote ({where}): the request to {url} goes out from the remote machine, so localhost there is that machine, not yours.",
          model_default: "default {m}",
          local_model_hint: " — this is likely not enough for useful findings; Qwen2.5-Coder-32B (Qwen2.5-32B) or Qwen2.5-72B is the recommended minimum.",
          // ---- html ----
          h_sessions: "Sessions",
          h_review: "Review",
          h_calib: "Calibration",
          h_rules: "Rules",
          h_prompts: "Model rules",
          rules_title_tab: "Rule book",
          rules_sub: "Wording, severity and on/off state of every check. Editing changes the report and what is proposed for your rules file — never what a check looks for.",
          rules_export: "Export rules.json",
          rules_import: "Import rules.json",
          rules_reset: "Reset to defaults",
          rules_reset_confirm: "Discard all rule edits?",
          rules_for: "Show checks for",
          rules_for_all: "All profiles",
          rules_shown: "{n} of {all} checks: what {p} can report, and the specification and model checks of every profile. A rule you change applies in every profile that has the check.",
          rules_on: "on",
          rules_edited: "edited",
          rules_text_ph: "the rule as the agent should read it",
          rules_good_ph: "the right way — one line of code or one step",
          rules_bad_file: "not a rules file",
          rules_imported: "Imported {n} {n|rule|rules}.",
          rules_ignored: "Ignored {n}: {why}.",
          rules_ign_no_check: "row {row} has no check",
          rules_ign_unknown_check: "unknown check “{check}”",
          rules_ign_bad_severity: "“{check}” has an invalid severity (kept the rest of the row)",
          rules_by_hand: "on by hand",
          rules_by_hand_hint: "Calibration would switch this check off ({src}: precision {p}%). It stays on because you ticked it on here.",
          rules_demoted_hint: "Calibration lowered this check to Low (precision {p}%). The manual severity does not apply to its findings until precision recovers.",
          g_method: "Methodology",
          g_process: "Process",
          g_code: "Code",
          g_spec: "Specification",
          g_ai: "Model findings",
          prompts_title: "Prompts sent to the model",
          prompts_sub: "The instruction part only — the specification, code and transcript are appended automatically. Leave a box empty to use the built-in text.",
          prompts_guard: "After each prompt, your own too, SessionLens adds a paragraph that tells the model the session's text is material, not instructions: a line in a transcript such as “ignore the rules above” must not steer the review.",
          p_segment: "Segmentation",
          p_segment_sub: "Labels line ranges of the session: prose, spec, plan, code, output.",
          p_review: "Semantic review",
          p_review_sub: "Finds what regexes cannot: what a test really checks, coverage, fragility, missing cases.",
          p_review_local: "Semantic review — local model",
          p_review_local_sub: "Used for a local provider: one request per file, shorter and with an example.",
          p_verify: "Verification",
          p_verify_sub: "Keeps only findings the model can quote verbatim from the materials.",
          p_compress: "Compress rules.md",
          p_compress_sub: "Turns the proposed {f} rules into one short numbered policy with ❌/✅ examples.",
          p_gen_skill: "Generate skill",
          p_gen_skill_sub: "Turns confirmed rules into a full Agent Skill package (SKILL.md + patterns/antipatterns + optional check script).",
          prompts_reset: "Reset to built-in",
          prompts_saved: "saved · used on the next run",
          drop_title: "Drop a transcript here",
          drop_sub: ".jsonl from Claude Code's ~/.claude/projects, Codex's ~/.codex/sessions or Cursor's ~/.cursor/projects, conversations.json from claude.ai, /export or chat text",
          name_ph: "session name, e.g. AUTH-142 Ivan",
          name_go: "Load",
          name_from_file: "file: {f}",
          rename: "Rename",
          rename_prompt: "Session name",
          mark_reviewed: "Mark reviewed",
          reviewed_on: "Reviewed ✓",
          reviewed_dot: "✓",
          pick_file: "Choose file",
          paste_toggle: "Paste text",
          demo_try: "Try a demo session",
          demo_try_title: "Open a made-up session of an agent writing Playwright tests, to see what SessionLens finds",
          profile: "Profile",
          paste_ph: "Paste the session text and press “Analyse”",
          paste_name_ph: "name, e.g. AUTH-142 Ivan",
          parse: "Analyse",
          review_empty: "Pick a session in the Sessions tab or load a new one.",
          spec_sum: "Specification",
          spec_ph: "Requirements with IDs (R1. …, AUTH-142/R3 …), an “Out of scope” section. Without a spec the first finding is “no specification”.",
          spec_file: "From file",
          spec_save: "Save and recompute",
          ai_run: "Semantic review (model)",
          findings: "Findings",
          raw_sum: "Model request and reply",
          raw_dl: "Download .txt",
          dropped_sum: "Dropped by verification",
          dropped_restore: "Restore",
          timeline: "Timeline",
          asserts: "Assertions",
          transcript: "Transcript",
          export_json: "Report .json",
          delete: "Delete",
          c_prec: "Check precision",
          c_prec_sub: "From reviewer verdicts, per check and source. ≥10 verdicts and precision <50% — the check is demoted to low; <30% — disabled. Never disabled: the model's findings, a missing specification and uncovered requirements, hardcoded secrets, and a check you tick on by hand on the Rules tab.",
          c_rules: "Rules for {f}",
          c_rules_sub1: "From confirmed findings repeated ≥",
          c_rules_sub2: "times. Mark “moved” and the tool shows whether the finding's frequency dropped afterwards.",
          rules_target_lbl: "Target file:",
          rules_target_claude: "CLAUDE.md (Claude Code)",
          rules_target_codex: "AGENTS.md (Codex, Cursor and other agents that read it)",
          rules_target_cursor: ".cursor/rules/sessionlens.mdc (Cursor)",
          rules_target_both: "Both — CLAUDE.md and AGENTS.md",
          c_export: "Export verdicts.json",
          c_import: "Import verdicts / findings",
          s_model: "Models",
          s_sub: "The key is stored only in this browser and sent directly to the chosen provider's API. Requests run on your account.",
          s_models_add: "Add a model",
          s_models_add_btn: "Add model",
          s_models_empty: "No models configured yet — add one below.",
          s_models_default: "default",
          s_models_set_default: "Make default",
          s_models_remove: "Remove",
          s_models_remove_confirm: "Remove this model? Any request routed to it will fall back to the default model.",
          s_models_key_missing_err: "Enter an API key for {p} first.",
          s_models_none: "no model configured",
          s_model_alias: "Label (optional)",
          s_provider: "Provider",
          s_key: "API key",
          s_model_lbl: "Model",
          s_maxcode: "Code limit in the prompt, characters",
          s_verify: "Verification call: keep only findings backed by a quote from the materials (second request, twice the cost, noticeably more precise)",
          s_save: "Save",
          s_schema: "Findings format",
          s_schema_sub: 'Open schema: {check, severity, seq, message, evidence?, source, verdict?}. External findings (another tool, Code Review) are imported in the Calibration tab as a JSON array with a session field and take part in calibration as source: "external".',
          s_hide_demo: "Hide the “Try a demo session” button",
          s_hide_demo_sub: "Applies at once. A demo session you already opened stays in the Sessions list until you delete it; turn this off to get the button back.",
          s_debug_model: "Debug model",
          s_debug_model_sub: "Shows the exact prompt sent to the model and its raw reply — in a session (below Transcript) and on the Calibration tab. Off by default. Turn it on only when you need to check what the model was actually asked and answered; the prompts include the session code and transcript excerpts that were sent.",
          s_danger: "Danger zone",
          s_danger_sub: 'Deletes every session and all calibration history (confirmed findings, "moved" marks, hidden rules). Settings and rule wording in the Rules tab are kept.',
          s_reset_all: "Delete everything",
          s_reset_all_confirm: "Delete all sessions and all calibration history? This cannot be undone.",
          s_reset_all_done: "Done — everything cleared.",
          unverified_opt: " (unvalidated)",
          // ---- phase 7: what a profile checks (under the Profile list) ----
          "profile_desc_qa-ts": "Playwright, Jest, Vitest, TypeScript / JavaScript",
          "profile_desc_qa-cypress": "Cypress, TypeScript / JavaScript",
          "profile_desc_qa-detox": "Detox, TypeScript / JavaScript",
          "profile_desc_qa-python": "Python",
          "profile_desc_qa-java": "Java / Kotlin",
          "profile_desc_qa-c#": "C#",
          "profile_desc_qa-api": "API tests in any language, Karate, Postman",
          "profile_desc_qa-mobile": "Appium in Python, Java, Kotlin, TS / JS, C#",
          "profile_desc_qa-robot": "Robot Framework",
          "profile_desc_qa-generic": "any language, process checks",
          pi_details: "What this profile checks",
          pi_files: "Files:",
          pi_any_file: "any file",
          pi_runners: "Test runs recognised by:",
          pi_engine: "Static analysis:",
          pi_eng_eslint: "ESLint",
          "pi_eng_eslint-cypress": "ESLint with the Cypress plugin",
          "pi_eng_eslint-detox": "ESLint with the Detox plugin",
          "pi_eng_tree-sitter": "tree-sitter",
          "pi_eng_tree-sitter-ruff": "tree-sitter and Ruff",
          "pi_eng_robot-parser": "built-in Robot Framework parser",
          pi_eng_none: "none for this profile",
          pi_eng_files: "{ext} files",
          pi_on: "on",
          pi_off: "off in ⚙ Settings",
          pi_spec: "Specification coverage:",
          pi_spec_all: "all its file types",
          pi_spec_none: "not supported",
          pi_spec_not: "not for {list}",
          pi_asserts: "Assertions compared before and after an edit:",
          pi_yes: "yes",
          pi_no: "no",
          pi_calib: "Calibration:",
          pi_validated: "validated",
          pi_validated_builtin: "validated (built in)",
          pi_unvalidated: "unvalidated: {n} of {min} verdicts",
          pi_unvalidated_short: "unvalidated",
          pi_gherkin: ".feature files are checked in every profile (Gherkin checks below).",
          pi_off_rules: "off in Rules",
          pi_engine_only: "needs static analysis",
          pi_s_checks: "{n} checks",
          pi_s_noengine: "no static analysis",
          pi_s_spec: "spec coverage",
          pi_s_nospec: "no spec coverage",
          g_api: "API",
          r_status_only: "Assert the body, not just the status. A test that checks only “200” also passes on an empty response or an error page. Check the fields, their types and the headers that matter.",
          r_mocked: "Do not mock the API under test. Call the real service (or a real test instance); mock only its downstream dependencies, and say so in the test.",
          r_test_shadowed: "Give every test a name of its own. In Python a second def with the same name replaces the first: pytest collects only the last one, so the first test never runs, and nothing says so.",
          r_empty_result: "An empty result proves something only when the same call can return something. Next to a test that expects nothing, keep one where the same query, filter or endpoint returns at least one item: else a broken query, a wrong filter or an empty test database passes too.",
          empty_result: "{file}: {test} — expects an empty result ({line}), and no test of the file expects one that is not: a broken query or filter would pass it too",
          r_secret: "No tokens, keys or passwords in test code. Read them from environment variables or a secrets store: a repository is not a safe.",
          r_base_url: "No hard-coded hosts. Take the base URL from configuration or an environment variable, so the same test runs on local and staging and never lands on production by accident.",
          r_no_negative: "Cover the unhappy paths: missing or invalid auth (401/403), bad input (400/422), unknown id (404), conflicts (409). A suite of only 2xx tests proves the API accepts good requests, not that it rejects bad ones.",
          r_no_cleanup: "A test that creates data removes it: teardown, a fixture with cleanup, or a DELETE at the end. Otherwise repeated runs collide and pollute the environment.",
          r_resp_time: "Do not assert response time in functional tests. Time limits fail on a busy CI runner; measure performance in a separate performance test.",
          status_only: "{file}: {test} — asserts only the status code; the body, headers and schema are not checked",
          mocked_api: "{file}: HTTP calls are mocked ({what}) — make sure the API under test is real; mock only its downstream dependencies",
          secret_found: "{file}: credential in the code — {kind}: “{masked}”",
          base_url: "{file}: hard-coded host {host} — take the base URL from configuration",
          no_negative: "{n} API {n|test|tests} written, none checks an error response (401/403/404/400/422) — only the happy path is covered",
          no_cleanup: "{file}: creates data ({what}) but never removes it — repeated runs will collide",
          resp_time: "{file}: {test} — asserts response time ({line}); this fails on a slow CI runner",
          g_mobile: "Mobile (Appium)",
          r_mobile_raw_locator: "Locate by accessibility id or resource-id, not XPath or class name. Screen layouts and generated class names change often; a stable id does not.",
          r_hardcoded_coordinates: "Do not tap or swipe at literal screen coordinates. They break on a different screen size or resolution — act on the element itself, or its bounds, instead.",
          r_no_driver_teardown: "Close the driver session in a teardown (quit(), tearDown, [TearDown], afterEach) — an unclosed session leaks on the device/emulator and can starve later runs.",
          icon_glyph_msg: "{file}: {n} {n|locator|locators} by an icon font's character ({code}) — it changes with the font; use an accessible name, a title or a test id",
          mobile_raw_locator_msg: "{file}: {n} {n|locator|locators} by XPath/class name — an id or accessibility id survives layout changes",
          hardcoded_coordinates_msg: "{file}: tap/swipe at a literal screen coordinate — {line}",
          no_driver_teardown_msg: "{file}: creates a driver session with no matching quit()/teardown found",
          r_no_assertion_after_action: "Every test must check what happened. A test that clicks, taps, types or sends a request with no assertion anywhere in it verifies nothing — it only proves nothing crashed.",
          r_no_app_reset: "Reset app state between tests: beforeEach(() => device.reloadReactNative()) or device.launchApp({ newInstance: true }). Without it, one test's leftover state can make the next one flaky or order-dependent.",
          g_gherkin: "Gherkin (.feature)",
          r_outline_no_examples: "A Scenario Outline with no Examples table (or an empty one) never actually runs — it is a template with no data. Add at least one row.",
          r_scenario_no_then: "Every scenario needs at least one Then step. Given/When with no Then sets up and acts, but checks nothing.",
          r_bloated_background: "Keep Background to the handful of steps every scenario in the file truly needs. A long Background hides coupling between scenarios that look independent.",
          r_duplicate_step_text: "Two scenarios with the exact same steps are the same case written twice. Merge them, or turn them into one Scenario Outline with two rows in Examples.",
          g_robot: "Robot Framework",
          r_empty_test_case: "Give every test case at least one step. A test case with no steps at all is a stub — either fill it in or remove it; a stub in the suite reports nothing and looks passing by omission.",
          outline_no_examples_msg: "{file}: {scenario} — Scenario Outline with no Examples rows, so it never actually runs",
          scenario_no_then_msg: "{file}: {scenario} — no Then step: nothing in the scenario is actually verified",
          bloated_background_msg: "{file}: Background has {n} steps (> {max}) — a lot for every scenario in the file to share",
          duplicate_step_text_msg: "{file}: {n} scenarios share the exact same steps — {scenarios}",
          r_unannotated_test_method: 'A method that reads like a test (its name starts with "test", in a class named ...Test/Tests/IT) needs an actual @Test (or other JUnit/TestNG lifecycle) annotation. Without one, the runner silently never calls it — the suite stays green while this method never ran at all.',
          r_swallowed_exception: "Never leave a catch block empty (or with only a comment). If an exception is truly expected and safe to ignore, say so — log it, or fail the test with what it was — rather than letting it disappear silently.",
          r_assert_args_reversed: "Put the expected value first and the value under test second: assertEquals(expected, actual). The reverse still passes or fails correctly, but every failure message reads backwards, which wastes time triaging.",
          sk_jwt: "JWT",
          sk_bearer: "bearer token",
          sk_aws: "AWS access key",
          sk_key: "API key",
          sk_assign: "secret assigned in code",
          cli_note: "Uses your Claude plan through the Claude Code you already have installed. No API key. A review sends several requests, and all of them count against your plan's usage limits.",
          s_cli_path: "Claude Code command",
          s_cli_hint: "The path is the setting “sessionlens.claudeCliPath”; empty means “claude” is found automatically. Sign in once in a terminal with “claude auth login”.",
          s_cli_open_settings: "Open settings",
          model_hint_cli: "sonnet, opus or haiku always mean the latest model of that family. A full model name also works.",
          cli_check_btn: "Check Claude Code",
          cli_checking: "Checking…",
          cli_check_ok: "Claude Code {v} is installed and signed in{who}.",
          cli_check_nologin: "Claude Code {v} is installed but not signed in. Run “claude auth login” in a terminal.",
          cli_check_apikey: "ANTHROPIC_API_KEY is set in your environment, so Claude Code will bill that key instead of your plan.",
          cli_err_notfound: "Claude Code was not found (“{cmd}”). Install it, or set its full path in the setting “sessionlens.claudeCliPath”.",
          cli_err_auth: "Claude Code is not signed in. Run “claude auth login” in a terminal and try again.",
          cli_err_limit: "Your Claude usage limit is reached. Wait for it to reset and try again. ({msg})",
          cli_err_overloaded: "Claude is overloaded right now. Try again in a minute.",
          cli_err_model: "Claude Code does not accept the model “{model}”. Use sonnet, opus or haiku, or a full model name.",
          cli_err_timeout: "Claude Code did not answer in {s} s and was stopped.",
          cli_err_toobig: "The request is too large for Claude Code (over 10 MB). Lower the code limit in Settings.",
          cli_err_failed: "Claude Code failed: {msg}",
          cli_no_host: "The Claude Code provider works only in the editor extension of SessionLens (VS Code, Cursor).",
          cli_note_codex: "Uses your ChatGPT/Codex plan through the Codex CLI you already have installed. No API key. A review sends several requests, and all of them count against your plan's usage limits.",
          s_cli_path_codex: "Codex CLI command",
          s_cli_hint_codex: "The path is the setting “sessionlens.codexCliPath”; empty means “codex” is found automatically. Sign in once in a terminal with “codex login”.",
          model_hint_cli_codex: "Leave empty to use Codex's own default model. A full model name, such as gpt-5.1-codex, also works.",
          cli_check_btn_codex: "Check Codex CLI",
          cli_check_ok_codex: "Codex CLI {v} is installed and signed in{who}.",
          cli_check_nologin_codex: "Codex CLI {v} is installed but not signed in. Run “codex login” in a terminal.",
          cli_check_apikey_codex: "CODEX_API_KEY or OPENAI_API_KEY is set in your environment, so Codex may bill that key instead of your plan.",
          cli_err_notfound_codex: "Codex CLI was not found (“{cmd}”). Install it, or set its full path in the setting “sessionlens.codexCliPath”.",
          cli_err_auth_codex: "Codex CLI is not signed in. Run “codex login” in a terminal and try again.",
          cli_err_limit_codex: "Your Codex usage limit is reached. Wait for it to reset and try again. ({msg})",
          cli_err_overloaded_codex: "Codex is overloaded right now. Try again in a minute.",
          cli_err_model_codex: "Codex CLI does not accept the model “{model}”. Leave it empty for the default, or use a full model name.",
          cli_err_timeout_codex: "Codex CLI did not answer in {s} s and was stopped.",
          cli_err_toobig_codex: "The request is too large for Codex CLI (over 10 MB). Lower the code limit in Settings.",
          cli_err_failed_codex: "Codex CLI failed: {msg}",
          cli_no_host_codex: "The Codex provider works only in the editor extension of SessionLens (VS Code, Cursor).",
          cli_note_cursor: "Uses your Cursor plan through the Cursor Agent CLI you already have installed. No API key. A review sends several requests, and all of them count against your plan's usage limits. Cursor keeps a copy of each request in ~/.cursor; SessionLens deletes it after the answer.",
          s_cli_path_cursor: "Cursor Agent CLI command",
          s_cli_hint_cursor: "The path is the setting “sessionlens.cursorCliPath”; empty means “agent” in ~/.local/bin is found automatically. Install it with “curl https://cursor.com/install -fsS | bash” and sign in once in a terminal with “agent login”.",
          model_hint_cli_cursor: "Leave empty to use Cursor's own default (auto). A model name from “agent --list-models” also works.",
          cli_check_btn_cursor: "Check Cursor CLI",
          cli_check_ok_cursor: "Cursor CLI {v} is installed and signed in{who}.",
          cli_check_nologin_cursor: "Cursor CLI {v} is installed but not signed in. Run “agent login” in a terminal.",
          cli_check_apikey_cursor: "CURSOR_API_KEY is set in your environment, so Cursor CLI signs in with that key, which may be another account.",
          cli_err_notfound_cursor: "Cursor CLI was not found (“{cmd}”). Install it, or set its full path in the setting “sessionlens.cursorCliPath”.",
          cli_err_auth_cursor: "Cursor CLI is not signed in. Run “agent login” in a terminal and try again.",
          cli_err_limit_cursor: "Your Cursor usage limit is reached. Wait for it to reset and try again. ({msg})",
          cli_err_overloaded_cursor: "Cursor is overloaded right now. Try again in a minute.",
          cli_err_model_cursor: "Cursor CLI does not accept the model “{model}”. Leave it empty for the default, or use a name from “agent --list-models”.",
          cli_err_timeout_cursor: "Cursor CLI did not answer in {s} s and was stopped.",
          cli_err_toobig_cursor: "The request is too large for Cursor CLI (over 10 MB). Lower the code limit in Settings.",
          cli_err_failed_cursor: "Cursor CLI failed: {msg}",
          cli_no_host_cursor: "The Cursor provider works only in the editor extension of SessionLens (VS Code, Cursor).",
          // 0.1.116: what each model call sends, on its button (README, "Your data")
          send_seg: "Sends to the model: the session's steps as numbered lines, up to the code limit in ⚙ Settings, with secrets masked.",
          send_review: "Sends to the model: the specification, the regex findings, the test code the agent wrote (up to the code limit in ⚙ Settings) and a shortened transcript, with secrets masked. Verification sends the same plus the model's findings.",
          send_compress: "Sends to the model: the rules you picked, each with one line of code from your sessions and its evidence (session names, steps, your notes), with secrets masked. No whole files.",
          send_skill: "Sends to the model: the same as Compress rules.md, plus the names of the example files. Their content is not sent: it is written to the folder you pick, with secrets masked.",
          gen_skill_examples_lbl: "Add examples/ with the real files from the sessions (secrets are masked)",
          gen_examples_added: "examples/: {n} real {n|file|files} added, {r} {r|secret|secrets} masked.",
          gen_examples_none: "No full files were found for these rules (process rules and chat fragments have none), so no examples/ folder was added.",
          ex_readme_title: "# Examples from real sessions",
          ex_readme_body: "These are files the agent actually wrote in reviewed sessions, exactly as written except that secrets are replaced with [REDACTED]. They show what each antipattern looks like in real code. They are examples of what NOT to do: the fix is in references/patterns.md.",
          ex_col: "| File | Rule | Session | Seq | Finding |",
          ex_masked: "{n} {n|secret|secrets} masked",
          ex_truncated: "cut at {n} characters",
          s_routes: "Model per request",
          s_routes_sub: "Choose which of your configured models answers each kind of request. Add models above first — this list only offers to pick among them.",
          route_default: "Default ({m})",
          route_model_ph: "model: {m}",
          route_no_key: "no key saved",
          err_no_key_for: "No API key for {p} — enter it in Settings",
          cal_raw_note: "The latest requests made from this tab (Compress rules.md and Generate skill), newest first: the exact prompt sent and the model's reply, failed calls included. The last 6 are kept.",
          cal_raw_count: "({n} {n|request|requests})",
          cal_raw_clear: "Clear",
          cal_raw_clear_confirm: "Delete the saved requests and replies?",
          s_reset_settings: "Reset settings",
          s_reset_settings_sub: "Puts every setting on this page back to its default: theme, all configured models and their keys, the model per request, the local server and Qwen addresses, request pacing, code limit, static analysis, verification, the debug model toggle and the Hide the “Try a demo session” button checkbox. Your sessions, verdicts, rules and prompts are not touched, nor are the Claude Code, Codex and Cursor CLI paths (editor settings).",
          s_reset_settings_btn: "Reset settings to defaults",
          s_reset_settings_confirm: "Reset every setting on this page to its default? Saved API keys, models and per-request models will be removed. Sessions, verdicts, rules and prompts are kept.",
          s_reset_settings_done: "Settings reset to defaults.",
          err_empty_reply: "Empty Gemini reply",
          seg_err_empty: "the model returned an empty segmentation",
          seg_err_ranges: "no valid line ranges in the model reply",
          dlg_cancel: "Cancel",
          sev_high: "high",
          sev_medium: "medium",
          sev_low: "low"
        }
      };
      let lang = "en";
      function t(key, vars) {
        let s = (D[lang] && D[lang][key]) ?? D.en[key] ?? key;
        if (Array.isArray(s)) return s;
        if (vars) s = s.replace(/\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g, (m, k, one, other) => k in vars ? Number(vars[k]) === 1 ? one : other : m);
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.split("{" + k + "}").join(String(v));
        return s;
      }
      function set(l) {
        lang = D[l] ? l : "en";
      }
      function get() {
        return lang;
      }
      function apply(doc) {
        doc.querySelectorAll("[data-i18n]").forEach((el) => {
          el.textContent = t(el.dataset.i18n);
        });
        doc.querySelectorAll("[data-i18n-ph]").forEach((el) => {
          el.placeholder = t(el.dataset.i18nPh);
        });
        doc.querySelectorAll("[data-i18n-title]").forEach((el) => {
          el.title = t(el.dataset.i18nTitle);
        });
      }
      const has = (l, key) => !!(D[l] && Object.prototype.hasOwnProperty.call(D[l], key));
      return { t, set, get, apply, has, langs: Object.keys(D) };
    });
  }
});

// media/checks.js
var require_checks = __commonJS({
  "media/checks.js"(exports2, module2) {
    (function(root, factory) {
      if (typeof module2 === "object" && module2.exports) module2.exports = factory();
      else root.LensChecks = factory();
    })(typeof self !== "undefined" ? self : exports2, function() {
      "use strict";
      const SEVERITIES = ["high", "medium", "low"];
      const GROUPS_ORDER = ["method", "process", "code", "api", "mobile", "gherkin", "robot", "spec", "ai"];
      const CHECKS = {
        // ---- method ----
        peeked_at_src_before_plan: {
          group: "method",
          severity: "high",
          ruleKey: "r_peeked",
          good: "read specs/<ID>.md, write the plan, wait for approval; ask when the spec is silent",
          sources: ["regex"]
        },
        stop_markers_missing: {
          group: "method",
          severity: "medium",
          ruleKey: "r_plan",
          good: "plan as a table → stop → after “ok” write the code",
          sources: ["regex"]
        },
        // ---- process ----
        pass_claim_without_run: {
          group: "process",
          severity: "high",
          ruleKey: "r_pass",
          good: "run the suite and paste the output, then say what it means",
          sources: ["regex"]
        },
        fix_after_fail_without_triage: {
          group: "process",
          severity: "high",
          ruleKey: "r_triage",
          good: "state three hypotheses — product bug / test bug / spec defect — and wait",
          sources: ["regex"]
        },
        tests_never_run: {
          group: "process",
          severity: "high",
          ruleKey: "r_never_run",
          good: "run the tests, or say plainly that they are a draft nobody has executed",
          sources: ["regex"],
          sortPriority: -1
        },
        scope_creep: { group: "process", severity: "medium", ruleKey: "r_scope", good: "touch only the files listed in the approved plan", sources: ["regex"] },
        // 0.1.125: a look at the page through a browser MCP after the last test change, and no test after it
        browser_check_not_in_test: {
          group: "process",
          severity: "medium",
          ruleKey: "r_browser",
          good: "turn the look into an assertion: await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden()",
          sources: ["regex"]
        },
        edit_churn: {
          group: "process",
          severity: "medium",
          ruleKey: "r_churn",
          good: "after the third edit of one file, stop and say what is unclear",
          sources: ["regex"]
        },
        assumption_instead_of_question: {
          group: "process",
          severity: "medium",
          ruleKey: "r_assume",
          good: "ask: “the spec does not define X — which behaviour is correct?”",
          sources: ["regex"]
        },
        user_frustration: {
          group: "process",
          severity: "medium",
          ruleKey: "r_frustration",
          good: "restate the task in your own words and wait for confirmation",
          sources: ["regex"]
        },
        product_code_edited: {
          group: "process",
          severity: "high",
          ruleKey: "r_product_edited",
          good: "report it and wait: “R3 fails — the total ignores the discount. Product bug?”",
          sources: ["regex"]
        },
        snapshot_overwritten: {
          group: "process",
          severity: "high",
          ruleKey: "r_snapshot",
          good: "show the snapshot diff and ask: “the total moved under the table — intended?”; update only after a yes",
          sources: ["regex"]
        },
        config_weakened: {
          group: "process",
          severity: "high",
          ruleKey: "r_config",
          good: "keep retries: 0 and the timeouts; report “checkout.spec.ts times out at 30 s — slow backend or a real hang?”",
          sources: ["regex"]
        },
        // ---- code ----
        assert_weakened: { group: "code", severity: "high", ruleKey: "r_weakened", good: "keep the assertion and triage the failure instead", sources: ["regex"] },
        weak_assert: {
          group: "code",
          severity: "high",
          ruleKey: "r_weak",
          good: "expect(r.status()).toBe(423) and expect(body.reason).toBe('too_many_attempts')",
          sources: ["regex", "lint"]
        },
        sleep_or_skip_added: {
          group: "code",
          severity: "high",
          ruleKey: "r_sleep",
          good: "await expect(locator).toBeVisible() — wait for a condition, not for a number",
          sources: ["regex", "lint"]
        },
        hardcoded_date: {
          group: "code",
          severity: "medium",
          ruleKey: "r_date",
          good: "expect(text).toMatch(/Deadline .+ \\d{4}/) or read the date from config",
          sources: ["regex"]
        },
        fragile_wait: {
          group: "code",
          severity: "medium",
          ruleKey: "r_wait",
          good: "await page.getByRole('button', { name: 'Pay' }).click(); await expect(page.getByRole('heading', { name: 'Paid' })).toBeVisible()",
          sources: ["regex", "lint"]
        },
        expected_failure: {
          group: "code",
          severity: "medium",
          ruleKey: "r_expected_failure",
          good: "file the bug, then keep the test red with a comment naming the ticket",
          sources: ["regex"]
        },
        magic_number: {
          group: "code",
          severity: "low",
          ruleKey: "r_magic",
          good: "const MAX_ATTEMPTS = 5; expect(attempts).toBe(MAX_ATTEMPTS)",
          sources: ["regex"]
        },
        assertion_roulette: {
          group: "code",
          severity: "low",
          ruleKey: "r_roulette",
          good: "expect(status, 'lockout status').toBe(423)",
          sources: ["regex", "lint"]
          // lint: Ruff's PT018, `assert a and b` (0.1.129)
        },
        conditional_logic: {
          group: "code",
          severity: "low",
          ruleKey: "r_cond",
          good: "one test per path; use test.each / a loop over cases outside the test body",
          sources: ["regex", "lint"]
        },
        duplicate_assert: {
          group: "code",
          severity: "low",
          ruleKey: "r_dup",
          good: "assert once per fact; a second input deserves a second test",
          sources: ["regex"]
        },
        raw_locator: {
          group: "code",
          severity: "low",
          ruleKey: "r_raw_locator",
          good: "page.getByRole('link', { name: 'About us', exact: true })",
          sources: ["lint"]
        },
        positional_locator: {
          group: "code",
          severity: "low",
          ruleKey: "r_positional_locator",
          good: "page.getByRole('navigation').getByRole('link', { name: 'About us' })",
          sources: ["lint"]
        },
        // 0.1.127: a locator by an icon font's character, getByRole('link', { name: '\uE9CC' })
        icon_glyph_locator: {
          group: "code",
          severity: "low",
          ruleKey: "r_icon_glyph",
          good: "page.getByRole('link', { name: 'Search' }) — or the link's aria-label, title or a test id",
          sources: ["regex"]
        },
        no_assertion_after_action: {
          group: "code",
          severity: "high",
          ruleKey: "r_no_assertion_after_action",
          good: "await page.getByRole('button', { name: 'Pay' }).click(); await expect(page.getByText('Paid')).toBeVisible();",
          sources: ["lint"]
        },
        no_app_reset: {
          group: "code",
          severity: "medium",
          ruleKey: "r_no_app_reset",
          good: "beforeEach(async () => { await device.reloadReactNative(); });",
          sources: ["lint"]
        },
        unannotated_test_method: {
          group: "code",
          severity: "high",
          ruleKey: "r_unannotated_test_method",
          good: "@Test\npublic void shouldLogIn() { ... }",
          sources: ["lint"]
        },
        swallowed_exception: {
          group: "code",
          severity: "high",
          ruleKey: "r_swallowed_exception",
          good: 'catch (IOException e) { fail("unexpected: " + e.getMessage()); }',
          sources: ["lint"]
        },
        assert_args_reversed: {
          group: "code",
          severity: "medium",
          ruleKey: "r_assert_args_reversed",
          good: "assertEquals(200, actualStatus)  // expected first, actual second",
          sources: ["lint"]
        },
        lint_valid_title: {
          group: "code",
          severity: "low",
          ruleKey: "r_lint_valid_title",
          good: 'test("rejects a wrong password with an error banner", async ({ page }) => { ... })',
          sources: ["lint"]
        },
        focused_test: {
          group: "code",
          severity: "high",
          ruleKey: "r_focused",
          good: "test('total', async ({ page }) => { … }) — no .only, so the whole suite runs",
          sources: ["regex", "lint"]
        },
        debug_leftover: {
          group: "code",
          severity: "medium",
          ruleKey: "r_debug_leftover",
          good: "await expect(page.getByText('Total')).toBeVisible(); — no page.pause() or debugger left behind",
          sources: ["regex", "lint"]
        },
        cypress_async_test: {
          group: "code",
          severity: "medium",
          ruleKey: "r_cypress_async",
          good: "it('total', () => { cy.contains('Total').should('be.visible'); })",
          sources: ["regex", "lint"]
        },
        test_deleted: {
          group: "code",
          severity: "high",
          ruleKey: "r_test_deleted",
          good: "keep the failing test and triage it: product bug / test bug / spec defect",
          sources: ["regex"]
        },
        // never calibrated (decided 03.10): ten "False" verdicts must not hide a leaked token
        hardcoded_secret: {
          group: "code",
          severity: "high",
          ruleKey: "r_secret",
          good: "token = os.environ['API_TOKEN']",
          sources: ["regex"],
          calibrate: false
        },
        hardcoded_base_url: {
          group: "code",
          severity: "medium",
          ruleKey: "r_base_url",
          good: "BASE_URL = os.environ.get('BASE_URL', 'http://localhost:8080')",
          sources: ["regex"]
        },
        // Python: a second def test_x with the same name replaces the first, which then never runs (Ruff F811, 0.1.129)
        test_shadowed: {
          group: "code",
          severity: "high",
          ruleKey: "r_test_shadowed",
          good: "def test_create_order_rejects_empty_body(client): …  — a name of its own for every test",
          sources: ["lint"]
        },
        // an empty result with no test of the same file that expects one that is not empty (0.1.130)
        empty_result_unverified: {
          group: "code",
          severity: "medium",
          ruleKey: "r_empty_result",
          good: "assert len(search(status='paid')) > 0  # the same filter returns something, next to the test that expects []",
          sources: ["regex"],
          trial: true
        },
        // ---- api ----
        status_only_assert: {
          group: "api",
          severity: "medium",
          ruleKey: "r_status_only",
          good: "assert r.status_code == 201 and r.json()['id'] == payload['id']",
          sources: ["regex"]
        },
        mocked_service: {
          group: "api",
          severity: "medium",
          ruleKey: "r_mocked",
          good: "call the real service (or a real test instance); mock only its downstream dependencies",
          sources: ["regex"]
        },
        no_negative_cases: {
          group: "api",
          severity: "medium",
          ruleKey: "r_no_negative",
          good: "add: no token → 401, wrong role → 403, unknown id → 404, invalid body → 422",
          sources: ["regex"]
        },
        test_data_no_cleanup: {
          group: "api",
          severity: "low",
          ruleKey: "r_no_cleanup",
          good: "yield the created resource from a fixture and DELETE it after the test",
          sources: ["regex"]
        },
        response_time_assert: {
          group: "api",
          severity: "low",
          ruleKey: "r_resp_time",
          good: "assert the behaviour; keep latency budgets in a separate performance test",
          sources: ["regex"]
        },
        // ---- mobile ----
        mobile_raw_locator: {
          group: "mobile",
          severity: "low",
          ruleKey: "r_mobile_raw_locator",
          good: "driver.findElement(AppiumBy.accessibilityId('submit-button'))",
          sources: ["regex"]
        },
        hardcoded_coordinates: {
          group: "mobile",
          severity: "medium",
          ruleKey: "r_hardcoded_coordinates",
          good: "el.tap() or driver.perform(pointerActions on the element's own bounds)",
          sources: ["regex"]
        },
        no_driver_teardown: {
          group: "mobile",
          severity: "medium",
          ruleKey: "r_no_driver_teardown",
          good: "@AfterEach void tearDown() { driver.quit(); }",
          sources: ["regex"]
        },
        // ---- gherkin ----
        outline_no_examples: {
          group: "gherkin",
          severity: "high",
          ruleKey: "r_outline_no_examples",
          good: "Scenario Outline: … \n  Examples:\n    | user | role |\n    | ann  | admin |",
          sources: ["gherkin"]
        },
        scenario_no_then: {
          group: "gherkin",
          severity: "high",
          ruleKey: "r_scenario_no_then",
          good: "Then the user sees the order confirmation page",
          sources: ["gherkin"]
        },
        bloated_background: {
          group: "gherkin",
          severity: "medium",
          ruleKey: "r_bloated_background",
          good: "Background:\n  Given the user is logged in\n  # split the rest into each scenario that actually needs it",
          sources: ["gherkin"]
        },
        duplicate_step_text: {
          group: "gherkin",
          severity: "low",
          ruleKey: "r_duplicate_step_text",
          good: "merge the two scenarios into one Scenario Outline with two rows in Examples",
          sources: ["lint", "gherkin"]
        },
        // ---- robot ----
        empty_test_case: {
          group: "robot",
          severity: "high",
          ruleKey: "r_empty_test_case",
          good: "Login With Valid Creds\n    Open Browser    ${URL}    chrome\n    Should Contain    ${title}    Welcome",
          sources: ["lint"]
        },
        // ---- spec ----
        no_spec: {
          group: "spec",
          severity: "high",
          ruleKey: "r_no_spec",
          good: "list the requirements as R1, R2 … and get them approved before writing tests",
          sources: ["spec"],
          sortPriority: -0.5
        },
        spec_uncovered: {
          group: "spec",
          severity: "high",
          ruleKey: "r_uncovered",
          good: "every requirement gets a test whose docstring names its ID",
          sources: ["spec"]
        },
        test_without_requirement: {
          group: "spec",
          severity: "medium",
          ruleKey: "r_unlinked",
          good: "name the requirement in the test, or delete the test",
          sources: ["spec"]
        },
        out_of_scope_tested: { group: "spec", severity: "medium", ruleKey: "r_oos", good: "leave what the spec excludes to its own task", sources: ["spec"] },
        // ---- ai ----
        ai_purpose: { group: "ai", severity: "medium", ruleKey: "r_ai", good: null, sources: ["ai"] },
        ai_coverage: { group: "ai", severity: "medium", ruleKey: "r_ai", good: null, sources: ["ai"] },
        ai_fragility: { group: "ai", severity: "medium", ruleKey: "r_ai", good: null, sources: ["ai"] },
        ai_missing: { group: "ai", severity: "medium", ruleKey: "r_ai", good: null, sources: ["ai"] },
        ai_questions: { group: "ai", severity: "medium", ruleKey: "r_ai", good: null, sources: ["ai"] },
        ai_fix_justification: { group: "ai", severity: "medium", ruleKey: "r_ai", good: null, sources: ["ai"] },
        ai_spec_defect: { group: "ai", severity: "medium", ruleKey: "r_ai", good: null, sources: ["ai"] },
        ai_other: { group: "ai", severity: "medium", ruleKey: "r_ai_other", good: null, sources: ["ai"] }
      };
      const isSynthetic = (check) => /^lint_/.test(check) && !CHECKS[check];
      const warned = /* @__PURE__ */ new Set();
      function warnUnknown(check, where) {
        if (CHECKS[check] || isSynthetic(check) || warned.has(check)) return;
        warned.add(check);
        if (typeof console !== "undefined") console.warn(`[sessionlens] unknown check "${check}" in ${where} — add it to media/checks.js`);
      }
      return { CHECKS, SEVERITIES, GROUPS_ORDER, isSynthetic, warnUnknown };
    });
  }
});

// media/lens.js
var require_lens = __commonJS({
  "media/lens.js"(exports2, module2) {
    (function(root, factory) {
      if (typeof module2 === "object" && module2.exports) module2.exports = factory();
      else root.Lens = factory();
    })(typeof self !== "undefined" ? self : exports2, function() {
      "use strict";
      const I = () => typeof I18N !== "undefined" ? I18N : require_i18n();
      const T = (k, v) => I().t(k, v);
      const inMsg = () => T("in_msg");
      const C = () => typeof LensChecks !== "undefined" ? LensChecks : require_checks();
      const KW = {
        plan_markers: ["| Требование", "| Requirement", "ПЛАН", "PLAN"],
        /* Since 0.1.127 also the plain words for whose error it is, as Playwright's healer writes them ("Test problem.",
           "Typo in the test.") */
        triage_markers: [
          "гипотез",
          "баг продукта",
          "ошибка теста",
          "дефект спец",
          "hypothesis",
          "product bug",
          "test bug",
          "spec defect",
          "test problem",
          "test issue",
          "problem in the test",
          "typo in the test",
          "bug in the test",
          "error in the test",
          "the test is wrong",
          "application defect",
          "application bug",
          "app defect",
          "app bug",
          "product defect",
          "defect in the app",
          "spec problem",
          "проблема в тесте",
          "проблема теста",
          "опечатка в тесте",
          "ошибка в тесте",
          "тест неверн",
          "дефект приложения",
          "баг приложения",
          "ошибка приложения",
          "дефект продукта",
          "проблема в спецификации"
        ],
        pass_claim_patterns: ["тесты проходят", "все проходят", "проходит", "должны пройти", "tests pass", "all pass", "passing", "should pass", "all green"],
        assumption_patterns: [
          /предполож/i,
          /предположени/i,
          /будем считать/i,
          /(?:^|[^а-яё])видимо(?![а-яё])/i,
          /скорее всего/i,
          /по-видимому/i,
          /\bi assume\b/i,
          /\bassuming\b/i,
          /\bpresumably\b/i,
          /\bprobably\b/i,
          /\bseems like\b/i
        ],
        edit_churn_threshold: 4,
        pass_claim_lookback: 6
      };
      const PROCESS = [
        "pass_claim_without_run",
        "browser_check_not_in_test",
        "fix_after_fail_without_triage",
        "scope_creep",
        "edit_churn",
        "assumption_instead_of_question",
        "user_frustration"
      ];
      const METHOD = ["peeked_at_src_before_plan", "stop_markers_missing"];
      const CODE = [
        "assert_weakened",
        "weak_assert",
        "sleep_or_skip_added",
        "tests_never_run",
        "hardcoded_date",
        "fragile_wait",
        "expected_failure",
        "magic_number",
        "assertion_roulette",
        "conditional_logic",
        "duplicate_assert",
        "test_deleted",
        "product_code_edited",
        "snapshot_overwritten",
        "empty_result_unverified"
        // 0.1.130
      ];
      const API = [
        "status_only_assert",
        "mocked_service",
        "hardcoded_secret",
        "hardcoded_base_url",
        "no_negative_cases",
        "test_data_no_cleanup",
        "response_time_assert"
      ];
      const MOBILE = ["mobile_raw_locator", "hardcoded_coordinates", "no_driver_teardown"];
      const SECRETS = ["hardcoded_secret", "hardcoded_base_url"];
      const FOCUS_JS = [/\b(?:it|test|describe|context)(?:\.describe)?\.only(?:\.each)?\s*[(`]/, /(?<![.\w$])(?:fit|fdescribe)\s*\(\s*['"`]/];
      const DEBUGGER_JS = /(?<=^|[;{})])\s*debugger\s*(?:;|$)/m;
      const BREAKPOINT_PY = /(?<=^|;)\s*(?:breakpoint\s*\(\s*\)|(?:i?pdb)\.set_trace\s*\(\s*\))/m;
      const NAMED = String.raw`(?:\w+\.)*[A-Z][A-Z0-9_]+\b`;
      const delayCall = (call, num2 = String.raw`\d`) => new RegExp(call + String.raw`\s*\(\s*(?:` + num2 + "|" + NAMED + ")");
      const SET_TIMEOUT = new RegExp(String.raw`setTimeout\s*\([^,]+,\s*(?:\d{3,}|` + NAMED + ")");
      const API_TEST_PATTERNS = [
        /(?:async\s+)?def\s+(test\w*)\s*\(/g,
        /@Test[^\n]*\n(?:\s*@\w+[^\n]*\n)*\s*(?:public\s+)?(?:static\s+)?(?:void|fun)\s+`?(\w[\w ]*?)`?\s*\(/g,
        /\b(?:it|test)(?:\.\w+)?\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /\[(?:Test|Fact|Theory|TestMethod|TestCase)\b[^\]]*\](?:\s*\[[^\]]*\])*\s*(?:public\s+)?(?:async\s+)?(?:Task|void)\s+(\w+)/g,
        /func\s+(Test\w+)\s*\(/g,
        /\bpm\.test\s*\(\s*\\?['"`]([^'"`\\]+)/g,
        /^[ \t]*Scenario(?: Outline)?:\s*(.+)$/gm
      ];
      const STATUS_RX = /status_?code|statusCode|\.status\b|\.status\s*\(|\bstatus\s*\(|\bstatus\s+\d{3}|StatusCode|\.ok\b|\.ok\s*\(\)|raise_for_status|EnsureSuccessStatusCode|IsSuccessStatusCode|responseStatus|response\.code|to\.have\.status|to\.be\.ok|HttpStatus/i;
      const CONTENT_HINT = /\.json\s*\(|\.text\b|\.content\b|\.body\b(?!\s*\()|\.body\s*\(\s*["'][^"']*["']\s*,|\.headers?\b|\.data\b|\[\s*["'][^"']+["']\s*\]|jsonPath|contentType|\.get\s*\(\s*["']/;
      const isStatusLine = (l) => {
        const seg = (l.includes(".then()") ? l.slice(l.indexOf(".then()")) : l).replace(/\b(?:body|data|result|payload|json)\.status\b/g, "");
        return STATUS_RX.test(seg) && !CONTENT_HINT.test(seg);
      };
      const WEB_STRONG = /\.(?:toBe|toEqual|toStrictEqual|toHaveLength|toMatch|toContain|toHaveAttribute|toHaveText|toHaveURL|toHaveTitle|toHaveCount|toBeLessThan\w*|toBeGreaterThan\w*|toContainText|toHaveValues?|toHaveClass|toHaveCSS|toHaveId|toHaveAccessibleName|toHaveAccessibleDescription|toHaveRole|toHaveJSProperty|toHaveScreenshot|toBeChecked|toBeEnabled|toBeDisabled|toBeEditable|toBeFocused|toBeEmpty)\s*\(/;
      const PROFILES = {
        "qa-ts": {
          language: "typescript",
          code_ext: [".ts", ".tsx", ".js", ".mjs"],
          test_runner: "jest",
          // `npm run test` takes the usual scripts too: npm run test:e2e, npm run test:ui (0.1.121; before, no run)
          test_runner_patterns: ["jest", "vitest", "npm test", "npm run test", "playwright test", "pnpm test", "pnpm run test", "yarn test", "yarn run test"],
          src_dirs: ["src", "app", "lib"],
          test_dirs: ["tests", "test", "__tests__", "e2e"],
          checks: [...METHOD, ...PROCESS, ...CODE, "focused_test", "debug_leftover", ...SECRETS, "config_weakened", "icon_glyph_locator"],
          sleep_patterns: [delayCall(String.raw`\bwaitForTimeout`), SET_TIMEOUT],
          focus_patterns: FOCUS_JS,
          debug_patterns: { pause: /\bpage\.pause\s*\(/, debugger: DEBUGGER_JS },
          skip_patterns: [/\b(?:it|test|describe)\.skip\b/, /\btest\.fixme\b/, /\bretries\s*:\s*[1-9]/],
          weak_assert_patterns: [
            /expect\s*\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)\s*\.toBeDefined\s*\(\)/g,
            /expect\s*\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)\s*\.toBeTruthy\s*\(\)/g,
            /expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/g
          ],
          assert_line_patterns: [/\bexpect(?:\.(?:soft|poll))?\s*\(/],
          test_fn_pattern: /\b(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g,
          /* Playwright's web-first assertions of a value or a state count as strong, so toHaveValue(q) → toBeVisible() is
             weakened, and toBeAttached() is as weak as toBeVisible(). Those two only for the same element: a locator with
             the value in it (locator('body').toContainText(q) → getByText(q).toBeVisible()) is a rewrite (0.1.125) */
          weaken_pairs: [
            [WEB_STRONG, /toBeDefined|toBeTruthy|not\.toBeNull|not\.toBeUndefined/],
            [WEB_STRONG, /(?:toBeVisible|toBeAttached)\(\)\s*;?\s*$/, { sameSubject: true }],
            [/toEqual\s*\(/, /toMatchObject/]
          ]
        },
        "qa-python": {
          language: "python",
          code_ext: [".py"],
          test_runner: "pytest",
          test_runner_patterns: ["pytest"],
          src_dirs: ["src", "app", "services", "lib"],
          test_dirs: ["tests", "test"],
          checks: [...METHOD, ...PROCESS, ...CODE, "debug_leftover", ...SECRETS, "config_weakened"],
          // SECRETS since 0.1.129
          sleep_patterns: [delayCall(String.raw`\btime\.sleep`, String.raw`[\d.]`), delayCall(String.raw`\basyncio\.sleep`, String.raw`[\d.]`)],
          debug_patterns: { pause: /\bpage\.pause\s*\(/, breakpoint: BREAKPOINT_PY },
          // Playwright for Python too (0.1.121)
          // pytest-rerunfailures: reruns=N in a marker, --reruns N on a command line (not the word in a docstring, 0.1.121)
          skip_patterns: [/mark\.skip/, /\breruns\s*=\s*[1-9]/, /--reruns(?:\s+|=)[1-9]/, /@flaky/, /\bretry\s*=/],
          weak_assert_patterns: [
            /assert\s+[^\n]+?\.status_code\s*(?:<|<=|!=)\s*\d+/g,
            /assert\s+True\b/g,
            /assert\s+[\w.]+(?:\(\))?(?:\[[^\]]+\])*\s*$/gm,
            /assert\s+[^\n]+?\s+is\s+not\s+None\s*$/gm
          ],
          assert_line_patterns: [/^\s*assert\b/],
          test_fn_pattern: /(?:async\s+)?def\s+(test\w*)\s*\(/g,
          weaken_pairs: [
            [/==\s*/, /\bin\b|!=|<|>|is not None/],
            [/==\s*["'\d]/, /\bANY\b/]
          ]
        },
        "qa-java": {
          language: "java",
          code_ext: [".java", ".kt"],
          test_runner: "junit",
          test_runner_patterns: ["mvn test", "mvn verify", "gradle test", "gradlew"],
          src_dirs: ["src/main"],
          test_dirs: ["src/test"],
          checks: [...METHOD, ...PROCESS, ...CODE, "config_weakened"],
          sleep_patterns: [delayCall(String.raw`\bThread\.sleep`), /\bTimeUnit\.\w+\.sleep\s*\(/],
          skip_patterns: [/@Disabled/, /@Ignore\b/, /@Retry\b/],
          weak_assert_patterns: [/assertNotNull\s*\([^)]*\)\s*;/g, /assertTrue\s*\(\s*true\s*\)/g, /assertThat\s*\([^)]*\)\s*\.isNotNull\s*\(\)\s*;/g],
          assert_line_patterns: [/\bassert\w*\s*\(/, /\bassertThat\s*\(/],
          test_fn_pattern: /@Test[^\n]*\n\s*(?:public\s+)?void\s+(\w+)/g,
          weaken_pairs: [
            [/assertEquals/, /assertTrue\s*\([^)]*contains|assertNotNull/],
            [/isEqualTo/, /contains|isNotNull|isNotEmpty/]
          ]
        },
        "qa-c#": {
          language: "csharp",
          code_ext: [".cs"],
          test_runner: "dotnet",
          test_runner_patterns: ["dotnet test"],
          src_dirs: ["src"],
          test_dirs: ["tests", "test"],
          checks: [...METHOD, ...PROCESS, ...CODE, "config_weakened"],
          sleep_patterns: [delayCall(String.raw`\bThread\.Sleep`), delayCall(String.raw`\bTask\.Delay`)],
          skip_patterns: [
            /\[(?:[^\]\n]*,\s*)?Ignore\b/,
            /\[(?:[^\]\n]*,\s*)?Explicit\b/,
            /\[(?:[^\]\n]*,\s*)?Retry\b/,
            /\[(?:Fact|Theory)\s*\([^)]*Skip\s*=/,
            /\bAssert\.(?:Ignore|Inconclusive)\s*\(/
          ],
          weak_assert_patterns: [
            /Assert\.(?:NotNull|IsNotNull)\s*\([^)]*\)\s*;/g,
            /Assert\.(?:True|IsTrue)\s*\(\s*true\s*\)/g,
            /Assert\.That\s*\([^;]*Is\.Not\.Null\s*\)\s*;/g,
            /\.Should\(\)\.NotBeNull\(\)\s*;/g
          ],
          assert_line_patterns: [/\bAssert\.\w+\s*\(/, /\.Should\(\)/],
          test_fn_pattern: /\[(?:Test|Fact|Theory|TestMethod|TestCase)\b[^\]]*\](?:\s*\[[^\]]*\])*\s*(?:public\s+)?(?:async\s+)?(?:Task|void)\s+(\w+)/g,
          weaken_pairs: [
            [/Assert\.(?:AreEqual|Equal)/, /Assert\.(?:True|IsTrue|NotNull|IsNotNull|Contains)/],
            [/Is\.EqualTo|\.Should\(\)\.Be\(/, /Is\.Not\.Null|NotBeNull|Contains/]
          ]
        },
        "qa-api": {
          language: "api",
          // its Python files go to the Python engine (0.1.129): a test with no assertion, an exception swallowed
          lint_language: "python",
          lint_ext: [".py"],
          code_ext: [".py", ".java", ".kt", ".ts", ".tsx", ".js", ".mjs", ".cs", ".go", ".feature", ".postman_collection.json", ".postman_environment.json"],
          test_runner: "auto",
          test_runner_patterns: [
            "pytest",
            "npm test",
            "npm run test",
            "jest",
            "vitest",
            "playwright test",
            "mvn test",
            "mvn verify",
            "gradle test",
            "gradlew",
            "dotnet test",
            "go test",
            "newman",
            "karate"
          ],
          src_dirs: ["src", "app", "services", "lib", "controllers", "routes", "handlers"],
          test_dirs: ["tests", "test", "__tests__", "e2e", "api-tests", "src/test"],
          checks: [...METHOD, ...PROCESS, ...CODE, "focused_test", "debug_leftover", "config_weakened", ...API],
          sleep_patterns: [
            delayCall(String.raw`\btime\.sleep`, String.raw`[\d.]`),
            delayCall(String.raw`\basyncio\.sleep`, String.raw`[\d.]`),
            delayCall(String.raw`\bThread\.sleep`),
            /\bTimeUnit\.\w+\.sleep\s*\(/,
            delayCall(String.raw`\bTask\.Delay`),
            delayCall(String.raw`\bwaitForTimeout`),
            SET_TIMEOUT,
            /\bkarate\.sleep\s*\(/,
            /\btime\.Sleep\s*\(/
          ],
          focus_patterns: FOCUS_JS,
          debug_patterns: { pause: /\bpage\.pause\s*\(/, debugger: DEBUGGER_JS, breakpoint: BREAKPOINT_PY },
          skip_patterns: [
            /mark\.skip/,
            /\breruns\s*=\s*[1-9]/,
            /--reruns(?:\s+|=)[1-9]/,
            /@flaky/,
            /\bretry\s*=/,
            /@Disabled/,
            /@Ignore\b/,
            /@Retry\b/,
            /\b(?:it|test|describe)\.skip\b/,
            /\btest\.fixme\b/,
            /\bretries\s*:\s*[1-9]/,
            /\[(?:[^\]\n]*,\s*)?Ignore\b/,
            /\[(?:[^\]\n]*,\s*)?Explicit\b/,
            /\[(?:[^\]\n]*,\s*)?Retry\b/,
            /\[(?:Fact|Theory)\s*\([^)]*Skip\s*=/,
            /\bt\.Skip\w*\s*\(/,
            /^\s*@ignore\b/m,
            /\bpm\.test\.skip\b/
          ],
          weak_assert_patterns: [
            /assert\s+[^\n]+?\.status_code\s*(?:<|<=|!=|>=)\s*\d+\s*$/gm,
            /assert\s+True\b/g,
            /assert\s+[\w.]+(?:\(\))?(?:\[[^\]]+\])*\s*$/gm,
            /assert\s+[^\n]+?\s+is\s+not\s+None\s*$/gm,
            /\.statusCode\s*\(\s*(?:lessThan|greaterThanOrEqualTo|greaterThan|not)\s*\(/g,
            /assertNotNull\s*\([^)]*\)\s*;/g,
            /assertTrue\s*\(\s*true\s*\)/g,
            /expect\s*\([^)]*status[^)]*\)\s*\.(?:toBeLessThan|toBeLessThanOrEqual|toBeGreaterThan|toBeGreaterThanOrEqual|not\.toBe)\s*\(/g,
            /expect\s*\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)\s*\.toBeDefined\s*\(\)/g,
            /expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/g,
            /Assert\.(?:NotNull|IsNotNull)\s*\([^)]*\)\s*;/g,
            /\.Should\(\)\.NotBeNull\(\)\s*;/g,
            /pm\.expect\s*\(\s*pm\.response\.code\s*\)\s*\.to\.(?:be\.)?(?:below|above|at\.(?:least|most)|not\.(?:equal|eql))\s*\(/g,
            /pm\.expect\s*\(\s*true\s*\)/g,
            /assert\s+responseStatus\s*(?:<|<=|!=|>=|>)/g,
            /match\s+response\s*==\s*['"]#(?:notnull|present)['"]/g
          ],
          assert_line_patterns: [
            /^\s*assert\b/,
            /\bexpect(?:\.(?:soft|poll))?\s*\(/,
            /\bassert\w*\s*\(/,
            /\bAssert\.\w+\s*\(/,
            /\.Should\(\)/,
            /\braise_for_status\s*\(/,
            /EnsureSuccessStatusCode/,
            /\.statusCode\s*\(/,
            /\.body\s*\(\s*"[^"]*"\s*,/,
            /\bpm\.(?:expect|response\.to)\b/,
            /^\s*(?:\*|Given|When|Then|And|But)\s+(?:status|match|assert)\b/,
            /\b(?:assert|require)\.\w+\s*\(/,
            /\bt\.(?:Errorf|Fatalf|Error|Fatal)\s*\(/
          ],
          test_fn_pattern: API_TEST_PATTERNS,
          weaken_pairs: [
            [/^\s*assert\b[^\n]*==\s*/, /^\s*assert\b[^\n]*(?:\bin\b|!=|<|>|is not None)/],
            [/assertEquals/, /assertTrue\s*\([^)]*contains|assertNotNull/],
            [/isEqualTo/, /contains|isNotNull|isNotEmpty/],
            [
              /\.(?:toBe|toEqual|toStrictEqual|toHaveLength|toMatch|toContain|toBeLessThan\w*|toBeGreaterThan\w*)\s*\(/,
              /toBeDefined|toBeTruthy|not\.toBeNull|not\.toBeUndefined/
            ],
            [/toEqual\s*\(/, /toMatchObject/],
            [/Assert\.(?:AreEqual|Equal)/, /Assert\.(?:True|IsTrue|NotNull|IsNotNull|Contains)/],
            [/Is\.EqualTo|\.Should\(\)\.Be\(/, /Is\.Not\.Null|NotBeNull|Contains/],
            [/\bassert\.Equal/, /assert\.(?:NotNil|Contains|NotEmpty)/],
            [/\.to\.(?:eql|equal|have\.status)\s*\(/, /\.to\.(?:be\.)?(?:below|above|ok|exist)\b/]
          ]
        },
        /* Appium is a protocol, used from whatever language the team already writes tests in — the profile
           spans the same stacks qa-api does, minus Go/Postman/Karate (not common Appium clients) plus the
           three mobile-specific checks above. Existing per-language sleep/skip/weak-assert patterns already
           fire on Appium code written in Java/Python/TS/C#, so they are not repeated here. */
        "qa-mobile": {
          language: "mobile",
          code_ext: [".py", ".java", ".kt", ".ts", ".tsx", ".js", ".mjs", ".cs"],
          test_runner: "auto",
          test_runner_patterns: ["pytest", "npm test", "npm run test", "jest", "vitest", "mvn test", "mvn verify", "gradle test", "gradlew", "dotnet test"],
          src_dirs: ["src", "app"],
          test_dirs: ["tests", "test", "__tests__", "e2e", "src/test"],
          checks: [...METHOD, ...PROCESS, ...CODE, "focused_test", "debug_leftover", ...SECRETS, "config_weakened", ...MOBILE],
          sleep_patterns: [
            delayCall(String.raw`\btime\.sleep`, String.raw`[\d.]`),
            delayCall(String.raw`\bThread\.sleep`),
            /\bTimeUnit\.\w+\.sleep\s*\(/,
            delayCall(String.raw`\bTask\.Delay`),
            delayCall(String.raw`\bbrowser\.pause`)
          ],
          focus_patterns: FOCUS_JS,
          debug_patterns: { debug: /\bbrowser\.debug\s*\(/, debugger: DEBUGGER_JS, breakpoint: BREAKPOINT_PY },
          skip_patterns: [/mark\.skip/, /@Disabled/, /@Ignore\b/, /\b(?:it|test|describe)\.skip\b/, /\[(?:[^\]\n]*,\s*)?Ignore\b/, /\bt\.Skip\w*\s*\(/],
          weak_assert_patterns: [
            /assert\s+True\b/g,
            /assertTrue\s*\(\s*true\s*\)/g,
            /Assert\.(?:True|IsTrue)\s*\(\s*true\s*\)/g,
            /expect\s*\(\s*true\s*\)\s*\.to\.be\.true\b/g
          ],
          assert_line_patterns: [/^\s*assert\b/, /\bexpect\s*\(/, /\bassert\w*\s*\(/, /\bAssert\.\w+\s*\(/],
          test_fn_pattern: API_TEST_PATTERNS,
          weaken_pairs: [
            [/assertEquals/, /assertTrue\s*\([^)]*contains|assertNotNull/],
            [/Assert\.(?:AreEqual|Equal)/, /Assert\.(?:True|IsTrue|NotNull|IsNotNull|Contains)/]
          ]
        },
        "qa-cypress": {
          language: "cypress",
          code_ext: [".ts", ".tsx", ".js", ".mjs"],
          test_runner: "cypress",
          test_runner_patterns: ["cypress run", "cypress open", "npx cypress", "yarn cypress", "cypress:run", "npm test", "npm run test"],
          src_dirs: ["src", "app"],
          test_dirs: ["cypress", "cypress/e2e", "cypress/integration"],
          checks: [...METHOD, ...PROCESS, ...CODE, "focused_test", "debug_leftover", ...SECRETS, "config_weakened", "cypress_async_test", "icon_glyph_locator"],
          sleep_patterns: [delayCall(String.raw`\bcy\.wait`, String.raw`\d{3,}`)],
          focus_patterns: FOCUS_JS,
          debug_patterns: { pause: /\bcy\.pause\s*\(/, debug: /\bcy\.debug\s*\(|\)\s*\.debug\s*\(\s*\)/, debugger: DEBUGGER_JS },
          skip_patterns: [/\b(?:it|describe|context)\.skip\b/],
          weak_assert_patterns: [/\.should\s*\(\s*['"`]exist['"`]\s*\)/g, /expect\s*\(\s*true\s*\)\s*\.to\.be\.true\b/g, /assert\.isTrue\s*\(\s*true\s*\)/g],
          assert_line_patterns: [/\.should\s*\(/, /\bexpect\s*\(/, /\bcy\.wrap\s*\([^)]*\)\.should\b/],
          test_fn_pattern: /\b(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g,
          weaken_pairs: [[/\.should\s*\(\s*['"`](?:have\.text|contain\.text|have\.value|eq)['"`]/, /\.should\s*\(\s*['"`]exist['"`]\)/]]
        },
        /* Mirrors qa-cypress structurally: single-language (JS/TS + Jest), same generic METHOD/PROCESS/CODE
           vocabulary, with the Detox-specific concepts (hardcoded wait, missing withTimeout, index matcher,
           missing post-action assertion, missing app reset) arriving only via the ESLint-based engine in
           lint.js — there is no regex fallback for those, same as raw_locator/positional_locator elsewhere. */
        "qa-detox": {
          language: "detox",
          code_ext: [".ts", ".tsx", ".js", ".mjs"],
          test_runner: "detox",
          test_runner_patterns: ["detox test", "npx detox test", "detox build", "e2e:test"],
          src_dirs: ["src", "app"],
          test_dirs: ["e2e", "e2e/tests"],
          checks: [...METHOD, ...PROCESS, ...CODE, "focused_test", "debug_leftover", ...SECRETS, "config_weakened"],
          sleep_patterns: [SET_TIMEOUT, /new Promise\s*\(\s*resolve\s*=>\s*setTimeout/],
          focus_patterns: FOCUS_JS,
          debug_patterns: { debugger: DEBUGGER_JS },
          skip_patterns: [/\b(?:it|describe|test)\.skip\b/],
          weak_assert_patterns: [/expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/g],
          assert_line_patterns: [/\bexpect\s*\(/],
          test_fn_pattern: /\b(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g,
          weaken_pairs: [[/\.(?:toHaveText|toHaveValue|toHaveId)\s*\(/, /\.(?:toBeVisible|toExist)\s*\(\)/]]
        },
        /* Robot Framework's own profile — its tabular, keyword-driven syntax never appears inside another
           language's codebase the way Gherkin's .feature files can, so (unlike Gherkin) this is a normal,
           profile-specific case rather than a profile-agnostic one. All four checks arrive only via the
           hand-written parser in media/lint-robot.js (see that file for why no tree-sitter grammar is used) —
           there is no regex fallback here, same reasoning as qa-detox's ESLint-only checks above. */
        "qa-robot": {
          language: "robot",
          code_ext: [".robot", ".resource"],
          test_runner: "robot",
          test_runner_patterns: ["robot ", "robot.exe", "python -m robot", "rebot"],
          src_dirs: ["resources", "keywords"],
          test_dirs: ["tests"],
          checks: [...METHOD, ...PROCESS],
          sleep_patterns: [],
          skip_patterns: [],
          weak_assert_patterns: [],
          assert_line_patterns: [],
          test_fn_pattern: null,
          weaken_pairs: []
        },
        "qa-generic": {
          language: "any",
          code_ext: [],
          test_runner: "auto",
          test_runner_patterns: [
            "pytest",
            "npm test",
            "npm run test",
            "jest",
            "vitest",
            "mvn test",
            "gradle test",
            "go test",
            "dotnet test",
            "cargo test",
            "make test"
          ],
          src_dirs: [],
          test_dirs: [],
          checks: [...PROCESS, "tests_never_run"],
          sleep_patterns: [],
          skip_patterns: [],
          weak_assert_patterns: []
        },
        "qa-go": {
          language: "go",
          code_ext: [".go"],
          test_runner: "gotest",
          test_runner_patterns: ["go test"],
          src_dirs: ["internal", "pkg", "cmd"],
          test_dirs: [],
          checks: [...METHOD, ...PROCESS, ...CODE],
          sleep_patterns: [/\btime\.Sleep\s*\(/],
          skip_patterns: [/\bt\.Skip\w*\s*\(/],
          weak_assert_patterns: [/(?:assert|require)\.NotNil\s*\([^)]*\)\s*$/gm],
          assert_line_patterns: [/\b(?:assert|require)\.\w+\s*\(/, /\bt\.(?:Errorf|Fatalf|Error|Fatal)\s*\(/],
          test_fn_pattern: /func\s+(Test\w+)\s*\(/g,
          weaken_pairs: [
            [/assert\.Equal/, /assert\.(?:NotNil|Contains|NotEmpty)/],
            [/require\.Equal/, /require\.(?:NotNil|Contains|NotEmpty)/]
          ]
        }
      };
      const VISIBLE = ["qa-ts", "qa-cypress", "qa-detox", "qa-python", "qa-java", "qa-c#", "qa-api", "qa-mobile", "qa-robot", "qa-generic"];
      const ALIAS = { "dev-generic": "qa-generic" };
      function profile(name) {
        name = ALIAS[name] || name;
        return Object.assign({ profile: name }, KW, PROFILES[name] || PROFILES["qa-python"]);
      }
      const runners = {
        pytest(out) {
          if (!/\d+ (passed|failed|error)/.test(out)) return null;
          const r = { passed: 0, failed: 0, errors: 0, failed_names: [] };
          for (const m of out.matchAll(/(\d+) (passed|failed|error)/g)) {
            const n = +m[1];
            if (m[2] === "passed") r.passed = n;
            else if (m[2] === "failed") r.failed = n;
            else r.errors = n;
          }
          r.failed_names = [...out.matchAll(/FAILED ([\w/.\-]+::[\w\[\]\-]+)/g)].map((m) => m[1]);
          return r;
        },
        junit(out) {
          let m = out.match(/Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+)/);
          if (m) {
            const [run, f, e] = [+m[1], +m[2], +m[3]];
            return { passed: run - f - e, failed: f, errors: e, failed_names: [...out.matchAll(/([\w.]+\(\w+\)) <<< FAILURE!/g)].map((x) => x[1]) };
          }
          m = out.match(/(\d+) tests completed, (\d+) failed/);
          if (m) return { passed: +m[1] - +m[2], failed: +m[2], errors: 0, failed_names: [] };
          if (/BUILD SUCCESS/.test(out)) return { passed: 1, failed: 0, errors: 0, failed_names: [] };
          return null;
        },
        jest(out) {
          if (/^\s*Total:\s*\d+\s+tests?\s*$/m.test(out) && !/\d+\s+(passed|failed)/.test(out)) return null;
          let m = out.match(/Tests:\s*(?:(\d+) failed,\s*)?(?:(\d+) skipped,\s*)?(?:(\d+) passed,\s*)?(\d+) total/);
          if (m) return { passed: +(m[3] || 0), failed: +(m[1] || 0), errors: 0, failed_names: [...out.matchAll(/[✕×]\s+([^\n(]+)/g)].map((x) => x[1].trim()) };
          const p = out.match(/(\d+)\s+passed/), f = out.match(/(\d+)\s+failed/), fl = out.match(/(\d+)\s+flaky/);
          if (p || f)
            return {
              passed: p ? +p[1] : 0,
              failed: (f ? +f[1] : 0) + (fl ? +fl[1] : 0),
              errors: 0,
              failed_names: [...out.matchAll(/^\s*(?:\d+\)|[✘✕×])\s*\[[^\]]*\]\s*›\s*([^\n]+)/gm)].map((x) => x[1].trim()).slice(0, 20)
            };
          return null;
        },
        gotest(out) {
          const fails = [...out.matchAll(/--- FAIL: (Test\w+)/g)].map((m) => m[1]), passes = [...out.matchAll(/--- PASS: (Test\w+)/g)];
          if (!fails.length && !passes.length) {
            if (/^ok\s/m.test(out)) return { passed: 1, failed: 0, errors: 0, failed_names: [] };
            if (/^FAIL\s/m.test(out)) return { passed: 0, failed: 1, errors: 0, failed_names: [] };
            return null;
          }
          return { passed: passes.length, failed: fails.length, errors: 0, failed_names: fails };
        },
        dotnet(out) {
          let m = out.match(/(?:Passed|Failed)!\s*-\s*Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+)/);
          if (m)
            return {
              passed: +m[2],
              failed: +m[1],
              errors: 0,
              failed_names: [...out.matchAll(/^\s*Failed\s+([\w.<>,()"' -]+?)\s+\[/gm)].map((x) => x[1].trim()).slice(0, 20)
            };
          const t = out.match(/Total tests:\s*(\d+)/);
          if (t) {
            const p = out.match(/^\s*Passed:\s*(\d+)/m), f = out.match(/^\s*Failed:\s*(\d+)/m);
            return { passed: p ? +p[1] : 0, failed: f ? +f[1] : 0, errors: 0, failed_names: [...out.matchAll(/^\s*Failed\s+([\w.]+)/gm)].map((x) => x[1]) };
          }
          return null;
        },
        newman(out) {
          const m = out.match(/assertions\s*[│|]\s*(\d+)\s*[│|]\s*(\d+)/);
          if (!m) return null;
          return {
            passed: Math.max(+m[1] - +m[2], 0),
            failed: +m[2],
            errors: 0,
            failed_names: [...out.matchAll(/^\s*\d+\.\s+(?:AssertionError|Error)\s+(.+?)\s*$/gm)].map((x) => x[1]).slice(0, 20)
          };
        },
        karate(out) {
          const m = out.match(/scenarios:\s*(\d+)\s*\|\s*passed:\s*(\d+)\s*\|\s*failed:\s*(\d+)/);
          if (!m) return null;
          return {
            passed: +m[2],
            failed: +m[3],
            errors: 0,
            failed_names: [...out.matchAll(/^\s*(?:scenario|feature):?\s+(.+?)\s+FAILED/gim)].map((x) => x[1]).slice(0, 20)
          };
        },
        auto(out) {
          for (const k of ["pytest", "jest", "junit", "gotest", "dotnet", "newman", "karate"]) {
            const r = runners[k](out);
            if (r) return r;
          }
          return null;
        }
      };
      function parseTests(out, cfg) {
        if (!out) return null;
        if (/did not complete within its \d+s timeout and was moved to the background/i.test(out)) return null;
        return (runners[cfg.test_runner] || runners.auto)(out);
      }
      function blocksByTest(src, pat) {
        if (!pat) return { "<file>": src };
        const out = {};
        const ms = (Array.isArray(pat) ? pat.flatMap((p) => [...src.matchAll(p)]) : [...src.matchAll(pat)]).sort((a, b) => a.index - b.index);
        ms.forEach((m, i) => {
          const end = i + 1 < ms.length ? ms[i + 1].index : src.length;
          out[m[1]] = src.slice(m.index, end);
        });
        return out;
      }
      const HASH_COMMENTS = /\.(?:py|pyi|robot|resource|feature|ya?ml|sh|rb|toml|ini|cfg|r)$/i;
      function withoutComments(text, file) {
        const hash = !file || HASH_COMMENTS.test(file), slash = !file || !HASH_COMMENTS.test(file), py = !!file && /\.pyi?$/i.test(file);
        let out = "", q = "", prev = "\n", depth = 0;
        for (let i = 0; i < text.length; i++) {
          const c = text[i], n = text[i + 1];
          if (q.length === 3 || q.length === 4) {
            const blank = q.length === 4, hide = (s) => blank ? s.replace(/[^\n]/g, " ") : s;
            if (text.startsWith(q.slice(-3), i)) {
              out += hide(q.slice(-3));
              i += 2;
              q = "";
            } else if (c === "\\" && n !== void 0) {
              out += hide(c + n);
              i++;
            } else out += hide(c);
          } else if (q === "//") {
            if (c === "\n") q = "";
            out += c === "\n" ? c : " ";
          } else if (q === "/*") {
            if (c === "*" && n === "/") {
              q = "";
              out += "  ";
              i++;
            } else out += c === "\n" ? c : " ";
          } else if (q) {
            out += c;
            if (c === "\\" && n !== void 0 && n !== "\n") out += text[++i];
            else if (c === q || c === "\n" && q !== "`") q = "";
          } else if (slash && c === "/" && n === "/") {
            q = "//";
            out += " ";
          } else if (slash && c === "/" && n === "*") {
            q = "/*";
            out += "  ";
            i++;
          } else if (hash && c === "#" && /\s/.test(prev)) {
            q = "//";
            out += " ";
          } else if (py && (text.startsWith('"""', i) || text.startsWith("'''", i))) {
            const line = out.slice(out.lastIndexOf("\n") + 1), prefix = /^\s*([rRuUbB]{0,2})$/.exec(line), own = depth === 0 && !!prefix && !/\\\s*$/.test(out.slice(0, out.length - line.length));
            if (own) out = out.slice(0, out.length - prefix[1].length) + " ".repeat(prefix[1].length);
            q = (own ? "-" : "") + text.slice(i, i + 3);
            out += own ? "   " : q;
            i += 2;
          } else {
            if (c === '"' || c === "'" || c === "`") q = c;
            else if (py && "([{".includes(c)) depth++;
            else if (py && ")]}".includes(c)) depth = Math.max(0, depth - 1);
            out += c;
          }
          prev = c;
        }
        return out;
      }
      const NO_COMMENTS = /* @__PURE__ */ new WeakMap();
      function codeOf(e) {
        if (!NO_COMMENTS.has(e)) NO_COMMENTS.set(e, withoutComments(e.new_content || "", e.file));
        return NO_COMMENTS.get(e);
      }
      function commentLinesBlanked(text, file) {
        const code = withoutComments(text, file).split("\n");
        return text.split("\n").map((ln, i) => code[i].trim() || !ln.trim() ? ln : "").join("\n");
      }
      const NO_COMMENT_LINES = /* @__PURE__ */ new WeakMap();
      function linesOf(e) {
        if (!NO_COMMENT_LINES.has(e)) NO_COMMENT_LINES.set(e, commentLinesBlanked(e.new_content || "", e.file));
        return NO_COMMENT_LINES.get(e);
      }
      const FAILURE_WORD = /(?<![\p{L}\p{N}_])(?:пада(?:ет|ют)|упал[аио]?|не проход(?:ит|ят)|fails|failed|failing|failures?)(?![\p{L}\p{N}_])/gu;
      const DENIED = /(?:(?<![\p{L}])(?:не|ни|no|not|none|nothing|without|zero)|(?<![\p{N}])0)\s+$/u;
      const BUILD_SUBJECT = /(?<![\p{L}])(?:сборк|компил|build|compil|type ?check|tsc(?![\p{L}])|типы|типов|lint|линт|prettier|форматир|format)/iu;
      const TEST_WORD = /тест|test|spec|suite|сьют|pytest|jest|vitest|playwright|cypress/i;
      function claimsTests(t, pats) {
        return t.split(/(?<=[.!?;])\s+|\n+/).some((sentence) => pats.some((rx) => rx.test(sentence)) && !(BUILD_SUBJECT.test(sentence) && !TEST_WORD.test(sentence)));
      }
      const saysFailure = (t) => [...t.matchAll(FAILURE_WORD)].some((m) => !DENIED.test(t.slice(Math.max(0, m.index - 16), m.index)));
      const DOC_FILE = /\.(?:md|mdx|markdown|txt|rst|adoc)$/i;
      const PO_ASSERT_CALLS = /\.expect[A-Z]\w*\s*\(/g;
      function isAssertLine(ln, cfg) {
        return !/^\s*(?:\/\/|#|\/\*|\*)/.test(ln) && cfg.assert_line_patterns.some((p) => p.test(ln));
      }
      const PAIR_MAX = 60;
      const capLine = (s) => s.length > PAIR_MAX ? s.slice(0, PAIR_MAX - 1) + "…" : s;
      const subjectOf = (l) => l.replace(/(?:\.not)?\.to\w+\s*\([^]*$/, "").trim();
      function changePair(a, b) {
        if (a.length <= PAIR_MAX && b.length <= PAIR_MAX) return `${a} → ${b}`;
        let same = 0;
        while (same < a.length && same < b.length && a[same] === b[same]) same++;
        let from = 0;
        for (let k = same - 1; k > 0; k--)
          if (".( ".includes(a[k])) {
            from = a[k] === "." ? k : k + 1;
            break;
          }
        const part = (s) => (from ? "…" : "") + capLine(s.slice(from));
        return `${part(a)} → ${part(b)}`;
      }
      const NOT_A_NAME = /* @__PURE__ */ new Set([
        "if",
        "for",
        "while",
        "switch",
        "catch",
        "with",
        "return",
        "function",
        "do",
        "else",
        "try",
        "using",
        "lock",
        "foreach",
        "new",
        "await",
        "typeof",
        "super"
      ]);
      const FN_HEADS = {
        js: [
          // async expectPath(path: string): Promise<void> {   function open(page) {   static get x() {   export async function f() {
          /^[ \t]*(?:export\s+)?(?:default\s+)?(?:(?:public|private|protected|static|readonly|override|abstract|async|get|set)\s+)*(?:function\s*\*?\s*)?([A-Za-z_$][\w$]*)\s*(?:<[^>\n]*>)?\s*\([^()]*\)\s*(?::\s*[^{=;\n]+)?\{/gm,
          // const open = async (page: Page) => {
          /^[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*(?::\s*[^=\n]+)?=>\s*\{/gm
        ],
        py: [/^[ \t]*(?:async\s+)?def\s+(\w+)\s*\(/gm],
        // Java, Kotlin, C#: annotations and modifiers, a return type or fun, the name, the parameters, then {
        jvm: [
          /^[ \t]*(?:@\w+(?:\([^)\n]*\))?\s+)*(?:(?:public|private|protected|internal|static|final|abstract|override|virtual|async|suspend|open|synchronized)\s+)*(?:fun\s+|[\w<>[\],.?]+\s+)([A-Za-z_]\w*)\s*\([^()]*\)\s*(?::\s*[\w<>?,. ]+)?\s*(?:throws\s+[\w., ]+)?\{/gm
        ]
      };
      function helperBlocks(src, file) {
        const f = file || "";
        const family = /\.[cm]?[jt]sx?$/i.test(f) ? "js" : /\.pyi?$/i.test(f) ? "py" : /\.(?:java|kts?|cs)$/i.test(f) ? "jvm" : null;
        const heads = family ? FN_HEADS[family].flatMap((rx) => [...src.matchAll(rx)]).filter((m) => !NOT_A_NAME.has(m[1])).sort((a, b) => a.index - b.index) : [];
        if (!heads.length) return { "<file>": src };
        const out = {};
        heads.forEach((m, i) => {
          let name = m[1];
          for (let k = 2; name in out; k++) name = `${m[1]}#${k}`;
          out[name] = src.slice(m.index, i + 1 < heads.length ? heads[i + 1].index : src.length);
        });
        return out;
      }
      function poAssertions(events, cfg) {
        if (!cfg.test_fn_pattern || !cfg.assert_line_patterns) return [];
        const last = /* @__PURE__ */ new Map();
        for (const e of events || []) if (e.file && e.new_content && !e.fragment_only && isCode(e.file, cfg)) last.set(e.file, e.new_content);
        const count = (body) => body.split("\n").filter((l) => isAssertLine(l.trim(), cfg)).length;
        const tests = [], methods = /* @__PURE__ */ new Map();
        for (const [file, src] of last) {
          const code = commentLinesBlanked(src, file);
          const blocks = blocksByTest(code, cfg.test_fn_pattern);
          if (Object.keys(blocks).length) {
            for (const [test, body] of Object.entries(blocks)) tests.push({ file, test, body });
            continue;
          }
          for (const [name, body] of Object.entries(helperBlocks(code, file))) {
            const m = name.replace(/#\d+$/, "");
            methods.set(m, [...methods.get(m) || [], { file, asserts: count(body) }]);
          }
        }
        const out = [];
        for (const { file, test, body } of tests) {
          const calls = [...new Set([...body.matchAll(/\.(expect[A-Z]\w*)\s*\(/g)].map((m) => m[1]))];
          if (!calls.length) continue;
          out.push({
            file,
            test,
            own: count(body),
            calls: calls.map((method) => {
              const d = methods.get(method) || [];
              return { method, asserts: d.length ? d.reduce((n, x) => n + x.asserts, 0) : null };
            })
          });
        }
        return out;
      }
      function compareAsserts(oldSrc, newSrc, cfg, file) {
        if (!cfg.assert_line_patterns) return null;
        oldSrc = commentLinesBlanked(oldSrc, file);
        newSrc = commentLinesBlanked(newSrc, file);
        const isA = (ln) => isAssertLine(ln, cfg);
        const asserts = (t) => t.split("\n").map((l) => l.trim()).filter(isA);
        let om = blocksByTest(oldSrc, cfg.test_fn_pattern), nm = blocksByTest(newSrc, cfg.test_fn_pattern);
        if (cfg.test_fn_pattern && !Object.keys(om).length && !Object.keys(nm).length) {
          om = helperBlocks(oldSrc, file);
          nm = helperBlocks(newSrc, file);
        }
        const res = { old: 0, new: 0, weakened: [], removed: [] };
        for (const v of Object.values(om)) res.old += asserts(v).length;
        for (const v of Object.values(nm)) res.new += asserts(v).length;
        for (const [name, ob] of Object.entries(om)) {
          const nb = nm[name];
          if (nb == null) continue;
          const oa = asserts(ob), na = asserts(nb);
          const moved = (nb.match(PO_ASSERT_CALLS) || []).length > (ob.match(PO_ASSERT_CALLS) || []).length;
          if (na.length < oa.length && !moved) res.removed.push({ test: name, before: oa.length, after: na.length });
          for (let i = 0; i < Math.min(oa.length, na.length); i++) {
            for (const [strong, weak, opt] of cfg.weaken_pairs || []) {
              if (strong.test(oa[i]) && !strong.test(na[i]) && weak.test(na[i]) && (!(opt && opt.sameSubject) || subjectOf(oa[i]) === subjectOf(na[i]))) {
                res.weakened.push({ test: name, reason: changePair(oa[i], na[i]) });
                break;
              }
              if (strong.test(oa[i]) && !strong.test(na[i]) && !/==|assertEquals|toBe|toEqual|isEqualTo|\.Equal/.test(na[i]) && cfg.language === "python") {
                res.weakened.push({ test: name, reason: `comparison → truthiness: ${capLine(na[i])}` });
                break;
              }
            }
          }
        }
        return res;
      }
      const LIST_ONLY = /(?:^|\s)(?:--list|--listTests|--list-tests|--collect-only|--co)(?=[\s=]|$)|\bvitest\s+list\b/;
      const NOT_A_RUN = /(?:pip3?|pipx|uv(?:\s+pip)?|poetry|pdm|conda|mamba|npm|pnpm|yarn|bun|brew|apt(?:-get)?|gem|cargo)\s+(?:install|i|add|ci|uninstall|remove|rm|show|list|info|outdated)|^\s*(?:which|where|type|command\s+-v)\s|(?:^|\s)--(?:version|help)(?=\s|$)/;
      function isTestRun(cmd, cfg) {
        return cmd.split(/&&|\|\|?|;|\n/).some((part) => cfg.test_runner_patterns.some((p) => part.includes(p)) && !LIST_ONLY.test(part) && !NOT_A_RUN.test(part));
      }
      const PW_TEST = { generator_write_test: "write", planner_save_plan: "write", test_run: "run", test_debug: "run" };
      function playwrightTestTool(tool) {
        const p = mcpParts(tool);
        return p && /playwright/i.test(p[0]) && PW_TEST[p[1]] || null;
      }
      function toolInput(tool, inp) {
        const pw = playwrightTestTool(tool);
        if (!pw) return inp;
        const name = mcpParts(tool)[1];
        if (name === "generator_write_test") return { file_path: inp.fileName || "", content: String(inp.code || "") };
        if (name === "planner_save_plan") return { file_path: inp.fileName || "", content: "" };
        if (name === "test_run") return { command: ["npx playwright test", ...Array.isArray(inp.locations) ? inp.locations : []].join(" ") };
        return { command: `npx playwright test --debug ${JSON.stringify(inp.test && inp.test.title || "")}` };
      }
      function planMarkdown(inp) {
        const suites = Array.isArray(inp && inp.suites) ? inp.suites : [];
        if (!suites.length) return "";
        const out = [`# ${inp.name || "Test Plan"}`, ""];
        if (inp.overview) out.push("## Application Overview", "", String(inp.overview), "");
        out.push("## Test Scenarios", "");
        suites.forEach((su, i) => {
          out.push(`### ${i + 1}. ${su && su.name || ""}`, "");
          if (su && su.seedFile) out.push(`**Seed:** \`${su.seedFile}\``, "");
          (Array.isArray(su && su.tests) ? su.tests : []).forEach((t, j) => {
            out.push(`#### ${i + 1}.${j + 1}. ${t && t.name || ""}`, "");
            if (t && t.file) out.push(`**File:** \`${t.file}\``, "");
            const steps = Array.isArray(t && t.steps) ? t.steps : [];
            if (steps.length) out.push("**Steps:**");
            steps.forEach((st, k) => {
              out.push(`  ${k + 1}. ${st && st.perform || ""}`);
              for (const x of Array.isArray(st && st.expect) ? st.expect : []) out.push(`    - expect: ${x}`);
            });
            out.push("");
          });
        });
        return out.join("\n");
      }
      function classify(tool, input, cfg) {
        const f = input.file_path || input.path || "";
        const pw = playwrightTestTool(tool);
        if (pw === "write") return ["write", f, ""];
        if (pw === "run") return ["run_tests", "", input.command || ""];
        if (["Read", "View"].includes(tool)) return ["read", f, ""];
        if (["Grep", "Glob", "LS", "Search"].includes(tool)) return ["search", input.path || input.pattern || "", ""];
        if (["Edit", "MultiEdit"].includes(tool)) return ["edit", f, ""];
        if (["Write", "Create"].includes(tool)) return ["write", f, ""];
        if (tool === "Delete") return ["delete", f, ""];
        if (tool === "Bash") {
          const c = input.command || "";
          if (isTestRun(c, cfg)) return ["run_tests", "", c];
          if (/^\s*git /.test(c)) return ["git", "", c];
          return ["run_other", "", c];
        }
        return ["tool", f, ""];
      }
      const isCode = (f, cfg) => !!f && (!cfg.code_ext.length || cfg.code_ext.some((x) => f.endsWith(x)));
      const RUNNER_CONFIG_RX = /(?:^|\/)(?:[^/]*\.(?:config|conf)\.[cm]?[jt]s|\.detoxrc[^/]*|\.mocharc[^/]*)$/i;
      const TEXT_RUNNER_CONFIG_RX = /(?:^|\/)(?:pytest\.ini|tox\.ini|setup\.cfg|pyproject\.toml|pom\.xml|build\.gradle(?:\.kts)?|[^/]*\.runsettings)$/i;
      const isRunnerConfig = (f) => !!f && (RUNNER_CONFIG_RX.test(f) || TEXT_RUNNER_CONFIG_RX.test(f));
      const BROWSER_SERVER = /browser|chrome|playwright|puppeteer|devtools/i;
      const BROWSER_HOUSEKEEPING = /^(?:tabs_\w+|test_\w+|(?:generator|planner)_\w+|list_connected_browsers|select_browser|switch_browser|resize_window|shortcuts_\w+|gif_creator|upload_image|file_upload|(?:browser|playwright)_(?:close|install|resize|tabs)|(?:new|close|list|select)_pages?)$/i;
      function mcpParts(tool) {
        const name = String(tool || "").replace(/^mcp__/, ""), at = name.indexOf("__");
        return at > 0 ? [name.slice(0, at), name.slice(at + 2)] : null;
      }
      const browserTool = (tool) => {
        const p = mcpParts(tool);
        return !!p && BROWSER_SERVER.test(p[0]);
      };
      function browserLook(tool) {
        return browserTool(tool) && !BROWSER_HOUSEKEEPING.test(mcpParts(tool)[1]);
      }
      const runnerAt = (names) => new RegExp(
        String.raw`(?:^|&&|\|\||[;|(\n])\s*(?:\w+=(?:"[^"]*"|'[^']*'|\S*)\s+)*(?:(?:timeout|time|env|npx)\s+(?:-\S+\s+|\d\S*\s+)*)*(?:${names})(?=\s|$)`
      );
      const JS_RUNNER = runnerAt("node|tsx|ts-node|bun|deno"), PY_RUNNER = runnerAt("python3?|py");
      const JS_BROWSER = /\b(?:require\s*\(|from\s+|import\s*\()\s*["'`][^"'`]*\b(?:playwright|puppeteer)/;
      const PY_BROWSER = /^\s*(?:from|import)\s+(?:playwright|pyppeteer)\b/m;
      const BROWSER_LAUNCH = /\b(?:chromium|firefox|webkit|puppeteer)\.(?:launch|connect)\w*\s*\(/;
      const SITE_OPEN = /\.goto\s*\(\s*(?!["'`](?:file|data|about):)/;
      function scriptLook(e) {
        const c = e.kind === "run_other" && typeof e.cmd === "string" ? e.cmd : "";
        if (!c || !BROWSER_LAUNCH.test(c) || !SITE_OPEN.test(c)) return false;
        return JS_RUNNER.test(c) && JS_BROWSER.test(c) || PY_RUNNER.test(c) && PY_BROWSER.test(c);
      }
      const isTestFile = (f, cfg) => isCode(f, cfg) && (TEST_FILE_RX.test(f) || (cfg.test_dirs || []).some((d) => ("/" + f).includes("/" + d + "/")));
      const keepBefore = (r, f, before, cfg) => {
        if (before != null && (isRunnerConfig(f) || isTestFile(f, cfg))) r.prev_content = before.slice(0, 2e5);
      };
      const HARNESS_TAGS = "command-name|command-message|command-args|local-command-caveat|local-command-stdout|local-command-stderr|browser_instruction|ide_opened_file|ide_selection|system-reminder|task-notification";
      const HARNESS_TEXT = new RegExp(
        String.raw`<(${HARNESS_TAGS})\b[^>]*>[\s\S]*?</\1>|^[ \t]*\[(?:Image: (?:source|original)\b[^\n]*|Request interrupted by user[^\]\n]*)\][ \t]*$`,
        "gm"
      );
      const HARNESS_OPEN = new RegExp(String.raw`^\s*<(?:${HARNESS_TAGS})\b`);
      function personText(text) {
        const t = String(text || "").replace(HARNESS_TEXT, "").trim();
        return HARNESS_OPEN.test(t) ? "" : t;
      }
      const SCRATCH_FILE = /^(?:\/tmp\/|\/private\/tmp\/|\/var\/folders\/)|\$|(?:^|\/)[^/]*\.tmp(?:\.[^/]*)?$/;
      const HEREDOC_AT = /<<(-?)[ \t]*(['"]?)([A-Za-z_]\w*)\2/g;
      function heredocWrites(cmd, cwd) {
        const out = [], text = String(cmd || "");
        const home = (/^(\/Users\/[^/]+|\/home\/[^/]+)/.exec(cwd || "") || [])[1] || "";
        const resolve = (p, dir) => {
          p = p.replace(/^(['"])(.*)\1$/, "$2");
          if (p.startsWith("~/") && home) return home + p.slice(1);
          if (p.startsWith("/")) return p;
          return dir ? dir.replace(/\/+$/, "") + "/" + p.replace(/^\.\//, "") : p;
        };
        let m;
        HEREDOC_AT.lastIndex = 0;
        while (m = HEREDOC_AT.exec(text)) {
          const lineStart = text.lastIndexOf("\n", m.index) + 1, lineEnd = text.indexOf("\n", m.index);
          if (lineEnd < 0) break;
          const before = text.slice(lineStart, m.index);
          const cut = Math.max(0, ...[";", "&&", "||", "|", "("].map((sep) => before.lastIndexOf(sep) < 0 ? 0 : before.lastIndexOf(sep) + sep.length));
          const head2 = before.slice(cut).trim(), rest = text.slice(HEREDOC_AT.lastIndex, lineEnd).split(/;|&&|\|\||\|/)[0];
          const prog = (head2.match(/^(?:\w+=\S*\s+)*(\S+)/) || [])[1];
          const lines = text.slice(lineEnd + 1).split("\n");
          const endAt = lines.findIndex((l) => (m[1] ? l.replace(/^\t+/, "") : l) === m[3]);
          if (endAt < 0) break;
          const body = lines.slice(0, endAt).map((l) => m[1] ? l.replace(/^\t+/, "") : l);
          HEREDOC_AT.lastIndex = lineEnd + 1 + lines.slice(0, endAt + 1).join("\n").length;
          if (prog !== "cat" && prog !== "tee" || before.slice(0, cut).endsWith("$(")) continue;
          const args = (head2.slice(prog.length) + " " + rest).trim();
          let file = null, append = false;
          if (prog === "tee") {
            append = /(?:^|\s)-a\b/.test(args);
            file = args.split(/\s+/).find((a) => a && !a.startsWith("-") && !a.startsWith(">")) || null;
          } else {
            const redirect = /(?:^|\s)(>>?)\s*("[^"]+"|'[^']+'|[^\s;&|<>]+)/.exec(args);
            if (redirect) [file, append] = [redirect[2], redirect[1] === ">>"];
          }
          if (!file || file === "/dev/null" || SCRATCH_FILE.test(file)) continue;
          const cds = [...text.slice(0, m.index).matchAll(/(?:^|[;&|\n]|&&)\s*cd\s+("[^"]+"|'[^']+'|[^\s;&|]+)/g)];
          const dir = cds.length ? resolve(cds[cds.length - 1][1], cwd) : cwd;
          const full = resolve(file, dir);
          if (!SCRATCH_FILE.test(full)) out.push({ file: full, text: body.join("\n") + "\n", append });
        }
        return out;
      }
      const SUBAGENT_LINE = "sessionlens-subagent";
      function joinSubagents(text, subs) {
        const parts = [String(text || "").replace(/\n+$/, "")];
        for (const sub of subs || []) {
          if (!sub || !String(sub.text || "").trim()) continue;
          parts.push(JSON.stringify({ type: SUBAGENT_LINE, agentId: sub.agentId || "", agentType: sub.agentType || "" }));
          parts.push(String(sub.text).replace(/\n+$/, ""));
        }
        return parts.join("\n") + "\n";
      }
      function claudeRecords(text) {
        const recs = [], types = {};
        let side = false, main2 = false;
        for (const line of text.split("\n")) {
          if (!line.trim()) continue;
          let rec;
          try {
            rec = JSON.parse(line);
          } catch {
            continue;
          }
          if (rec && rec.type === SUBAGENT_LINE) {
            if (rec.agentId) types[rec.agentId] = rec.agentType || "";
            continue;
          }
          if (rec && rec.isSidechain === true) side = true;
          else if (rec && ["user", "assistant"].includes(rec.type)) main2 = true;
          recs.push(rec);
        }
        if (side) {
          let last = "";
          const at = recs.map((r) => last = r && typeof r.timestamp === "string" && r.timestamp || last);
          const idx = recs.map((_, i) => i).sort((a, b) => at[a] < at[b] ? -1 : at[a] > at[b] ? 1 : a - b);
          return { recs: idx.map((i) => recs[i]), types, main: main2 };
        }
        return { recs, types, main: main2 };
      }
      function fromClaudeJsonl(text, cfg) {
        const files = {}, out = [], pending = {};
        let seq = 0, cwd = "";
        const base = (f) => files[f] ?? null;
        const short = (f) => cwd && f.startsWith(cwd + "/") ? f.slice(cwd.length + 1) : f;
        const { recs, types, main: main2 } = claudeRecords(text);
        for (const rec of recs) {
          if (!rec || typeof rec !== "object") continue;
          if (!cwd && typeof rec.cwd === "string") cwd = rec.cwd.replace(/\/+$/, "");
          if (rec.type && !["user", "assistant"].includes(rec.type) && !rec.message) continue;
          const msg = rec.message && typeof rec.message === "object" ? rec.message : rec;
          const role = ["user", "assistant"].includes(rec.type) ? rec.type : msg.role;
          if (!["user", "assistant"].includes(role)) continue;
          const ts = rec.timestamp || "";
          const blocks = Array.isArray(msg.content) ? msg.content : [{ type: "text", text: msg.content || "" }];
          const agent = rec.isSidechain === true && main2 ? types[rec.agentId] || "subagent" : null;
          const by = (r) => agent ? Object.assign(r, { agent }) : r;
          for (const b of blocks) {
            if (!b || typeof b !== "object") continue;
            if (b.type === "text" && (b.text || "").trim()) {
              if (agent && role === "user") continue;
              const text2 = role === "user" ? rec.isMeta === true || rec.isCompactSummary === true ? "" : personText(b.text) : b.text;
              if (!text2) continue;
              const r = by({ seq: seq++, ts, kind: role === "assistant" ? "message" : "user", text: text2 });
              if (r.kind === "message") attachCodeFromText(r);
              out.push(r);
            } else if (b.type === "tool_use" && role === "assistant") {
              const inp = toolInput(b.name || "", b.input || {});
              const [kind, f0, cmd] = classify(b.name || "", inp, cfg);
              const f = f0 && !f0.startsWith("/") && cwd && playwrightTestTool(b.name || "") ? cwd + "/" + f0 : f0;
              if (b.name === "Bash")
                for (const w of heredocWrites(inp.command, cwd)) {
                  const o = base(w.file);
                  if (w.append && o == null) continue;
                  const now = w.append ? o + w.text : w.text;
                  const x = by({ seq: seq++, ts, kind: w.append ? "edit" : "write", tool: "Bash", file: short(w.file), cmd: "" });
                  keepBefore(x, w.file, o, cfg);
                  files[w.file] = now;
                  if (o != null && isCode(w.file, cfg)) {
                    const d = compareAsserts(o, now, cfg, w.file);
                    if (d) x.assert_delta = d;
                  }
                  x.new_content = now.slice(0, 2e5);
                  out.push(x);
                }
              const r = by({ seq: seq++, ts, kind, tool: b.name, file: short(f), cmd });
              if (playwrightTestTool(b.name || "") && mcpParts(b.name || "")[1] === "planner_save_plan") {
                const plan = planMarkdown(b.input);
                if (plan) r.plan = plan.slice(0, 2e5);
              }
              if (kind === "write") {
                const o = base(f);
                keepBefore(r, f, o, cfg);
                files[f] = inp.content || "";
                if (o != null && isCode(f, cfg)) {
                  const d = compareAsserts(o, files[f], cfg, f);
                  if (d) r.assert_delta = d;
                }
              } else if (kind === "edit") {
                const o = base(f);
                keepBefore(r, f, o, cfg);
                if (o == null)
                  files[f] = inp.new_string || "";
                else {
                  const n = inp.old_string ? o.replace(inp.old_string, () => inp.new_string || "") : o + "\n" + (inp.new_string || "");
                  files[f] = n;
                  if (isCode(f, cfg)) {
                    const d = compareAsserts(o, n, cfg, f);
                    if (d) r.assert_delta = d;
                  }
                }
              }
              const whole = ["write", "edit"].includes(kind) ? files[f] : null;
              const nc = whole || inp.content || inp.new_string || "";
              if (nc) {
                r.new_content = nc.slice(0, 2e5);
                r.fragment_only = kind === "edit" && base(f) === (inp.new_string || "");
              }
              out.push(r);
              pending[b.id || ""] = r;
            } else if (b.type === "tool_result" && role === "user") {
              const r = pending[b.tool_use_id || ""];
              if (!r) continue;
              delete pending[b.tool_use_id];
              const tur = rec.toolUseResult;
              if (tur && typeof tur === "object" && !Array.isArray(tur) && ["write", "edit"].includes(r.kind)) {
                const before = typeof tur.originalFile === "string" ? tur.originalFile : null;
                let after = typeof tur.content === "string" ? tur.content : null;
                if (after == null && before != null && typeof tur.oldString === "string" && typeof tur.newString === "string")
                  after = tur.replaceAll ? before.split(tur.oldString).join(tur.newString) : before.replace(tur.oldString, () => tur.newString);
                const full = r.file ? cwd && !r.file.startsWith("/") ? cwd + "/" + r.file : r.file : "";
                if (after != null) {
                  files[full] = after;
                  keepBefore(r, r.file, before, cfg);
                  if (before != null && isCode(r.file, cfg)) {
                    const d = compareAsserts(before, after, cfg, r.file);
                    if (d) r.assert_delta = d;
                  }
                  r.new_content = after.slice(0, 2e5);
                }
              }
              const c = b.content;
              const t = typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x && x.text || "").join("\n") : JSON.stringify(c || "");
              r.text = t.slice(0, 3e3);
              if (r.kind === "run_tests") {
                const tr = parseTests(t, cfg);
                if (tr) {
                  r.tests = tr;
                  r.exit_code = tr.failed || tr.errors ? 1 : 0;
                }
              }
              if (b.is_error) r.exit_code = r.exit_code ?? 1;
            }
          }
        }
        return out;
      }
      function isCodexJsonl(text) {
        const nl = text.indexOf("\n");
        const first = (nl === -1 ? text : text.slice(0, nl)).trim();
        try {
          const r = JSON.parse(first);
          return !!r && ["session_meta", "response_item", "event_msg", "turn_context"].includes(r.type);
        } catch {
          return false;
        }
      }
      function applyUnifiedDiff(before, diff) {
        const hunks = diff.split(/\n(?=@@ )/).filter((h) => h.trim());
        if (before == null) {
          const out2 = [];
          for (const h of hunks)
            for (const line of h.split("\n").slice(1)) {
              if (line.startsWith("\\")) continue;
              if (line[0] === "+" || line[0] === " ") out2.push(line.slice(1));
            }
          return out2.join("\n");
        }
        let out = before.split("\n"), offset = 0;
        for (const h of hunks) {
          const head2 = h.match(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/);
          if (!head2) continue;
          const pos = parseInt(head2[1], 10) - 1 + offset;
          const block = [], body = h.split("\n").slice(1);
          if (body.length && body[body.length - 1] === "") body.pop();
          let consumed = 0;
          for (const line of body) {
            if (line.startsWith("\\")) continue;
            if (line[0] === "-") consumed++;
            else if (line[0] === "+") block.push(line.slice(1));
            else {
              block.push(line.slice(1));
              consumed++;
            }
          }
          out.splice(pos, consumed, ...block);
          offset += block.length - consumed;
        }
        return out.join("\n");
      }
      const CODEX_WRAP = /^#\s+(?:Context from my IDE setup|Files mentioned by the user|Files pasted by the user):/;
      function codexRequest(t) {
        if (!CODEX_WRAP.test(t)) return t;
        const m = /\n##\s+My request(?: for Codex)?:[ \t]*\n([\s\S]*)$/.exec(t);
        return m ? m[1].trim() : t;
      }
      const COMPACT_SUMMARY = /^This session is being continued from a previous conversation that ran out of context\./;
      const harnessUserText = (t) => codexRequest(t.trim()) !== t.trim() || COMPACT_SUMMARY.test(t.trim()) || CURSOR_OWN_QUERY.test(t.trim());
      function fromCodexJsonl(text, cfg) {
        const out = [], files = {}, pending = {};
        let seq = 0, cwd = "";
        const short = (f) => cwd && f.startsWith(cwd + "/") ? f.slice(cwd.length + 1) : f;
        const applied = /* @__PURE__ */ new Set();
        const applyChanges = (changes, ts) => {
          const key = JSON.stringify(changes);
          if (applied.has(key)) return;
          applied.add(key);
          for (const [path2, ch] of Object.entries(changes)) {
            if (!ch) continue;
            if (ch.type === "delete") {
              out.push({ seq: seq++, ts, kind: "delete", file: short(path2) });
              delete files[path2];
              continue;
            }
            const before = Object.prototype.hasOwnProperty.call(files, path2) ? files[path2] : null;
            let after = null;
            if (ch.type === "add" && typeof ch.content === "string") after = ch.content;
            else if (ch.type === "update" && typeof ch.unified_diff === "string") after = applyUnifiedDiff(before, ch.unified_diff);
            if (after == null) continue;
            const to = ch.type === "update" && typeof ch.move_path === "string" && ch.move_path ? ch.move_path : path2;
            if (to !== path2) delete files[path2];
            const f = short(to), r = { seq: seq++, ts, kind: ch.type === "add" ? "write" : "edit", file: f, new_content: after.slice(0, 2e5) };
            keepBefore(r, f, before, cfg);
            if (before == null) r.fragment_only = true;
            else if (isCode(f, cfg)) {
              const d = compareAsserts(before, after, cfg, f);
              if (d) r.assert_delta = d;
            }
            files[to] = after;
            out.push(r);
          }
        };
        for (const line of text.split("\n")) {
          if (!line.trim()) continue;
          let rec;
          try {
            rec = JSON.parse(line);
          } catch {
            continue;
          }
          const p = rec.payload;
          const ts = rec.timestamp || "";
          if (rec.type === "session_meta") {
            if (p && typeof p.cwd === "string") cwd = p.cwd.replace(/\/+$/, "");
            continue;
          }
          if (rec.type === "event_msg") {
            if (p && p.type === "patch_apply_end" && p.changes) applyChanges(p.changes, ts);
            else if (p && p.type === "item_completed" && p.item && p.item.type === "FileChange" && p.item.changes) {
              if (p.item.status == null || p.item.status === "completed") applyChanges(p.item.changes, ts);
            }
            continue;
          }
          if (rec.type !== "response_item" || !p) continue;
          if (p.type === "message") {
            const role = p.role;
            if (role !== "user" && role !== "assistant") continue;
            if (role === "user") {
              const kinds = (p.internal_chat_message_metadata_passthrough || {}).content_item_kinds;
              if (Array.isArray(kinds) && kinds.length && !kinds.includes("user.text")) continue;
            }
            const joined = (Array.isArray(p.content) ? p.content : []).map((b) => b && b.text || "").join("\n").trim();
            const t = role === "user" ? codexRequest(joined) : joined;
            if (t) {
              const r = { seq: seq++, ts, kind: role === "assistant" ? "message" : "user", text: t };
              if (r.kind === "message") attachCodeFromText(r);
              out.push(r);
            }
            continue;
          }
          if (p.type === "function_call" || p.type === "custom_tool_call") {
            const name = p.name || "";
            let cmd = null;
            if (name === "shell" && typeof p.arguments === "string") {
              try {
                const a = JSON.parse(p.arguments);
                cmd = Array.isArray(a.command) ? a.command.join(" ") : a.command || null;
              } catch {
              }
            } else if (typeof p.input === "string") {
              const cmds = [...p.input.matchAll(/(?:"cmd"|(?<![\w$."'])cmd)\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => {
                try {
                  return JSON.parse('"' + m[1] + '"');
                } catch {
                  return m[1];
                }
              });
              if (cmds.length) cmd = cmds.join("; ");
            }
            const r = cmd == null ? { seq: seq++, ts, kind: "tool", tool: name } : { seq: seq++, ts, kind: isTestRun(cmd, cfg) ? "run_tests" : /^\s*git /.test(cmd) ? "git" : "run_other", cmd };
            if (cmd != null && p.type === "custom_tool_call") r.tool = name;
            out.push(r);
            if (p.call_id) pending[p.call_id] = r;
            continue;
          }
          if (p.type === "function_call_output" || p.type === "custom_tool_call_output") {
            const r = pending[p.call_id];
            if (!r) continue;
            delete pending[p.call_id];
            const o = p.output;
            const t = typeof o === "string" ? o : Array.isArray(o) ? o.map((x) => x && x.text || "").join("\n") : JSON.stringify(o || "");
            r.text = t.slice(0, 3e3);
            if (r.kind === "run_tests") {
              const tr = parseTests(t, cfg);
              if (tr) {
                r.tests = tr;
                r.exit_code = tr.failed || tr.errors ? 1 : 0;
              }
            }
            continue;
          }
        }
        return out;
      }
      function isCursorJsonl(text) {
        const nl = text.indexOf("\n");
        const first = (nl === -1 ? text : text.slice(0, nl)).trim();
        try {
          const r = JSON.parse(first);
          if (!r || typeof r !== "object") return false;
          if (r.type === "turn_ended") return true;
          return !r.type && ["user", "assistant"].includes(r.role) && !!r.message && Array.isArray(r.message.content);
        } catch {
          return false;
        }
      }
      const CURSOR_TOOLS = { Shell: "Bash", StrReplace: "Edit", Write: "Write", Read: "Read", Grep: "Grep", Glob: "Glob", Delete: "Delete" };
      const toolPart = (x) => typeof x === "string" ? x.replace(/[^\w.-]/g, "").slice(0, 80) : "";
      const mcpName = (server, tool) => toolPart(server) && toolPart(tool) ? `mcp__${toolPart(server)}__${toolPart(tool)}` : "";
      function cursorDynamicName(input) {
        if (!input || typeof input !== "object") return "";
        return input.namespace === "cursor" ? toolPart(input.toolName) : mcpName(input.namespace, input.toolName);
      }
      const cursorArgs = (a) => a && typeof a === "object" && !Array.isArray(a) ? a : null;
      function cursorInput(name, input) {
        const o = Object.assign({}, input);
        if (o.path != null && o.file_path == null) o.file_path = o.path;
        if (o.contents != null && o.content == null) o.content = o.contents;
        if (name === "Glob") {
          if (!o.path && o.target_directory) o.path = o.target_directory;
          if (!o.pattern && o.glob_pattern) o.pattern = o.glob_pattern;
        }
        return o;
      }
      const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      function cursorTime(s) {
        const m = /\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?\s*\(UTC(?:([+-])(\d{1,2})(?::?(\d{2}))?)?\)/i.exec(s);
        const mon = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
        if (mon < 0) return "";
        let h = Number(m[4]) % 12;
        if (!m[7] || m[7].toUpperCase() === "PM") h = m[7] ? h + 12 : Number(m[4]);
        const offset = m[8] ? (m[8] === "-" ? -1 : 1) * (Number(m[9]) * 60 + Number(m[10] || 0)) : 0;
        const ms = Date.UTC(Number(m[3]), mon, Number(m[2]), h, Number(m[5]), Number(m[6] || 0)) - offset * 6e4;
        return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
      }
      const CURSOR_OWN_QUERY = /^Briefly inform the user about the task result and perform any follow-up actions \(if needed\)\.$/;
      function cursorUserText(t) {
        const when = /<timestamp>([\s\S]*?)<\/timestamp>/.exec(t);
        const query = /<user_query>([\s\S]*?)<\/user_query>/.exec(t);
        const text = (query ? query[1] : t.replace(/<timestamp>[\s\S]*?<\/timestamp>/g, "")).trim();
        return { text: CURSOR_OWN_QUERY.test(text) ? "" : text, ts: when ? cursorTime(when[1]) : "" };
      }
      const cursorProjectSlug = (p) => p.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      function cursorRoot(paths, project) {
        for (const p of paths)
          for (let d = p.replace(/\/+$/, ""); d.startsWith("/"); d = d.slice(0, d.lastIndexOf("/"))) if (cursorProjectSlug(d) === project) return d;
        return "";
      }
      const samePath = (a, b) => a === b || a.endsWith("/" + b) || b.endsWith("/" + a);
      function fromCursorJsonl(text, cfg, outputs, project, edits) {
        const lines = [], names = [], paths = [], done = /* @__PURE__ */ new Set(), outs = Array.isArray(outputs) ? outputs.filter((o) => o && typeof o.command === "string" && typeof o.output === "string") : [], eds = Array.isArray(edits) ? edits.filter((e) => e && typeof e.path === "string" && typeof e.before === "string" && typeof e.after === "string") : [], used = /* @__PURE__ */ new Set();
        let next = 0;
        for (const line of text.split("\n")) {
          if (!line.trim()) continue;
          let rec;
          try {
            rec = JSON.parse(line);
          } catch {
            continue;
          }
          if (!rec || !["user", "assistant"].includes(rec.role) || !rec.message) continue;
          let ts = "";
          const content = [], results = [], versions = [];
          for (const b of Array.isArray(rec.message.content) ? rec.message.content : []) {
            if (!b || typeof b !== "object") continue;
            if (b.type === "text" && rec.role === "user") {
              const u = cursorUserText(b.text || "");
              if (u.ts) ts = u.ts;
              if (u.text) content.push({ type: "text", text: u.text });
            } else if (b.type === "text") content.push({ type: "text", text: b.text || "" });
            else if (b.type === "tool_use" && rec.role === "assistant") {
              const raw = String(b.name || ""), name = raw === "CallDynamicTool" && cursorDynamicName(b.input) || raw, input = cursorInput(name, raw === "CallDynamicTool" && playwrightTestTool(name) && cursorArgs(b.input && b.input.arguments) || b.input || {});
              const as = name === "StrReplace" && !input.file_path ? name : CURSOR_TOOLS[name] || name;
              const id = "cursor-" + names.length;
              content.push({ type: "tool_use", id, name: as, input });
              names.push(name);
              if (typeof input.file_path === "string") paths.push(input.file_path);
              if ((name === "Write" || name === "StrReplace") && typeof input.file_path === "string" && eds.length) {
                const now = String((name === "Write" ? input.content : input.new_string) ?? "");
                const k2 = eds.findIndex(
                  (e, i2) => !used.has(i2) && samePath(e.path, input.file_path) && (name === "Write" ? e.after.trimEnd() === now.trimEnd() : e.after.includes(now))
                );
                if (k2 >= 0) {
                  used.add(k2);
                  const e = eds[k2];
                  versions.push({ id, before: e.before === "" && name === "Write" ? null : e.before, after: e.after });
                }
              }
              if (name !== "Shell" || typeof input.command !== "string") continue;
              const k = outs.findIndex((o2, i2) => i2 >= next && o2.command.trim() === input.command.trim());
              if (k < 0) continue;
              next = k + 1;
              done.add(id);
              const o = outs[k];
              results.push({ type: "tool_result", tool_use_id: id, content: o.output, is_error: Number.isInteger(o.exitCode) && o.exitCode !== 0 });
            }
          }
          if (content.length) lines.push(JSON.stringify({ type: rec.role, timestamp: ts, message: { role: rec.role, content } }));
          if (results.length) lines.push(JSON.stringify({ type: "user", timestamp: "", message: { role: "user", content: results } }));
          for (const v of versions)
            lines.push(
              JSON.stringify({
                type: "user",
                timestamp: "",
                toolUseResult: { originalFile: v.before, content: v.after },
                message: { role: "user", content: [{ type: "tool_result", tool_use_id: v.id, content: "ok" }] }
              })
            );
        }
        const root = typeof project === "string" && project ? cursorRoot(paths, project) : "";
        if (root) lines.unshift(JSON.stringify({ type: "system", cwd: root }));
        const out = fromClaudeJsonl(lines.join("\n"), cfg);
        let i = 0;
        for (const e of out) {
          if (!e.tool) continue;
          const id = "cursor-" + i;
          e.tool = names[i++];
          if (e.kind === "run_tests" && !done.has(id)) e.output_missing = true;
        }
        return out;
      }
      function isCursorStreamJson(text) {
        let n = 0;
        for (const line of text.slice(0, 2e5).split("\n")) {
          if (!line.trim()) continue;
          if (++n > 400) break;
          let r;
          try {
            r = JSON.parse(line);
          } catch {
            continue;
          }
          if (!r || typeof r !== "object") continue;
          if (r.type === "tool_call" && r.tool_call && typeof r.tool_call === "object") return true;
          if (r.type === "system" && r.subtype === "init" && Array.isArray(r.tools)) return false;
          const c = r.message && r.message.content;
          if (Array.isArray(c) && c.some((b) => b && b.type === "tool_use")) return false;
        }
        return false;
      }
      const CURSOR_STREAM_TOOLS = { readToolCall: "Read", grepToolCall: "Grep", globToolCall: "Glob", lsToolCall: "LS", deleteToolCall: "Delete" };
      function cursorStreamCall(kind, args, result) {
        const ok = result && typeof result === "object" ? result.success : null;
        const path2 = typeof args.path === "string" ? args.path : "";
        const text = (v) => typeof v === "string" ? v : v == null ? null : JSON.stringify(v);
        if (kind === "editToolCall") {
          const after = ok && typeof ok.afterFullFileContent === "string" ? ok.afterFullFileContent : null;
          if (after == null) return ["EditNotApplied", { file_path: path2 }, text(result), null, true, "Edit"];
          const before = typeof ok.beforeFullFileContent === "string" ? ok.beforeFullFileContent : null;
          return before == null ? ["Write", { file_path: path2, content: after }, ok.message || "", { content: after }, false, "Write"] : ["Edit", { file_path: path2 }, ok.message || "", { originalFile: before, content: after }, false, "Edit"];
        }
        if (kind === "shellToolCall") {
          const r = result && typeof result === "object" ? result.success || result.failure : null;
          const out = r ? typeof r.interleavedOutput === "string" && r.interleavedOutput || [r.stdout, r.stderr].filter((x) => typeof x === "string" && x).join("\n") : "";
          const code = r && Number.isInteger(r.exitCode) ? r.exitCode : null;
          return ["Bash", { command: String(args.command || "") }, r && (out || code != null) ? out : null, null, code != null && code !== 0, "Shell"];
        }
        if (kind === "mcpToolCall") {
          const name = String(args.toolName || args.name || "mcp");
          const own = typeof args.name === "string" && args.name.endsWith("-" + name) ? args.name.slice(0, -name.length - 1) : "";
          const full = mcpName(args.serverIdentifier || args.providerIdentifier || own, name);
          return [full || "mcp:" + name, full && playwrightTestTool(full) && cursorArgs(args.args) || {}, text(ok && ok.content), null, false, full || name];
        }
        const as = CURSOR_STREAM_TOOLS[kind];
        if (!as) return [kind.replace(/ToolCall$/, ""), {}, text(ok), null, false, kind.replace(/ToolCall$/, "")];
        const input = kind === "globToolCall" ? { path: args.targetDirectory || "", pattern: args.globPattern || "" } : kind === "grepToolCall" ? { path: path2, pattern: args.pattern || "" } : { file_path: path2 };
        return [as, input, kind === "readToolCall" ? text(ok && ok.content) : text(ok), null, !ok && !!result, as];
      }
      function fromCursorStreamJson(text, cfg) {
        const recs = [];
        const calls = {}, names = [], missing = /* @__PURE__ */ new Set();
        let pendingTs = [];
        const stamp = (rec) => {
          const ms = Number(rec.timestamp_ms);
          const ts = Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : "";
          if (ts) {
            for (const r of pendingTs) r.timestamp = ts;
            pendingTs = [];
          }
          return ts;
        };
        for (const line of text.split("\n")) {
          if (!line.trim()) continue;
          let rec;
          try {
            rec = JSON.parse(line);
          } catch {
            continue;
          }
          if (!rec || typeof rec !== "object") continue;
          const ts = stamp(rec);
          if (rec.type === "system" && typeof rec.cwd === "string") recs.push({ type: "system", cwd: rec.cwd });
          else if ((rec.type === "user" || rec.type === "assistant") && rec.message && Array.isArray(rec.message.content)) {
            const content = rec.message.content.filter((b) => b && b.type === "text" && typeof b.text === "string");
            if (!content.length) continue;
            const r = { type: rec.type, timestamp: ts, message: { role: rec.type, content } };
            if (!ts) pendingTs.push(r);
            recs.push(r);
          } else if (rec.type === "tool_call" && rec.tool_call && typeof rec.tool_call === "object") {
            const kind = Object.keys(rec.tool_call).find((k) => /ToolCall$/.test(k));
            if (!kind) continue;
            const body = rec.tool_call[kind] || {};
            const id = String(rec.call_id || rec.tool_call.toolCallId || "call-" + recs.length);
            let c = calls[id];
            if (!c) {
              c = calls[id] = { kind, args: {}, result: null, ts };
              recs.push({ call: c });
            }
            if (body.args && typeof body.args === "object") c.args = body.args;
            if (rec.subtype === "completed" && body.result) c.result = body.result;
          }
        }
        const lines = [];
        for (const r of recs) {
          if (!r.call) {
            lines.push(JSON.stringify(r));
            continue;
          }
          const c = r.call;
          const [as, input, result, tur, isError, name] = cursorStreamCall(c.kind, c.args, c.result);
          const id = "cursor-" + names.length;
          names.push(name);
          lines.push(JSON.stringify({ type: "assistant", timestamp: c.ts, message: { role: "assistant", content: [{ type: "tool_use", id, name: as, input }] } }));
          if (result == null) {
            missing.add(id);
            continue;
          }
          const res = {
            type: "user",
            timestamp: c.ts,
            message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: result, is_error: isError }] }
          };
          if (tur) res.toolUseResult = tur;
          lines.push(JSON.stringify(res));
        }
        const out = fromClaudeJsonl(lines.join("\n"), cfg);
        let i = 0;
        for (const e of out) {
          if (!e.tool) continue;
          const id = "cursor-" + i;
          e.tool = names[i++];
          if (e.kind === "run_tests" && missing.has(id)) e.output_missing = true;
        }
        return out;
      }
      const CODE_LINE = /^\s*(?:import\s|from\s+\S+\s+import|export\s|const\s|let\s|await\s|test\s*\(|test\.describe|test\.skip|it\s*\(|expect\s*\(|def\s+test|@Test|assert\w*\s*\(|assert\s|func\s+Test|\}\);?\s*$)/;
      const isCodeLine = (l) => CODE_LINE.test(l) || /^\s{2,}\S/.test(l) || /^\s*[\]\}\)]/.test(l) || /^\s*(?:\/\/|\/\*|\*|#)/.test(l) || l.trim() === "";
      const hasTests = (c) => /def test|@Test|\b(?:it|test)\s*\(|test\.skip|func Test|expect\s*\(|assert/.test(c);
      const DIFF_LINE = /^(?:[+\- ]|@@|\\ No newline|$)/;
      function diffAfter(lang, code) {
        const ls = code.split("\n");
        const isDiff = /^(?:diff|patch)$/i.test(lang || "") || ls.every((l) => DIFF_LINE.test(l)) && (ls.some((l) => l.startsWith("@@")) || ls.some((l) => /^\+(?!\+\+ )/.test(l)) && ls.some((l) => /^-(?!-- )/.test(l)));
        if (!isDiff) return code;
        return ls.filter((l) => !/^(?:-|@@|\+\+\+ |\\ No newline|diff |index )/.test(l)).map((l) => /^[+ ]/.test(l) ? l.slice(1) : l).join("\n");
      }
      function attachCodeFromText(r) {
        let versions = [...r.text.matchAll(/```(\w+)?\n([\s\S]*?)```/g)].map((m) => diffAfter(m[1], m[2]));
        if (!versions.length) {
          const ls = r.text.split("\n");
          const runs = [];
          let cur = [], prose = 0;
          for (const l of ls) {
            if (isCodeLine(l)) {
              if (l.trim() !== "") prose = 0;
              cur.push(l);
            } else {
              const real = cur.filter((x) => CODE_LINE.test(x)).length;
              if (real >= 3) {
                runs.push(cur.join("\n"));
                cur = [];
              } else if (real === 0) cur = [];
              else cur.push(l);
            }
          }
          if (cur.filter((x) => CODE_LINE.test(x)).length >= 3) runs.push(cur.join("\n"));
          versions = runs.map((r2) => {
            const ls2 = r2.split("\n");
            const i = ls2.findIndex((x) => CODE_LINE.test(x));
            return ls2.slice(Math.max(0, i)).join("\n").replace(/\s+$/, "");
          });
        }
        versions = versions.filter(hasTests);
        if (!versions.length) return;
        r.new_content = versions[versions.length - 1];
        if (versions.length > 1) r.code_versions = versions;
      }
      const TOOL_LINE = /^[⏺●>\-\*\s]*(Read|Write|Edit|MultiEdit|Bash|Grep|Glob|Search)\s*\((.*)\)\s*$/;
      const USER_LINE = /^(?:>|User:|Пользователь:|Human:)\s*(.*)$/i;
      const ASSIST_LINE = /^(?:Assistant:|Claude:|Агент:)\s*(.*)$/i;
      function fromText(text, cfg) {
        const out = [];
        let seq = 0, role = "message", buf = [], last = null;
        const flush = () => {
          const t = buf.join("\n").trim();
          if (t) out.push({ seq: seq++, ts: "", kind: role, text: t });
          buf = [];
        };
        for (const line of text.split("\n")) {
          let m = line.match(TOOL_LINE);
          if (m) {
            flush();
            const tool = m[1], arg = m[2].trim().replace(/^['"]|['"]$/g, "");
            const inp = tool === "Bash" ? { command: arg } : { file_path: arg };
            const [kind, f, cmd] = classify(tool, inp, cfg);
            last = /** @type {any} */
            { seq: seq++, ts: "", kind, tool, file: f, cmd };
            out.push(last);
            continue;
          }
          m = line.match(USER_LINE);
          if (m) {
            flush();
            role = "user";
            buf.push(m[1]);
            continue;
          }
          m = line.match(ASSIST_LINE);
          if (m) {
            flush();
            role = "message";
            buf.push(m[1]);
            continue;
          }
          if (last && last.kind === "run_tests" && /\d+ (passed|failed|total)|Tests run:|--- (?:FAIL|PASS)|^ok\s|^FAIL\s/.test(line)) {
            const tr = parseTests(line, cfg);
            if (tr) {
              last.tests = tr;
              last.exit_code = tr.failed || tr.errors ? 1 : 0;
              last.text = ((last.text || "") + "\n" + line).slice(-3e3);
              continue;
            }
          }
          if (last && last.kind === "run_tests" && /^FAILED/.test(line)) {
            last.tests = last.tests || { passed: 0, failed: 0, errors: 0, failed_names: [] };
            last.tests.failed_names.push(...[...line.matchAll(/FAILED ([\w/.\-]+::[\w\[\]\-]+)/g)].map((x) => x[1]));
            continue;
          }
          buf.push(line);
        }
        flush();
        for (const r of out) if (r.kind === "message") attachCodeFromText(r);
        return out;
      }
      function fromClaudeAiExport(obj, cfg) {
        const convs = Array.isArray(obj) ? obj : [obj];
        return convs.filter((c) => c && Array.isArray(c.chat_messages)).map((c) => {
          const lines = c.chat_messages.map((m) => {
            const role = m.sender === "human" ? "user" : "assistant";
            const content = Array.isArray(m.content) && m.content.length ? m.content : [{ type: "text", text: m.text || "" }];
            return JSON.stringify({ type: role, timestamp: m.created_at || "", message: { role, content } });
          });
          return { name: c.name || c.uuid || "conversation", events: stripNonSource(diffMessageVersions(fromClaudeJsonl(lines.join("\n"), cfg), cfg), cfg) };
        }).filter((c) => c.events.length);
      }
      function diffMessageVersions(events, cfg) {
        if (!cfg.test_fn_pattern) return events;
        let prev = null;
        for (const e of events) {
          if (e.kind !== "message" || !e.new_content) continue;
          const versions = e.code_versions || [e.new_content];
          for (const code of versions) {
            const names = Object.keys(blocksByTest(code, cfg.test_fn_pattern));
            if (prev && names.some((n) => prev.names.includes(n))) {
              const d = compareAsserts(prev.code, code, cfg);
              if (d) {
                d.identical = prev.code.trim() === code.trim();
                d.version = prev.v + 1;
                d.changed = !d.identical && (d.weakened.length || d.removed.length || d.old !== d.new);
                e.assert_delta = d;
                e.file = e.file || T("in_msgs", { v: d.version });
              }
              prev = { code, names: [.../* @__PURE__ */ new Set([...prev.names, ...names])], v: prev.v + 1 };
            } else if (names.length) prev = { code, names, v: 1 };
          }
        }
        return events;
      }
      const NOT_SOURCE = /\.(?:json|jsonc|md|txt|ya?ml|lock|gitignore|env|toml|ini|cfg)$/i;
      const DOC_RX = /\.(?:md|markdown|txt|rst|adoc)$/i;
      function stripNonSource(events, cfg) {
        for (const e of events) {
          if (!e.new_content || !e.file) continue;
          if (/\.feature$/i.test(e.file)) continue;
          const ext = (cfg.code_ext || []).some((x) => e.file.endsWith(x));
          if (!ext && (NOT_SOURCE.test(e.file) || (cfg.code_ext || []).length)) {
            if (DOC_RX.test(e.file) && !e.fragment_only) e.doc_content = e.new_content.slice(0, 1e5);
            if (TEXT_RUNNER_CONFIG_RX.test(e.file)) e.config_content = e.new_content;
            else delete e.prev_content;
            delete e.new_content;
            delete e.code_versions;
          }
        }
        return events;
      }
      const HOME_AT = /(^|[\s"'`=(:;|&<>])(?:\/Users\/(?!Shared\/)[^/\s"'`]+|\/home\/[^/\s"'`]+|[A-Za-z]:[\\/]Users[\\/][^\\/\s"'`]+)(?=[\\/])/g;
      const homeless = (s) => typeof s === "string" ? s.replace(HOME_AT, "$1~") : s;
      function fromHome(ev) {
        for (const e of Array.isArray(ev) ? ev : []) {
          if (e && e.events) fromHome(e.events);
          else if (e) {
            if (typeof e.file === "string") e.file = homeless(e.file);
            if (typeof e.cmd === "string") e.cmd = homeless(e.cmd);
          }
        }
        return ev;
      }
      function importAny(text, cfg, opts) {
        return fromHome(importAll(text, cfg, opts));
      }
      function importAll(text, cfg, opts) {
        const t = text.trimStart();
        if (t.startsWith("[") || t.startsWith("{") && /"chat_messages"/.test(t.slice(0, 5e3))) {
          try {
            const c = fromClaudeAiExport(JSON.parse(text), cfg);
            if (c.length) return c.length === 1 ? c[0].events : c;
          } catch {
          }
        }
        if (t.startsWith("{") && isCursorStreamJson(t)) return stripNonSource(diffMessageVersions(fromCursorStreamJson(text, cfg), cfg), cfg);
        if (t.startsWith("{") && isCursorJsonl(t))
          return stripNonSource(
            diffMessageVersions(fromCursorJsonl(text, cfg, opts && opts.cursorOutputs, opts && opts.cursorProject, opts && opts.cursorEdits), cfg),
            cfg
          );
        if (t.startsWith("{") && isCodexJsonl(t)) return stripNonSource(diffMessageVersions(fromCodexJsonl(text, cfg), cfg), cfg);
        const ev = t.startsWith("{") ? fromClaudeJsonl(text, cfg) : fromText(text, cfg);
        return stripNonSource(diffMessageVersions(ev, cfg), cfg);
      }
      const AGENTS = ["claude-code", "codex", "cursor", "claude-ai", "text"];
      const cleanProject = (p) => typeof p === "string" && !/[\u0000-\u001f]/.test(p) ? p.replace(/(.)[\\/]+$/, "$1").slice(0, 500) : "";
      const WORK_DIR = /^(?:tests?|__tests__|e2e|specs?|src|cypress|pages|playwright)$/i;
      function projectOf(s, base) {
        const files = (s && s.events || []).filter((e) => (e.kind === "write" || e.kind === "edit") && e.file).map((e) => e.file);
        const out = files.filter((f) => /^(?:\/|~\/|[A-Za-z]:[\\/])/.test(f));
        if (!out.length || out.length * 2 <= files.length) return base || "";
        const parts = out.map((f) => f.replace(/\\/g, "/").split("/").slice(0, -1));
        const common = [];
        for (let i = 0; parts.every((p) => i < p.length && p[i] === parts[0][i]); i++) common.push(parts[0][i]);
        const cut = common.findIndex((seg, i) => i > 0 && WORK_DIR.test(seg));
        const dir = (cut > 0 ? common.slice(0, cut) : common).join("/");
        return dir && dir !== "~" && dir !== "" ? cleanProject(dir) : base || "";
      }
      function firstCwd(text, pick) {
        for (const line of text.split("\n")) {
          if (!line.includes('"cwd"')) continue;
          try {
            const p = cleanProject(pick(JSON.parse(line)));
            if (p) return p;
          } catch {
          }
        }
        return "";
      }
      const GROUP_MAX = 60;
      function cleanGroup(g) {
        if (typeof g !== "string" || /[\u0000-\u001f\u007f]/.test(g)) return "";
        return g.replace(/\s+/g, " ").trim().slice(0, GROUP_MAX).trim();
      }
      function transcriptOrigin(text, opts) {
        const t = typeof text === "string" ? text.trimStart() : "";
        if (!t) return { agent: "", project: "" };
        if (t.startsWith("[") || t.startsWith("{") && /"chat_messages"/.test(t.slice(0, 5e3))) {
          try {
            const o = JSON.parse(t);
            if ((Array.isArray(o) ? o : [o]).some((c) => c && Array.isArray(c.chat_messages))) return { agent: "claude-ai", project: "" };
          } catch {
          }
        }
        if (!t.startsWith("{")) return { agent: "text", project: "" };
        if (isCursorStreamJson(t)) return { agent: "cursor", project: firstCwd(t, (r) => r && r.type === "system" && r.cwd) };
        if (isCursorJsonl(t)) return { agent: "cursor", project: cleanProject(opts && opts.cursorProject) };
        if (isCodexJsonl(t)) return { agent: "codex", project: firstCwd(t, (r) => r && r.type === "session_meta" && r.payload && r.payload.cwd) };
        return { agent: "claude-code", project: firstCwd(t, (r) => r && r.cwd) };
      }
      function usageOf(text, opts) {
        const t = typeof text === "string" ? text.trimStart() : "";
        if (!t.startsWith("{")) return null;
        const num2 = (v) => typeof v === "number" && isFinite(v) && v >= 0 ? v : 0;
        const out = (o) => o.input || o.output ? o : null;
        const byModel = {};
        const add = (model, input, cached, cacheWrite, output) => {
          const k = typeof model === "string" ? model.slice(0, 100) : "";
          const b = byModel[k] || (byModel[k] = { input: 0, cached: 0, cacheWrite: 0, output: 0 });
          b.input += input;
          b.cached += cached;
          b.cacheWrite += cacheWrite;
          b.output += output;
        };
        if (isCursorStreamJson(t)) {
          const s = { input: 0, cached: 0, cacheWrite: 0, output: 0 }, ms = /* @__PURE__ */ new Set();
          let model = "";
          for (const line of t.split("\n")) {
            if (!line.includes('"usage"') && !line.includes('"init"')) continue;
            let r;
            try {
              r = JSON.parse(line);
            } catch {
              continue;
            }
            if (r && r.type === "system" && typeof r.model === "string") model = r.model;
            const u = r && r.type === "result" && r.usage;
            if (!u || typeof u !== "object") continue;
            const cached = num2(u.cacheReadTokens), write = num2(u.cacheWriteTokens), input = num2(u.inputTokens) + cached + write, output = num2(u.outputTokens);
            s.input += input;
            s.cached += cached;
            s.cacheWrite += write;
            s.output += output;
            if (model) ms.add(model);
            add(model, input, cached, write, output);
          }
          return out({ ...s, requests: null, models: [...ms], byModel });
        }
        if (isCursorJsonl(t)) {
          const u = opts && opts.cursorUsage;
          if (!u || typeof u !== "object") return null;
          const bm = u.byModel && typeof u.byModel === "object" ? u.byModel : {};
          for (const [m, b] of Object.entries(bm).slice(0, 20))
            if (b && typeof b === "object") add(m, num2(b.input), num2(b.cached), num2(b.cacheWrite), num2(b.output));
          return out({
            input: num2(u.input),
            cached: num2(u.cached),
            cacheWrite: num2(u.cacheWrite),
            output: num2(u.output),
            requests: Number.isInteger(u.requests) ? u.requests : null,
            models: Array.isArray(u.models) ? u.models.filter((m) => typeof m === "string").slice(0, 10) : [],
            byModel
          });
        }
        const codex = isCodexJsonl(t);
        const seen = /* @__PURE__ */ new Set(), models = /* @__PURE__ */ new Set();
        const sum = { input: 0, cached: 0, cacheWrite: 0, output: 0, requests: 0 };
        let total = null, current = "";
        const limitsSeen = [];
        for (const line of t.split("\n")) {
          if (!line.includes(codex ? '"token_count"' : '"usage"') && !(codex && line.includes('"turn_context"'))) continue;
          let r;
          try {
            r = JSON.parse(line);
          } catch {
            continue;
          }
          if (codex) {
            const p = r && r.payload;
            if (r && r.type === "turn_context" && p && typeof p.model === "string") models.add(current = p.model);
            if (p && p.type === "token_count" && p.rate_limits && typeof p.rate_limits === "object") limitsSeen.push(p.rate_limits);
            if (p && p.type === "token_count" && p.info && p.info.total_token_usage) {
              const tt = (u2) => num2(u2.total_tokens) || num2(u2.input_tokens) + num2(u2.output_tokens);
              const grew = !total || tt(p.info.total_token_usage) > tt(total);
              total = p.info.total_token_usage;
              const l = p.info.last_token_usage;
              if (grew && l && typeof l === "object")
                add(current, num2(l.input_tokens), num2(l.cached_input_tokens), num2(l.cache_write_input_tokens), num2(l.output_tokens));
            }
            continue;
          }
          const m = r && r.type === "assistant" && r.message;
          if (!m || !m.usage || typeof m.usage !== "object") continue;
          const key = m.id || r.requestId || r.uuid;
          if (key && seen.has(key)) continue;
          if (key) seen.add(key);
          const u = m.usage;
          const real = typeof m.model === "string" && m.model && !m.model.startsWith("<") ? m.model : "";
          const inp = num2(u.input_tokens) + num2(u.cache_read_input_tokens) + num2(u.cache_creation_input_tokens);
          sum.cached += num2(u.cache_read_input_tokens);
          sum.cacheWrite += num2(u.cache_creation_input_tokens);
          sum.input += inp;
          sum.output += num2(u.output_tokens);
          sum.requests++;
          if (real) models.add(real);
          if (inp || num2(u.output_tokens)) add(real, inp, num2(u.cache_read_input_tokens), num2(u.cache_creation_input_tokens), num2(u.output_tokens));
        }
        if (codex)
          return total ? out({
            input: num2(total.input_tokens),
            cached: num2(total.cached_input_tokens),
            cacheWrite: num2(total.cache_write_input_tokens),
            output: num2(total.output_tokens),
            requests: null,
            models: [...models],
            byModel,
            limits: codexLimits(limitsSeen)
          }) : null;
        return out(Object.assign(sum, { models: [...models], byModel }));
      }
      function codexLimits(seen) {
        if (!seen.length) return null;
        const pct = (v) => typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(100, v)) : null;
        const windows = [];
        for (const slot of ["primary", "secondary"]) {
          const recs = seen.map((r) => r[slot]).filter((w) => w && pct(w.used_percent) !== null && Number.isFinite(w.window_minutes));
          if (!recs.length) continue;
          let used = 0, spans = 1, start = pct(recs[0].used_percent), last = start, reset = recs[0].resets_at;
          for (const w of recs.slice(1)) {
            if (Number.isFinite(w.resets_at) && Number.isFinite(reset) && w.resets_at - reset > 120) {
              used += Math.max(0, last - start);
              spans++;
              start = 0;
            }
            reset = w.resets_at;
            last = pct(w.used_percent);
          }
          used += Math.max(0, last - start);
          windows.push({ minutes: recs[0].window_minutes, used: +used.toFixed(1), spans, from: pct(recs[0].used_percent), to: last });
        }
        if (!windows.length) return null;
        const plan = seen.map((r) => r.plan_type).filter((p) => typeof p === "string" && p)[0] || "";
        return { plan: plan.slice(0, 40), windows };
      }
      function normPrices(o) {
        const out = {};
        if (!o || typeof o !== "object" || Array.isArray(o)) return out;
        const price = (v) => typeof v === "number" && isFinite(v) && v >= 0 && v <= 1e5 ? v : void 0;
        for (const [k, v] of Object.entries(o).slice(0, 200)) {
          if (typeof k !== "string" || !k.trim() || k.length > 100 || /[\u0000-\u001f]/.test(k) || !v || typeof v !== "object") continue;
          const p = { input: price(v.input), output: price(v.output) };
          if (p.input === void 0 || p.output === void 0) continue;
          if (price(v.cacheRead) !== void 0) p.cacheRead = price(v.cacheRead);
          if (price(v.cacheWrite) !== void 0) p.cacheWrite = price(v.cacheWrite);
          if (typeof v.label === "string" && v.label.trim() && v.label.length <= 40 && !/[\u0000-\u001f]/.test(v.label)) p.label = v.label.trim();
          out[k.trim()] = p;
        }
        return out;
      }
      function priceFor(model, prices) {
        const m = String(model || "").toLowerCase();
        let best = null, len = -1;
        for (const [k, p] of Object.entries(prices)) {
          const key = k.toLowerCase();
          if (key === m) return p;
          if (key.endsWith("*") && m.startsWith(key.slice(0, -1)) && key.length > len) [best, len] = [p, key.length];
        }
        return best;
      }
      function usageCost(usage, prices) {
        const bm = usage && usage.byModel;
        if (!bm || typeof bm !== "object") return null;
        const used = Object.entries(bm).filter(([, b]) => b && (b.input || b.output));
        if (!used.length) return null;
        const P = normPrices(prices);
        let cost = 0;
        const missing = [], labels = [];
        for (const [m, b] of used) {
          const p = priceFor(m, P);
          if (!p) {
            missing.push(m);
            continue;
          }
          if (p.label && !labels.includes(p.label)) labels.push(p.label);
          const cached = b.cached || 0, written = b.cacheWrite || 0, fresh = Math.max(0, (b.input || 0) - cached - written);
          cost += (fresh * p.input + cached * (p.cacheRead ?? p.input) + written * (p.cacheWrite ?? p.input) + (b.output || 0) * p.output) / 1e6;
        }
        return { cost: missing.length ? null : cost, missing, labels };
      }
      function unreadToolCalls(text, events) {
        const t = text.trimStart();
        if (!t.startsWith("{") || /"chat_messages"/.test(t.slice(0, 5e3))) return false;
        if (!Array.isArray(events) || !events.length || events.some((e) => e.kind !== "user" && e.kind !== "message")) return false;
        return /"type"\s*:\s*"(?:tool_call|tool_use|function_call|tool-call)"|"tool_calls"\s*:\s*\[/.test(t.slice(0, 2e6));
      }
      const IMPORT_GEN = 11;
      const SUBAGENT_TOOLS = ["Agent", "Task"];
      function cursorEditsMissing(s) {
        if (!s || s.source_edits || s.agent !== "cursor") return false;
        if (s.source_text && !isCursorJsonl(String(s.source_text).trimStart())) return false;
        return (s.events || []).some((e) => (e.kind === "write" || e.kind === "edit") && (e.tool === "Write" || e.tool === "StrReplace"));
      }
      function subagentsMissing(s) {
        const ev = s && s.events || [];
        return ev.some((e) => e.kind === "tool" && SUBAGENT_TOOLS.includes(e.tool)) && !ev.some((e) => e.agent);
      }
      function assertsUncountedBefore125(s) {
        const cfg = profile(s.profile);
        if (!(cfg.assert_line_patterns || []).length) return false;
        return s.events.some(
          (e) => e.assert_delta && !e.assert_delta.old && !e.assert_delta.new && e.new_content && linesOf(e).split("\n").some((l) => isAssertLine(l, cfg))
        );
      }
      const DOLLAR_EDIT = /"(?:new_string|newString)"\s*:\s*"(?:[^"\\]|\\.)*?\$[&`'$]/;
      const dollarEditBefore125 = (s) => typeof s.source_text === "string" && DOLLAR_EDIT.test(s.source_text);
      function cursorMcpBefore125(s) {
        const cfg = profile(s.profile);
        if (!s.events.some((e) => (e.kind === "write" || e.kind === "edit") && isTestFile(e.file, cfg))) return false;
        const t = typeof s.source_text === "string" ? s.source_text : "";
        if (!t) return s.events.some((e) => e.kind === "tool" && e.tool === "CallDynamicTool");
        return /"CallDynamicTool"/.test(t) && /"namespace"\s*:\s*"(?!cursor")[^"]/.test(t) || /"mcpToolCall"\s*:/.test(t) && /"(?:serverIdentifier|providerIdentifier)"\s*:\s*"[^"]/.test(t);
      }
      const homeSpelled = (s) => s.events.some((e) => [e.file, e.cmd].some((x) => typeof x === "string" && homeless(x) !== x));
      const codexChangesBefore121 = (s) => typeof s.source_text === "string" && /"type"\s*:\s*"session_meta"/.test(s.source_text.slice(0, 5e3)) && /"(?:FileChange|unified_diff)"/.test(s.source_text) || s.events.some((e) => e.kind === "tool" && e.tool === "exec");
      function changedBy122(s) {
        const cfg = profile(s.profile);
        if (s.events.some((e) => e.kind === "run_tests" && typeof e.cmd === "string" && !isTestRun(e.cmd, cfg))) return true;
        if (typeof s.source_text === "string" && /"move_path"\s*:\s*"/.test(s.source_text)) return true;
        const cut = (w) => String(w.reason || "").replace(/^comparison → truthiness: /, "").split(" → ").some((half) => half.length === 40);
        return s.events.some((e) => e.assert_delta && Array.isArray(e.assert_delta.weakened) && e.assert_delta.weakened.some(cut));
      }
      function needsReimport(s) {
        if (!s || !Array.isArray(s.events) || s.importGen >= IMPORT_GEN) return false;
        if ((s.importGen || 0) < 3 && codexChangesBefore121(s)) return true;
        if ((s.importGen || 0) < 4 && changedBy122(s)) return true;
        if (homeSpelled(s)) return true;
        if ((s.importGen || 0) < 6 && cursorMcpBefore125(s)) return true;
        if ((s.importGen || 0) < 7 && dollarEditBefore125(s)) return true;
        if ((s.importGen || 0) < 8 && assertsUncountedBefore125(s)) return true;
        if ((s.importGen || 0) < 9 && subagentsMissing(s)) return true;
        if ((s.importGen || 0) < 10 && cursorEditsMissing(s)) return true;
        if ((s.importGen || 0) < 9 && s.events.some((e) => e.kind === "tool" && playwrightTestTool(e.tool))) return true;
        if ((s.importGen || 0) < 10 && s.events.some((e) => e.kind === "write" && !e.file && playwrightTestTool(e.tool) === "write")) return true;
        if ((s.importGen || 0) < 11 && s.events.some((e) => e.kind === "user" && harnessUserText(String(e.text || "")))) return true;
        if ((s.importGen || 0) < 9 && s.events.some((e) => /^(?:run_tests|run_other|git)$/.test(e.kind) && heredocWrites(e.cmd, "").length)) return true;
        if ((s.importGen || 0) < 9 && s.events.some(
          (e) => e.kind === "message" && e.new_content && [...String(e.text || "").matchAll(/```(\w+)?\n([\s\S]*?)```/g)].some((m) => diffAfter(m[1], m[2]) !== m[2])
        ))
          return true;
        if ((s.importGen || 0) < 9 && s.events.some((e) => e.kind === "user" && personText(e.text) !== String(e.text || "").trim())) return true;
        if ((s.importGen || 0) >= 2) return false;
        const cfg = profile(s.profile);
        if (!cfg.checks.includes("test_deleted") && !cfg.checks.includes("config_weakened")) return false;
        if (s.events.some((e) => e.prev_content != null || e.kind === "delete")) return false;
        return s.events.some((e) => (e.kind === "write" || e.kind === "edit") && (isRunnerConfig(e.file) || isTestFile(e.file, cfg)));
      }
      function transcriptMatch(stored, fresh) {
        const said = (e) => e.kind === "user" || e.kind === "message" ? String(e.text || "").slice(0, 60) : "";
        const sig = (e) => [e.kind, homeless(e.file || ""), homeless(e.cmd || ""), said(e)].join("|");
        const same = (x, y) => sig(x) === sig(y) || x.kind === "tool" && x.tool === "exec" && y.tool === "exec";
        const a = stored || [], b = fresh || [];
        if (!a.length) return b.length ? 0 : 1;
        let j = 0, n = 0;
        for (const x of a) {
          const k = b.findIndex((y, i) => i >= j && same(x, y));
          if (k >= 0) {
            n++;
            j = k + 1;
          }
        }
        return n / a.length;
      }
      function pickConversation(stored, parsed) {
        const convs = Array.isArray(parsed) && parsed.length && parsed[0].events ? parsed.map((c) => c.events) : [parsed || []];
        let best = null, score = -1;
        for (const ev of convs) {
          const m = transcriptMatch(stored, ev);
          if (ev.length && m > score) [best, score] = [ev, m];
        }
        return best;
      }
      const planSeq = (ev, cfg) => {
        const marks = cfg.plan_markers.map((m) => /^\p{L}+$/u.test(m) ? new RegExp("(?<!\\p{L})" + m + "(?!\\p{L})", "u") : m);
        const e = ev.find((x) => x.kind === "message" && marks.some((m) => typeof m === "string" ? x.text.includes(m) : m.test(x.text)));
        return e ? e.seq : null;
      };
      const approvalSeq = (ev, p) => {
        if (p == null) return null;
        const e = ev.find((x) => x.seq > p && x.kind === "user");
        return e ? e.seq : null;
      };
      const plannedFiles = (ev, p, cfg) => {
        if (p == null) return /* @__PURE__ */ new Set();
        const dirs = /* @__PURE__ */ new Set(["tests", "test", "specs", "spec", "src", "app", ...[...cfg.test_dirs, ...cfg.src_dirs].flatMap((d) => d.split("/"))]);
        const paths = (ev[p].text.match(/[\w.-]+(?:\/[\w.-]+)+\.\w+/g) || []).map((x) => x.replace(/^\.\//, ""));
        return new Set(
          paths.filter(
            (x) => x.split("/").slice(0, -1).some((d) => dirs.has(d))
          )
        );
      };
      const inPlan = (f, planned) => {
        const g = homeless(f).replace(/^\.\//, "");
        return [...planned].map(homeless).some((x) => g === x || g.endsWith("/" + x) || x.endsWith("/" + g));
      };
      const inDirs = (path2, dirs) => {
        const p = (path2 || "").replace(/^\.?\//, "");
        return dirs.some((d) => p === d || p.startsWith(d + "/"));
      };
      const underDir = (path2, dirs) => {
        const p = "/" + (path2 || "").replace(/^\.?\//, "") + "/";
        return dirs.some((d) => p.includes("/" + d + "/"));
      };
      const productPath = (f, cfg) => inDirs(f, cfg.src_dirs) || underDir(f, cfg.src_dirs) && !underDir(f, cfg.test_dirs) && !TEST_FILE_RX.test(f || "") && !TEST_SIDE_RX.test(f || "") && !/(?:^|\/)node_modules\//.test(f || "");
      const READ_CMD = /^(?:cat|head|tail|nl|less|more|bat|sed|rg|grep|egrep|ls|find|tree|wc|stat|file|pwd|cd|echo|sort|uniq|cut)$/;
      function shellReads(e, cfg) {
        if (e.kind !== "run_other" || !e.cmd) return null;
        const parts = [[]];
        let word = "", quoted = false, q = "";
        const end = () => {
          if (word || quoted) parts[parts.length - 1].push({ word, quoted });
          word = "";
          quoted = false;
        };
        const c = e.cmd;
        for (let i = 0; i < c.length; i++) {
          const ch = c[i];
          if (q) {
            if (ch === q) q = "";
            else word += ch;
          } else if (ch === "'" || ch === '"') {
            q = ch;
            quoted = true;
          } else if (ch === ">") return null;
          else if (/[;|&\n]/.test(ch)) {
            end();
            if (parts[parts.length - 1].length) parts.push([]);
          } else if (/\s/.test(ch)) end();
          else word += ch;
        }
        end();
        const files = [];
        for (const p of parts.filter((x) => x.length)) {
          const cmd = p[0].word, args = p.slice(1);
          if (p[0].quoted || !READ_CMD.test(cmd)) return null;
          if (cmd === "sed" && args.some((a) => !a.quoted && /^-[a-zA-Z]*i/.test(a.word))) return null;
          if (cmd === "find" && args.some((a) => /^-(?:delete|exec|execdir|ok|fprint)/.test(a.word))) return null;
          for (const a of args)
            if (!a.quoted && !a.word.startsWith("-") && !/[*?$]/.test(a.word) && (/^[^\d].*[/.]|^\.\.?\//.test(a.word) || (cfg.src_dirs || []).includes(a.word.replace(/\/$/, ""))))
              files.push(a.word);
        }
        return files;
      }
      const redRunBefore = (ev, seq) => {
        const runs = ev.filter((e) => e.kind === "run_tests" && (e.tests || e.output_missing) && e.seq < seq);
        const l = runs[runs.length - 1];
        return l && l.tests && (l.tests.failed || l.tests.errors) ? l : null;
      };
      const TEST_FILE_RX = /(?:^|\/)(?:test_[^/]*\.py|[^/]*_test\.(?:py|go)|[^/]*\.(?:spec|test|cy)\.[cm]?[jt]sx?|[^/]*Tests?\.(?:java|kt|cs))$/;
      const TEST_SIDE_RX = /(?:^|\/)(?:__tests__|__mocks__|tests?|e2e|specs?|fixtures?|support|mocks?|testing|test-?utils|page-?objects?|pages)\/|(?:^|\/)conftest\.py$/i;
      const productFile = (f, cfg) => !!f && isCode(f, cfg) && underDir(f, cfg.src_dirs) && !underDir(f, cfg.test_dirs) && !TEST_FILE_RX.test(f) && !TEST_SIDE_RX.test(f) && !RUNNER_CONFIG_RX.test(f);
      function phases(ev) {
        const first = (k) => {
          const e = ev.find((x) => k.includes(x.kind));
          return e ? e.seq : null;
        };
        const cuts = [
          ["plan", 0],
          ["code", first(["edit", "write"])],
          ["run", first(["run_tests"])]
        ].filter((c) => c[1] != null);
        return cuts.map((c, i) => ({ name: c[0], start: c[1], end: i + 1 < cuts.length ? cuts[i + 1][1] - 1 : ev.length ? ev[ev.length - 1].seq : 0 })).filter((p) => p.end >= p.start);
      }
      const NOT_TASK = /^(?:UTF|ISO|RFC|SHA|MD|AES|RSA|HTTP|HTTPS|HTML|CSS|ES|WCAG|ARIA|ISBN|UTC|GMT|IPV|IEEE|ANSI|EN|ID|API|A11Y|I18N|L10N|X)$/i;
      const TASK_RE = /\b([A-Z][A-Z0-9]{1,9})-(\d{1,6})\b/g;
      function guessTask(text) {
        for (const m of String(text || "").matchAll(TASK_RE)) if (!NOT_TASK.test(m[1])) return `${m[1]}-${m[2]}`;
        return "";
      }
      function taskId(ev) {
        const fromUser = ev.filter((e) => e.kind === "user").map((e) => guessTask(e.text)).find(Boolean);
        if (fromUser) return fromUser;
        for (const e of ev) {
          const t = guessTask((e.text || "") + " " + (e.file || "") + " " + (e.cmd || ""));
          if (t) return t;
        }
        return "";
      }
      const SECRET_KINDS = [
        ["sk_jwt", /\beyJ[\w-]{8,}\.eyJ[\w-]{8,}\.[\w-]{6,}/g],
        ["sk_bearer", /Bearer\s+(?![{$<%]|["'`]\s*\+)([A-Za-z0-9\-._~+/]{20,}=*)/g],
        ["sk_aws", /\bAKIA[0-9A-Z]{16}\b/g],
        ["sk_key", /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})\b/g],
        [
          "sk_assign",
          /\b(?:api[_-]?key|apikey|client[_-]?secret|secret[_-]?key|access[_-]?token|auth[_-]?token|bearer[_-]?token|token|secret)\b["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi
        ]
      ];
      function redactSecrets(text) {
        const PH = /^(?:\[REDACTED\]|<.*>|\{\{.*\}\}|\$\{.*\}|%.*%|\*{3,}|x{4,}|\.{3}|your[-_ ]|my[-_ ]|example|dummy|fake|sample|placeholder|change[-_ ]?me|todo|null|none|undefined)/i;
        let count = 0, out = String(text || "");
        for (const [, rx] of SECRET_KINDS) {
          rx.lastIndex = 0;
          out = out.replace(rx, (...a) => {
            const m = a[0], g = typeof a[1] === "string" ? a[1] : "";
            const v = g || m;
            if (PH.test(v)) return m;
            count++;
            return g ? m.replace(g, "[REDACTED]") : "[REDACTED]";
          });
        }
        out = out.replace(/\b(password|passwd|pwd)\b(["']?\s*[:=]\s*["'])([^"'\s]{4,})(["'])/gi, (m, k, mid, v, q) => {
          if (PH.test(v)) return m;
          count++;
          return k + mid + "[REDACTED]" + q;
        });
        return { text: out, count };
      }
      const F = (check, severity, seq, message) => ({ check, severity, seq, message });
      const QUIET_STEPS = /* @__PURE__ */ new Set(["read", "search", "tool", "git", "run_other"]);
      const checks = {
        /* since 0.1.119 also a src folder deeper in the path, but not test-side code or a dependency under it. Since 0.1.125
           not a file the agent wrote or edited earlier in the session: reading back its own page object in src/pages is no
           look at the product (the owner's Cursor session of 11 Oct 2026, with the page objects moved there: two high
           findings). A search over a whole folder still counts. */
        peeked_at_src_before_plan(ev, cfg) {
          const p = planSeq(ev, cfg), a = approvalSeq(ev, p);
          const cut = a ?? p ?? 1e9;
          const out = [], own = /* @__PURE__ */ new Set();
          const key = (f) => homeless(String(f)).replace(/^\.\//, "");
          const product = (f) => productPath(f, cfg) && !own.has(key(f));
          for (const e of ev) {
            if (e.seq >= cut) continue;
            if ((e.kind === "write" || e.kind === "edit") && e.file) own.add(key(e.file));
            const file = ["read", "search"].includes(e.kind) ? e.file : (shellReads(e, cfg) || []).find(product);
            if (file && product(file)) out.push(F("peeked_at_src_before_plan", "high", e.seq, T("peeked", { file })));
          }
          return out;
        },
        /* A claim phrase counts as whole words (0.1.119): "bypassing" is not "passing", "проходить" is not "проходит".
           An English phrase may end in -es, -ed or -ing ("tests passed", "all passes"). Since 0.1.121 a claim after a run
           whose output the transcript does not have (output_missing, a Cursor import) is not reported: its result is unknown.
           A run whose output is there but not understood (no tests) still counts as no run, as before.
           Since 0.1.121 the window of pass_claim_lookback steps skips the steps that change no code: reads, searches, other
           tools (a browser, MCP), git and other commands. A Cursor session with an MCP browser makes dozens of them between
           a run and the message about it. */
        /* 0.1.125: the agent looked at the page through a browser tool (an MCP server such as Claude in Chrome, Playwright
           MCP, Chrome DevTools MCP or Puppeteer), or through a script of its own (scriptLook), after its last change of a
           test file, and changed no test after that: the
           last check was by hand, and no test asserts what it saw. Looking at the site before writing the tests, or while
           finding out why a test failed and then changing the test, is how the work goes and does not count. A session
           that wrote no test file is left to tests_never_run and the other checks. Opening and closing tabs is no look. */
        browser_check_not_in_test(ev, cfg) {
          let lastTest = -1;
          for (const e of ev) if ((e.kind === "write" || e.kind === "edit") && e.file && isTestFile(e.file, cfg)) lastTest = e.seq;
          if (lastTest < 0) return [];
          const looks = ev.filter((e) => e.seq > lastTest && (e.kind === "tool" && browserLook(e.tool) || scriptLook(e)));
          if (!looks.length) return [];
          const vars = { n: looks.length, first: looks[0].seq, last: looks[looks.length - 1].seq };
          return [F("browser_check_not_in_test", "medium", looks[0].seq, T(looks.length === 1 ? "browser_unasserted_one" : "browser_unasserted", vars))];
        },
        /* Since 0.1.129 a claim after a green run is reported too when a code or test file changed after that run and no run
           came since: "added one more test, all pass" (a test session on birdhospital.ru: the new test had the name of an
           old one, so the old one stopped running, and nothing ran to show it).
           Since 0.1.127, after a red run, a message that says a test fails reports that run, though it has "passes" in it:
           the owner's test-pw session, in Russian: '"Add a single todo" fails… "Empty input" passes falsely… the seed passes'.
           A failure word with a "no" before it ("nothing fails", 0 failed, no failures) is still a claim that all is well,
           and with no run before it a claim stays one ("The test passes. Checking that it fails without the fix"). */
        pass_claim_without_run(ev, cfg) {
          const changesCode = (f) => !!f && (isCode(f, cfg) && !NOT_SOURCE.test(f) || isRunnerConfig(f));
          const out = [], pats = cfg.pass_claim_patterns.map(
            (p) => new RegExp(
              "(?<![\\p{L}\\p{N}_])" + p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (/^[\x20-\x7e]+$/.test(p) ? "(?:es|ed|ing)?" : "") + "(?![\\p{L}\\p{N}_])",
              "u"
            )
          );
          for (const e of ev) {
            if (e.kind !== "message") continue;
            const t = e.text.toLowerCase();
            if (!claimsTests(t, pats)) continue;
            const near = ev.filter((x) => x.seq < e.seq && !QUIET_STEPS.has(x.kind)).slice(-cfg.pass_claim_lookback).filter((x) => x.kind === "run_tests");
            if (near.length && near[near.length - 1].output_missing) continue;
            const runs = near.filter((x) => x.tests);
            if (!runs.length) out.push(F("pass_claim_without_run", "high", e.seq, T("pass_no_run")));
            else {
              const l = runs[runs.length - 1].tests;
              if ((l.failed || l.errors) && !saysFailure(t))
                out.push(F("pass_claim_without_run", "high", e.seq, T("pass_red", { passed: l.passed, failed: l.failed })));
              else if (!(l.failed || l.errors)) {
                const lastRun = near[near.length - 1].seq;
                const changed = ev.find((x) => x.seq > lastRun && x.seq < e.seq && (x.kind === "write" || x.kind === "edit") && changesCode(x.file));
                if (changed) out.push(F("pass_claim_without_run", "high", e.seq, T("pass_after_edit", { file: changed.file, seq: changed.seq })));
              }
            }
          }
          return out;
        },
        assert_weakened(ev) {
          const out = [];
          for (const e of ev) {
            const d = e.assert_delta;
            if (!d) continue;
            for (const w of d.weakened) out.push(F("assert_weakened", "high", e.seq, T("weakened", { file: e.file, test: w.test, reason: w.reason })));
            for (const r of d.removed)
              out.push(F("assert_weakened", "high", e.seq, T("removed", { file: e.file, test: r.test, before: r.before, after: r.after })));
          }
          return out;
        },
        /* Since 0.1.130 the argument of expect( may have calls inside: expect(await x.isVisible()).toBeTruthy() stopped the
           pattern at its first ")" and was missed wherever ESLint does not run (lint off, qa-api).
           0.1.119: a line that is a comment is skipped; Cypress's .should( is an assertion too (a file with only those was
           never looked at); a bare Python assert on a predicate (cart.is_empty(), user.is_active, path.exists()) checks a
           value, unlike `assert resp.json()`. */
        weak_assert(ev, cfg) {
          const out = [];
          const PREDICATE = /^assert\s[\w.]*\b(?:(?:is|has|can|should|was|were|does|did)_\w+(?:\(\))?|is[a-z]+\(\)|exists\(\))\s*$/;
          for (const e of ev) {
            const code = e.new_content && linesOf(e);
            if (!code) continue;
            for (const rx of cfg.weak_assert_patterns) {
              rx.lastIndex = 0;
              for (const m of code.matchAll(rx)) {
                if (/^\s*(?:\/\/|#|\/\*|\*)/.test(code.slice(code.lastIndexOf("\n", m.index) + 1, m.index)) || PREDICATE.test(m[0].trim())) continue;
                if (/^expect\s*\(\s*await\b[^]*\.(?:is(?:Visible|Hidden|Enabled|Disabled|Checked|Editable)|textContent|innerText|inputValue|getAttribute|count|title)\s*\(/.test(
                  m[0]
                )) {
                  const f = F("weak_assert", "medium", e.seq, T("weak_assert_once", { file: e.file || inMsg(), line: clip(m[0].trim(), 80) }));
                  out.push(Object.assign(f, { kind: "awaited" }));
                  continue;
                }
                out.push(F("weak_assert", "high", e.seq, T("weak_assert", { file: e.file || inMsg(), line: clip(m[0].trim(), 80) })));
              }
            }
          }
          return out;
        },
        /* Since 0.1.127 an edit of a document (the readme, the TODO, notes) is no fix: a failure that names no test made
           any edit after it one, and the owner's TODO.md, edited after a red run, was a high finding. */
        /* Since 0.1.127 a cause named in words before the edit ("due to duplicate headings", "Key root cause: the site has
           no <nav>", or the same in Russian) without whose error it is gets a medium finding that says so: half of the
           triage. */
        fix_after_fail_without_triage(ev, cfg) {
          const out = [], mk = cfg.triage_markers.map((m) => m.toLowerCase());
          const CAUSE = /\b(?:because|due to|root cause|caused by|the cause|the reason)\b|из-за|потому что|причин[аеуы]|так как/i;
          for (const e of ev) {
            if (e.kind !== "run_tests" || !e.tests || !(e.tests.failed || e.tests.errors)) continue;
            const ff = new Set(
              e.tests.failed_names.map(
                (n) => String(n).split("::")[0].replace(/:\d+:\d+.*$/, "").trim()
              ).filter(Boolean)
            );
            let cause = false;
            for (const x of ev) {
              if (x.seq <= e.seq) continue;
              if (x.kind === "message" && mk.some((m) => x.text.toLowerCase().includes(m))) break;
              if (x.kind === "message" && CAUSE.test(x.text)) cause = true;
              if (x.kind === "user") break;
              if (x.kind === "run_tests" && x.tests && x.tests.passed && !x.tests.failed && !x.tests.errors) {
                const all = e.tests.passed + e.tests.failed + (e.tests.errors || 0);
                if (x.tests.passed >= all || ff.size && [...ff].every((p) => (x.cmd || "").includes(p))) break;
              }
              if (["edit", "write"].includes(x.kind) && DOC_FILE.test(x.file || "")) continue;
              const isCodeFile = x.file && (!cfg.code_ext.length || cfg.code_ext.some((ext) => x.file.endsWith(ext)));
              if (["edit", "write"].includes(x.kind) && (!ff.size || [...ff].some((p) => x.file.endsWith(p)) || inDirs(x.file, cfg.test_dirs) || isCodeFile)) {
                out.push(
                  cause ? F("fix_after_fail_without_triage", "medium", x.seq, T("fix_cause_only", { file: x.file, seq: e.seq })) : F("fix_after_fail_without_triage", "high", x.seq, T("fix_no_triage", { file: x.file, seq: e.seq }))
                );
                break;
              }
            }
          }
          return out;
        },
        scope_creep(ev, cfg) {
          const pl = plannedFiles(ev, planSeq(ev, cfg), cfg);
          if (!pl.size) return [];
          return ev.filter((e) => ["edit", "write"].includes(e.kind) && e.file && !inPlan(e.file, pl) && !e.file.endsWith("README.md")).map((e) => F("scope_creep", "medium", e.seq, T("scope", { file: e.file })));
        },
        /* Since 0.1.125 per request: the edits of a file between two messages of the person, so a file the person asks to
           change again starts from zero (the owner's README.md: 3 edits while rewriting the search tests, 2 more while
           rewriting the navigation, one finding for the whole session). Docs (.md, .txt, .rst…) are not counted: an agent
           updates the readme along with each change, which is no poking. */
        edit_churn(ev, cfg) {
          const c = /* @__PURE__ */ new Map();
          let request = 0;
          for (const e of ev) {
            if (e.kind === "user") request++;
            else if (["edit", "write"].includes(e.kind) && e.file && !DOC_FILE.test(e.file)) {
              const k = request + "|" + e.file;
              c.set(k, [...c.get(k) || [], { file: e.file, seq: e.seq }]);
            }
          }
          return [...c.values()].filter((s) => s.length > cfg.edit_churn_threshold).map((s) => F("edit_churn", "medium", s[cfg.edit_churn_threshold].seq, T("churn", { file: s[0].file, n: s.length })));
        },
        sleep_or_skip_added(ev, cfg) {
          const out = [];
          for (const e of ev) {
            if (!e.new_content || isRunnerConfig(e.file) || productFile(e.file, cfg)) continue;
            const code = codeOf(e);
            if (cfg.sleep_patterns.some((r) => r.test(code)))
              out.push(Object.assign(F("sleep_or_skip_added", "high", e.seq, T("sleep", { file: e.file || inMsg() })), { kind: "sleep" }));
            const skips = cfg.skip_patterns.filter((r) => r.test(code));
            if (skips.length)
              out.push(
                Object.assign(F("sleep_or_skip_added", "high", e.seq, T("skip", { file: e.file || inMsg() })), {
                  kind: skips.some((r) => RETRY_RX.test(r.source)) ? "retry" : "skip"
                })
              );
          }
          return out;
        },
        /* A test that disappears: from a file between two of its versions in the session, or with the whole file (rm,
           git rm, a deleted file in a Codex patch). Not a deletion: a test renamed with the same body, a test that shows up
           in another file (moved) or again in the same file later (restored). High right after a red run: that is how an
           agent turns a suite green. Versions are what the session saw (new_content), so a stored session works too. */
        test_deleted(ev, cfg) {
          if (!cfg.test_fn_pattern) return [];
          const tests = (src) => blocksByTest(src, cfg.test_fn_pattern);
          const norm = (b) => b.split("\n").slice(1).map((l) => l.trim()).filter((l) => l && !/^[})\];,]*$/.test(l)).join("\n");
          const versions = ev.filter((e) => ["write", "edit"].includes(e.kind) && e.file && e.new_content && isCode(e.file, cfg));
          const seen = versions.flatMap((e) => Object.keys(tests(e.new_content)).map((name) => ({ file: e.file, seq: e.seq, name })));
          const kept = (file, seq, name) => seen.some((t) => t.name === name && (t.file !== file || t.seq > seq));
          const out = [];
          const push = (key, file, seq, names, red) => {
            const r = red !== void 0 ? red : redRunBefore(ev, seq);
            const vars = { file, n: names.length, names: names.join(", "), after: r ? T("after_red_run", { seq: r.seq }) : "" };
            out.push(F("test_deleted", r ? "high" : "medium", seq, T(key, vars)));
          };
          const last = {};
          for (const e of versions) {
            const prev = last[e.file];
            last[e.file] = e;
            const before = e.prev_content ?? (prev && !prev.fragment_only && !e.fragment_only ? prev.new_content : null);
            if (before == null) continue;
            const om = tests(before), nm = tests(e.new_content);
            const added = Object.keys(nm).filter((k) => !(k in om)).map((k) => norm(nm[k]));
            const gone = Object.keys(om).filter((k) => !(k in nm) && !(norm(om[k]) && added.includes(norm(om[k]))) && !kept(e.file, e.seq, k));
            if (gone.length) push("test_deleted_msg", e.file, e.seq, gone);
          }
          const same = (x, y) => {
            const [a, b] = [homeless(x), homeless(y)];
            return a === b || a.endsWith("/" + b) || b.endsWith("/" + a);
          };
          const testFile = (f) => isCode(f, cfg) && (TEST_FILE_RX.test(f) || inDirs(f, cfg.test_dirs));
          const parts = (cmd) => String(cmd || "").split(/&&|\|\||;|\n/);
          const RM = /^\s*(?:sudo\s+)?(?:git\s+rm|rm|unlink|del|Remove-Item)\s/;
          const ranFirst = (e) => {
            if (e.kind !== "run_tests" || !e.tests) return false;
            const p = parts(e.cmd);
            const run = p.findIndex((x) => isTestRun(x, cfg)), rm = p.findIndex((x) => RM.test(x));
            return run >= 0 && rm > run;
          };
          const runBefore = (e) => ranFirst(e) ? e : [...ev].reverse().find((x) => x.seq < e.seq && x.kind === "run_tests" && x.tests) || null;
          const ranFile = (run, f) => {
            const p = parts(run.cmd).filter((x) => isTestRun(x, cfg));
            const name = f.split("/").pop();
            return p.some((x) => x.includes(name) || !/\S+(?:\.(?:spec|test|cy)\.[cm]?[jt]sx?|_test\.(?:py|go)|\.py)\b|::/.test(x));
          };
          const createdHere = (f) => {
            const first = versions.find((v) => v.file === f);
            return !!first && first.kind === "write" && first.prev_content == null;
          };
          for (const e of ev) {
            let targets = [];
            if (e.kind === "delete" && e.file) targets = [e.file];
            else if (e.cmd)
              for (const part of e.cmd.split(/&&|\|\||;|\n/)) {
                const m = part.match(/^\s*(?:sudo\s+)?(?:git\s+rm|rm|unlink|del|Remove-Item)\s+(.*)$/);
                if (m)
                  targets.push(
                    ...m[1].split(/\s+/).filter((t) => t && !t.startsWith("-")).map((t) => t.replace(/^["']|["']$/g, "").replace(/\/+$/, ""))
                  );
              }
            for (const t of targets) {
              const glob = /[*?]/.test(t) ? new RegExp(
                "(?:^|/)" + t.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$"
              ) : null;
              const known = [...new Set(versions.filter((v) => v.seq < e.seq).map((v) => v.file))].filter(
                (f) => glob ? glob.test(f) : same(f, t) || f.startsWith(t + "/") || f.includes("/" + t + "/")
              );
              for (const f of known) {
                const lastV = versions.filter((v) => v.file === f && v.seq < e.seq).pop();
                const names = Object.keys(tests(lastV.new_content));
                if (!names.length && !testFile(f)) continue;
                const gone = names.filter((k) => !kept(f, e.seq, k));
                if (names.length && !gone.length) continue;
                const run = runBefore(e);
                const green = !!run && !run.tests.failed && !run.tests.errors && run.tests.passed > 0;
                if (green && createdHere(f) && ranFile(run, f)) continue;
                push("test_file_deleted_msg", f, e.seq, gone, ranFirst(e) ? green ? null : e : void 0);
              }
              if (!known.length && !glob && testFile(t)) push("test_file_deleted_msg", t, e.seq, []);
            }
          }
          return out;
        },
        /* In a testing task the product is what is under test: an agent that changes it to make a test pass hides the bug
           the test found. A file in the profile's src_dirs that is not test-side code (a test, a fixture, a page object,
           a runner config); a file the approved plan names is not reported. High right after a red run. */
        product_code_edited(ev, cfg) {
          const p = planSeq(ev, cfg);
          const planned = approvalSeq(ev, p) != null ? plannedFiles(ev, p, cfg) : /* @__PURE__ */ new Set();
          const product = (f) => productFile(f, cfg) && !inPlan(f, planned);
          const byFile = {};
          for (const e of ev) if (["write", "edit"].includes(e.kind) && e.file && product(e.file)) (byFile[e.file] = byFile[e.file] || []).push(e);
          return Object.entries(byFile).map(([file, edits]) => {
            const hot = edits.find((e2) => redRunBefore(ev, e2.seq));
            const e = hot || edits[0];
            const r = hot && redRunBefore(ev, e.seq);
            return F("product_code_edited", r ? "high" : "medium", e.seq, T("product_edited", { file, after: r ? T("after_red_run", { seq: r.seq }) : "" }));
          });
        },
        /* Snapshots rewritten instead of read: jest/vitest -u, playwright --update-snapshots, pytest --snapshot-update,
           UPDATE_SNAPSHOTS=1, or a snapshot file written by hand. Writing the first baselines of new tests is normal, so
           medium; right after a red run it is how a diff the test caught becomes the new truth: high. */
        snapshot_overwritten(ev) {
          const RUNNER = /^\s*(?:(?:\w+=\S*|env(?:\s+-u\s+\S+|\s+-\w+)*|sudo|npx|bunx|(?:pnpm|yarn)\s+(?:exec|dlx)|python3?\s+-m)\s+)*(?:\S*\/)?(?:jest|vitest|playwright|pytest|cypress|(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?test[\w:-]*)(?=\s|$)/;
          const FLAG = /(?:^|\s)(?:-u|--updateSnapshot|--update-snapshots?(?:=\S+)?|--snapshot-update)(?=\s|$)|\bupdateSnapshots?=true\b/i;
          const ENV = /\bUPDATE_SNAPSHOTS?=(?:1|true)\b/i;
          const updates = (part) => {
            const m = part.match(RUNNER);
            return !!m && (ENV.test(m[0]) || FLAG.test(part.slice(m[0].length)));
          };
          const SNAP_FILE = /(?:^|\/)(?:__snapshots__|__image_snapshots__)\/|\.snap$|-snapshots\/[^/]+$|\.(?:approved|verified)\.\w+$/;
          const out = [], files = /* @__PURE__ */ new Set();
          const after = (seq) => {
            const r = redRunBefore(ev, seq);
            return [r ? "high" : "medium", r ? T("after_red_run", { seq: r.seq }) : ""];
          };
          for (const e of ev) {
            if (e.cmd && e.cmd.split(/&&|\|\||;|\n/).some(updates)) {
              const [sev, a] = after(e.seq);
              out.push(F("snapshot_overwritten", sev, e.seq, T("snapshot_cmd", { cmd: clip(e.cmd.trim(), 80), after: a })));
            } else if (["write", "edit"].includes(e.kind) && e.file && SNAP_FILE.test(e.file) && !files.has(e.file)) {
              files.add(e.file);
              const [sev, a] = after(e.seq);
              out.push(F("snapshot_overwritten", sev, e.seq, T("snapshot_file", { file: e.file, after: a })));
            }
          }
          return out;
        },
        /* A runner config loosened so that red turns green: more retries, a longer timeout, tests excluded, failures
           ignored. Compared with what the file was before (prev_content from the import, or the session's previous version
           of it); a config seen for the first time is reported only for retries, as before 0.1.113. High right after a red
           run. Since 0.1.114 also Maven (surefire, failsafe), Gradle and .runsettings. */
        config_weakened(ev) {
          const num2 = (x) => x.split("*").reduce((a, t) => a * Number(t.replace(/_/g, "").trim()), 1);
          const TIMEOUT = /\b(timeout|testTimeout|hookTimeout|actionTimeout|navigationTimeout|defaultCommandTimeout|pageLoadTimeout|requestTimeout|responseTimeout|execTimeout|taskTimeout)\s*[:=]\s*([\d_]+(?:\s*\*\s*[\d_]+)*)|--timeout[=\s]+(\d+)/g;
          const XML_TIMEOUT = /<(forkedProcessTimeoutInSeconds|forkedProcessExitTimeoutInSeconds|parallelTestsTimeoutInSeconds|TestSessionTimeout|TestTimeout)>\s*(\d+)\s*</g;
          const RETRIES = /\bretries\s*[:=]\s*(?:\{[^}]*?\brunMode\s*:\s*)?(\d+)|--reruns[=\s]+(\d+)|\breruns\s*=\s*(\d+)|<rerunFailingTestsCount>\s*(\d+)|\bmaxRetries\s*(?:=|\.set\(|\(\s*)\s*(\d+)/g;
          const EXCLUDE = /\b(?:testIgnore|testPathIgnorePatterns|excludeSpecPattern|grepInvert|exclude)\s*[:=]|--ignore(?:-glob)?[=\s]|--deselect[=\s]|\s-k\s+["']?not\b|<(?:exclude|excludedGroups|excludes|TestCaseFilter)>\s*[^<\s]|\b(?:excludeTestsMatching|excludeTags|excludeCategories)\b|\bexclude\s*\(?\s*["']/;
          const IGNORE = /<(?:testFailureIgnore|skipTests|skip|maven\.test\.skip|maven\.test\.failure\.ignore)>\s*true\s*<|\bignoreFailures\s*(?:=|\.set\()\s*true\b/;
          const scope = (src, file) => {
            if (/(?:^|\/)pom\.xml$/i.test(file))
              return [
                ...src.matchAll(
                  /<plugin>(?:(?!<\/plugin>)[\s\S])*?<artifactId>\s*maven-(?:surefire|failsafe)-plugin\s*<\/artifactId>[\s\S]*?<\/plugin>|<properties>[\s\S]*?<\/properties>/g
                )
              ].map((m) => m[0]).join("\n");
            if (!/(?:^|\/)build\.gradle(?:\.kts)?$/i.test(file)) return src;
            const parts = [];
            for (const m of src.matchAll(/[^\n;{}]*\{/g)) {
              if (!/\btest\b|\bTest\b|\b\w*[a-z]Test\b|\btest[A-Z]\w*/.test(m[0].slice(0, -1))) continue;
              let depth = 0, i = m.index + m[0].length - 1;
              for (; i < src.length; i++) {
                if (src[i] === "{") depth++;
                else if (src[i] === "}" && --depth === 0) break;
              }
              parts.push(src.slice(m.index, i + 1));
            }
            return parts.join("\n");
          };
          const read = (whole, file) => {
            const src = scope(whole, file), timeouts = {};
            const add = (k, v) => (timeouts[k] = timeouts[k] || []).push(v);
            for (const m of src.matchAll(TIMEOUT)) add(m[1] || "timeout", num2(m[2] || m[3]));
            for (const m of src.matchAll(XML_TIMEOUT)) add(m[1], +m[2]);
            const retries = [...src.matchAll(RETRIES)].map((m) => +(m[1] || m[2] || m[3] || m[4] || m[5]));
            const lines = (rx) => new Set(
              src.split("\n").filter((l) => rx.test(l) && !/^\s*(?:\/\/|#|\*|<!--)/.test(l)).map((l) => l.trim())
            );
            return { timeouts, retries: retries.length ? Math.max(...retries) : 0, excludes: lines(EXCLUDE), ignores: lines(IGNORE) };
          };
          const out = [], last = {};
          for (const e of ev) {
            const src = e.new_content || e.config_content;
            if (!["write", "edit"].includes(e.kind) || !src || !isRunnerConfig(e.file)) continue;
            const prevSrc = e.prev_content ?? (e.fragment_only ? null : last[e.file]) ?? null;
            last[e.file] = src;
            const now = read(src, e.file), what = [];
            if (prevSrc == null) {
              if (now.retries > 0) what.push(T("cw_set", { key: "retries", to: now.retries }));
            } else {
              const was = read(prevSrc, e.file);
              if (now.retries > was.retries) what.push(T("cw_change", { key: "retries", from: was.retries, to: now.retries }));
              for (const [key, vals] of Object.entries(now.timeouts)) {
                const old = was.timeouts[key] || [];
                vals.forEach((v, i) => {
                  if (i >= old.length) what.push(T("cw_added", { key, to: v }));
                  else if (v > old[i]) what.push(T("cw_change", { key, from: old[i], to: v }));
                });
              }
              for (const l of now.excludes) if (!was.excludes.has(l)) what.push(T("cw_excluded", { line: clip(l, 80) }));
              for (const l of now.ignores) if (!was.ignores.has(l)) what.push(T("cw_ignored", { line: clip(l, 80) }));
            }
            if (!what.length) continue;
            const r = redRunBefore(ev, e.seq);
            const msg = T("config_weakened_msg", { file: e.file, what: what.join("; "), after: r ? T("after_red_run", { seq: r.seq }) : "" });
            out.push(F("config_weakened", r ? "high" : "medium", e.seq, msg));
          }
          return out;
        },
        focused_test(ev, cfg) {
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            const ln = codeOf(e).split("\n").find((l) => (cfg.focus_patterns || []).some((r) => r.test(l)));
            if (ln)
              out.push(Object.assign(F("focused_test", "high", e.seq, T("focused", { file: e.file || inMsg(), line: clip(ln.trim(), 80) })), { kind: "only" }));
          }
          return out;
        },
        // one finding per file and kind: the profile's engine may look for one kind (page.pause) and not another (debugger)
        debug_leftover(ev, cfg) {
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            for (const [kind, rx] of Object.entries(cfg.debug_patterns || {})) {
              const m = codeOf(e).match(rx);
              if (m)
                out.push(
                  Object.assign(F("debug_leftover", "medium", e.seq, T("debug_leftover", { file: e.file || inMsg(), line: clip(m[0].trim(), 80) })), { kind })
                );
            }
          }
          return out;
        },
        assumption_instead_of_question(ev, cfg) {
          const out = [];
          for (const e of ev) {
            if (e.kind !== "message") continue;
            const prose = e.text.replace(/```[\s\S]*?```/g, "");
            const hits = cfg.assumption_patterns.filter((p) => p.test(prose));
            if (!hits.length) continue;
            const sn = (prose.split(/[.\n]/).find((s) => hits.some((h) => h.test(s))) || "").trim();
            out.push(F("assumption_instead_of_question", "medium", e.seq, T("assumption", { snippet: clip(sn, 140) })));
          }
          return out;
        },
        tests_never_run(ev, cfg) {
          const code = ev.filter(
            (e) => e.new_content && /def test|@Test|\b(?:it|test)\s*\(|func Test|\[(?:Fact|Theory|Test|TestMethod|TestCase)\b|\bpm\.test\s*\(|^\s*Scenario(?: Outline)?:/m.test(
              e.new_content
            )
          );
          if (!code.length) return [];
          if (ev.some((e) => e.kind === "run_tests")) return [];
          return [F("tests_never_run", "high", code[code.length - 1].seq, T("never_run", { n: code.length }))];
        },
        /* a commented-out assertion never runs: a line that is a comment (//, #, /* or * inside a block) is skipped (0.1.118),
           and since 0.1.121 a line inside a block comment without a leading * too. An assertion line has expect, not as part
           of "expected" or "expectation" (0.1.129): `expected = date(2026, 10, 16)` is a date in a variable */
        hardcoded_date(ev) {
          const RX = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\b20\d{2}-\d{2}-\d{2}\b|\b(?:январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*\s+\d{4}/i;
          const PY_DATE = /\b(?:date|datetime)\(\s*(?:year\s*=\s*)?\d{4}\s*,/;
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            for (const ln of linesOf(e).split("\n"))
              if (!/^\s*(?:\/\/|#|\/\*|\*)/.test(ln) && /expect(?!ed|ation)|assert|toHaveText|getByText/.test(ln) && (RX.test(ln) || PY_DATE.test(ln)))
                out.push(F("hardcoded_date", "medium", e.seq, T("hard_date", { file: e.file || inMsg(), line: clip(ln.trim(), 80) })));
          }
          return out;
        },
        /* Since 0.1.121 also the other ways to wait for network idle, in every language Playwright has: waitForLoadState /
           wait_for_load_state, Python's wait_until=, Java's and C#'s LoadState / WaitUntilState constants (worded apart, so
           the verdicts on "waitUntil: 'networkidle'" keep their key); and an exact count compared with toBe, toEqual or
           toStrictEqual, spaces allowed, in Python with ==, and in Java and C# with their assertion libraries. */
        fragile_wait(ev) {
          const IDLE_OPTION = /waitUntil\s*:\s*['"]networkidle['"]/;
          const IDLE_OTHER = /\bwait_until\s*=\s*['"]networkidle['"]|\bwait(?:ForLoadState(?:Async)?|_for_load_state)\s*\(\s*['"]networkidle['"]|\b(?:LoadState|WaitUntilState)\.(?:NETWORKIDLE|NetworkIdle)\b/;
          const COUNT = new RegExp(
            [
              String.raw`\.count\(\)\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*\d+\s*\)`,
              // expect(await rows.count()).toBe(3)
              String.raw`\.count\(\)\s*==\s*\d+`,
              // Python: assert rows.count() == 3
              // Java and C#: assertEquals(3, rows.count()), Assert.AreEqual / Assert.Equal(3, await rows.CountAsync())
              String.raw`\b(?:assertEquals|Assert\.(?:AreEqual|Equal))\s*\(\s*\d+\s*,[^;\n]*\.(?:count|CountAsync)\(\)`,
              String.raw`\.(?:count|CountAsync)\(\)\s*\)\s*\.isEqualTo\(\s*\d+\s*\)`,
              // AssertJ: assertThat(rows.count()).isEqualTo(3)
              String.raw`\.CountAsync\(\)\s*,\s*Is\.EqualTo\(\s*\d+\s*\)`,
              // NUnit: Assert.That(await rows.CountAsync(), Is.EqualTo(3))
              String.raw`\.CountAsync\(\)\s*\)\s*\.Should\(\)\.Be\(\s*\d+\s*\)`
              // FluentAssertions
            ].join("|")
          );
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            const code = codeOf(e);
            if (IDLE_OPTION.test(code))
              out.push(Object.assign(F("fragile_wait", "medium", e.seq, T("networkidle", { file: e.file || inMsg() })), { kind: "networkidle" }));
            else if (IDLE_OTHER.test(code))
              out.push(Object.assign(F("fragile_wait", "medium", e.seq, T("networkidle_wait", { file: e.file || inMsg() })), { kind: "networkidle" }));
            if (COUNT.test(code)) out.push(Object.assign(F("fragile_wait", "low", e.seq, T("exact_count", { file: e.file || inMsg() })), { kind: "count" }));
          }
          return out;
        },
        // ---- API tests: what an agent gets wrong when the thing under test is an HTTP API ----
        /* 0.1.130: a test expects an empty result (len(rows) == 0, == [], toHaveLength(0), isEmpty(), Assert.Empty), and no
           test of the same file expects a non-empty one. A broken query, a wrong filter or endpoint, an empty test database
           pass it too: an empty result proves something only next to one that is not empty (an idea from the owner's
           colleague's reviewers, ORACLE-001). Only in a test that asks something (QUERY): a new object's first state
           (new Cart().items == []) is no result. The last version of each file; a UI element that is not there
           (toHaveCount(0), should('not.exist')) is no result either. */
        empty_result_unverified(ev, cfg) {
          const EMPTY = new RegExp(
            [
              String.raw`\blen\((?:[^()]|\([^()]*\))*\)\s*==\s*0\b`,
              // Python
              String.raw`(?:==|assertEqual\([^,]+,)\s*(?:\[\s*\]|\{\s*\}|\(\s*\))`,
              String.raw`assertEqual\(\s*len\([^)]*\)\s*,\s*0\s*\)`,
              String.raw`\.toHaveLength\(\s*0\s*\)`,
              // JS
              String.raw`\.length\s*\)\s*\.(?:toBe|toEqual|toStrictEqual)\(\s*0\s*\)`,
              String.raw`\.(?:toEqual|toStrictEqual)\(\s*(?:\[\s*\]|\{\s*\})\s*\)`,
              String.raw`\.to\.(?:be\.empty|have\.lengthOf\(\s*0\s*\))`,
              String.raw`\)\s*\.isEmpty\(\)`,
              // Java: AssertJ, assertTrue(x.isEmpty())
              String.raw`assertTrue\([^;]*\.isEmpty\(\)`,
              String.raw`assertEquals\(\s*0L?\s*,[^;]*\.(?:size|length)\(\)`,
              String.raw`\.hasSize\(\s*0\s*\)`,
              String.raw`\bAssert\.Empty\(`,
              // C#
              String.raw`\bIs\.Empty\b`,
              String.raw`\.Should\(\)\.BeEmpty\(\)`,
              String.raw`Assert\.(?:AreEqual|Equal)\(\s*0\s*,[^;]*\.Count\b`
            ].join("|")
          );
          const NON_EMPTY = new RegExp(
            [
              String.raw`\blen\((?:[^()]|\([^()]*\))*\)\s*(?:>|>=\s*[1-9]|==\s*[1-9]|!=\s*0)`,
              String.raw`assert(?:Greater(?:Equal)?|Equal)\(\s*len\(`,
              String.raw`==\s*\[\s*[^\]\s]`,
              String.raw`\bassert\s+(?!.*\bnot\s+in\b).+\s+in\s+\S`,
              String.raw`\.toHaveLength\(\s*(?:[1-9]|[a-zA-Z_$])`,
              String.raw`\.length\s*\)\s*\.(?:toBeGreaterThan\(\s*\d|(?:toBeGreaterThanOrEqual|toBe|toEqual)\(\s*(?:[1-9]|[a-zA-Z_$]))`,
              String.raw`\.not\.(?:toHaveLength\(\s*0|toEqual\(\s*\[\s*\])`,
              String.raw`\.(?:toEqual|toStrictEqual)\(\s*\[\s*[^\]\s]`,
              String.raw`\.toContain(?:Equal)?\(`,
              String.raw`\.(?:isNotEmpty|contains|containsExactly)\(`,
              String.raw`\.hasSize\(\s*[1-9]`,
              String.raw`assertFalse\([^;]*\.isEmpty\(\)`,
              String.raw`assertEquals\(\s*[1-9]\d*L?\s*,[^;]*\.(?:size|length)\(\)`,
              String.raw`\b(?:Assert\.NotEmpty|Assert\.Contains|Assert\.Single)\(`,
              String.raw`\bIs\.Not\.Empty\b`,
              String.raw`\.Should\(\)\.(?:NotBeEmpty|HaveCount|Contain|ContainSingle)\(`,
              String.raw`Assert\.(?:AreEqual|Equal)\(\s*[1-9]\d*\s*,[^;]*\.Count\b`
            ].join("|")
          );
          const QUERY = /\b(?:get|post|put|patch|delete|fetch|request|query|execute|select|find\w*|search\w*|filter\w*|list\w*|Get\w*Async(?:<[^>\n]*>+)?)\s*\(|\.json\(\)|\b(?:response|resp|res)\b|\.(?:body|data|rows|results?)\b/i;
          const last = {};
          for (const e of ev) if (e.new_content && e.file && !e.fragment_only) last[e.file] = e;
          const out = [];
          for (const e of Object.values(last)) {
            if (!cfg.test_fn_pattern) continue;
            const blocks = blocksByTest(linesOf(e), cfg.test_fn_pattern);
            const empty = [];
            let nonEmpty = false;
            for (const [name, body] of Object.entries(blocks)) {
              const lines = body.split("\n");
              if (lines.some((l) => NON_EMPTY.test(l))) nonEmpty = true;
              const hit = lines.find((l) => EMPTY.test(l));
              if (hit && lines.some((l) => QUERY.test(l))) empty.push([name, hit.trim()]);
            }
            if (nonEmpty) continue;
            for (const [name, line] of empty)
              out.push(F("empty_result_unverified", "medium", e.seq, T("empty_result", { file: e.file, test: name, line: clip(line, 80) })));
          }
          return out;
        },
        status_only_assert(ev, cfg) {
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            for (const [name, body] of Object.entries(blocksByTest(linesOf(e), cfg.test_fn_pattern))) {
              const at = body.indexOf(".then()"), scope = at >= 0 ? body.slice(at) : body;
              const as = scope.split("\n").filter((l) => isAssertLine(l, cfg) || at >= 0 && /^\s*\.(?:header|headers|contentType|time|cookie)\s*\(/.test(l));
              if (as.length && as.every(isStatusLine))
                out.push(F("status_only_assert", "medium", e.seq, T("status_only", { file: e.file || inMsg(), test: name })));
            }
          }
          return out;
        },
        mocked_service(ev) {
          const RX = [
            /@responses\.activate\b|\bresponses\.add\s*\(|\brequests_mock\b|\bhttpx_mock\b|\brespx\.(?:mock|route)\b|\baioresponses\b|\bpatch\s*\(\s*['"](?:requests|httpx|aiohttp)\./,
            /\bWireMock\w*\b|\bMockWebServer\b|\bMockRestServiceServer\b/,
            /\bnock\s*\(|\b(?:jest|vi)\.mock\s*\(\s*['"](?:axios|node-fetch|got|superagent|undici)['"]|\bsetupServer\s*\(|\bfetchMock\b/,
            /\bMockHttpMessageHandler\b|\bMock<HttpMessageHandler>|\bMockHttp\b/
          ];
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            for (const rx of RX) {
              const m = codeOf(e).match(rx);
              if (m) {
                out.push(F("mocked_service", "medium", e.seq, T("mocked_api", { file: e.file || inMsg(), what: clip(m[0].trim(), 40) })));
                break;
              }
            }
          }
          return out;
        },
        hardcoded_secret(ev) {
          const out = [], mask2 = (v) => `${v.slice(0, 4)}… (${v.length})`;
          const ENV = /environ|getenv|process\.env|GetEnvironmentVariable|\benv\s*\(|Configuration\[/i;
          const PLACEHOLDER = /^(?:<.*>|\{\{.*\}\}|\$\{.*\}|%.*%|\*{3,}|x{4,}|\.{3}|your[-_ ]|my[-_ ]|example|dummy|fake|sample|placeholder|change[-_ ]?me|test|todo|null|none|undefined|secret|token|password)/i;
          const KINDS = SECRET_KINDS;
          for (const e of ev) {
            if (!e.new_content) continue;
            const seen = /* @__PURE__ */ new Set();
            for (const line of e.new_content.split("\n")) {
              if (/^\s*(?:#|\/\/|\*)/.test(line) || ENV.test(line)) continue;
              for (const [kind, rx] of KINDS) {
                rx.lastIndex = 0;
                for (const m of line.matchAll(rx)) {
                  const v = m[1] || m[0];
                  if (seen.has(v) || PLACEHOLDER.test(v)) continue;
                  seen.add(v);
                  out.push(F("hardcoded_secret", "high", e.seq, T("secret_found", { file: e.file || inMsg(), kind: T(kind), masked: mask2(v) })));
                }
              }
            }
          }
          return out;
        },
        hardcoded_base_url(ev) {
          const SKIP = /^(?:localhost|www|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal|(?:[\w-]+\.)*(?:example\.(?:com|org|net)|test|invalid|local|localhost)|(?:www\.)?(?:w3\.org|json-schema\.org|swagger\.io|openapis\.org|github\.com|githubusercontent\.com|npmjs\.com|mozilla\.org|wikipedia\.org|apache\.org|postman\.com|getpostman\.com|schemas\.microsoft\.com))$/i;
          const out = [], seen = /* @__PURE__ */ new Set();
          for (const e of ev) {
            if (!e.new_content || RUNNER_CONFIG_RX.test(e.file || "")) continue;
            for (const line of linesOf(e).split("\n")) {
              if (/^\s*(?:#|\/\/|\*)|\$schema|xmlns|href\s*=|@see/.test(line)) continue;
              for (const m of line.matchAll(/https?:\/\/((?:[A-Za-z0-9-]|\\{0,2}\.)+|\[[0-9a-f:]+\])(?::\d+)?/gi)) {
                const host = m[1].replace(/\\/g, "");
                if (SKIP.test(host)) continue;
                const k = `${e.file || ""}|${host}`;
                if (seen.has(k)) continue;
                seen.add(k);
                out.push(F("hardcoded_base_url", "medium", e.seq, T("base_url", { file: e.file || inMsg(), host })));
              }
            }
          }
          return out;
        },
        no_negative_cases(ev, cfg) {
          const NEG_NAME = /invalid|unauthori[sz]ed|forbidden|not[_ -]?found|bad[_ -]?request|without|missing|expired|denied|reject|error|fail|negative|conflict|duplicate|malformed|unknown|nonexist|too[_ -]?many/i;
          const NEG_CODE = /\b(?:400|401|403|404|405|406|409|410|413|415|422|429|5\d\d)\b|Unauthorized|Forbidden|NotFound|BadRequest|Conflict|Unprocessable|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|BAD_REQUEST|CONFLICT|UNPROCESSABLE/;
          const latest = /* @__PURE__ */ new Map();
          for (const e of ev) if (e.new_content) latest.set(e.file || "#" + e.seq, e);
          const seen = /* @__PURE__ */ new Set();
          let neg = 0, last = -1;
          for (const [file, e] of latest)
            for (const [name, body] of Object.entries(blocksByTest(linesOf(e), cfg.test_fn_pattern))) {
              const k = `${file.startsWith("#") ? "" : file}|${name}`;
              if (seen.has(k)) continue;
              seen.add(k);
              last = Math.max(last, e.seq);
              if (NEG_NAME.test(name) || body.split("\n").some((l) => isAssertLine(l, cfg) && NEG_CODE.test(l) && !/[<>]=?\s*\d{3}/.test(l))) neg++;
            }
          return seen.size >= 2 && neg === 0 ? [F("no_negative_cases", "medium", last, T("no_negative", { n: seen.size }))] : [];
        },
        test_data_no_cleanup(ev, cfg) {
          const NON_CREATING = /\b(?:login|logout|log-in|signin|sign-in|auth|token|oauth|search|query|graphql|verify|validate|refresh|echo|otp|reset|filter|export|calculate)\b/i;
          const CLEANUP = /\.delete\s*\(|\bDeleteAsync\s*\(|(?:Method|HttpMethod)\.Delete\b|\bmethod\s+delete\b|\bteardown\w*|\btearDown\b|@After(?:Each|All|Class|Method)?\b|\bafterEach\s*\(|\bafterAll\s*\(|\[(?:OneTime)?TearDown\]|\bDispose\s*\(|\byield\b|addfinalizer|\bclean_?up\b/i;
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            const code = codeOf(e);
            if (!Object.keys(blocksByTest(code, cfg.test_fn_pattern)).length) continue;
            const paths = [...code.matchAll(/\.post\s*\(\s*([^,)\n]+)/g)].map((m) => m[1]).concat([...code.matchAll(/\bPost(?:AsJson)?Async\s*\(\s*([^,)\n]+)/g)].map((m) => m[1]));
            const label = (p) => ((p.match(/["'`]([^"'`]+)["'`]/) || [])[1] || "POST").slice(0, 40);
            const unknown = /(?:Method|HttpMethod)\.Post\b|^\s*(?:\*|Given|When|And|Then)\s+method\s+post\b/im.test(code);
            if (!(paths.some((p) => !NON_CREATING.test(p)) || unknown) || CLEANUP.test(code)) continue;
            out.push(
              F("test_data_no_cleanup", "low", e.seq, T("no_cleanup", { file: e.file || inMsg(), what: label(paths.find((p) => !NON_CREATING.test(p)) || "") }))
            );
          }
          return out;
        },
        response_time_assert(ev, cfg) {
          const TIME = /\belapsed\b|response_?time|\bresponseTime\b|\.time\s*\(|\blatency\b|\bduration\b|ElapsedMilliseconds|total_seconds\s*\(/i, CMP = /<|\bbelow\b|\blessThan\w*|toBeLessThan\w*|\bLess(?:Than)?\b|\bmax\b/i;
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            for (const [name, body] of Object.entries(blocksByTest(linesOf(e), cfg.test_fn_pattern))) {
              const ln = body.split("\n").find((l) => /assert|expect/i.test(l) && TIME.test(l) && CMP.test(l));
              if (ln) out.push(F("response_time_assert", "low", e.seq, T("resp_time", { file: e.file || inMsg(), test: name, line: clip(ln.trim(), 60) })));
            }
          }
          return out;
        },
        // ---- Appium/mobile (qa-mobile): protocol-level, not tied to one client language ----
        /* Since 0.1.127: a locator whose text is an icon font's character, from Unicode's Private Use Area (U+E000–U+F8FF),
           written as the character, \uE9CC or \u{E9CC}: getByRole('link', { name: '\uE9CC' }) in the owner's Page Object
           session. It follows "locate by role and name" and still breaks when the icon font changes. */
        icon_glyph_locator(ev) {
          const PUA = String.raw`(?:[\uE000-\uF8FF]|\\u\{?(?:[Ee][0-9A-Fa-f]{3}|[Ff][0-8][0-9A-Fa-f]{2})\}?)`;
          const ONLY = new RegExp(String.raw`(['"\`])\s*((?:${PUA}\s*)+)\1`);
          const LOCATOR = /\b(?:getBy\w+|locator|contains|get|filter|hasText|name)\b/;
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            const hits = codeOf(e).split("\n").map((l) => LOCATOR.test(l) ? ONLY.exec(l) : null).filter(Boolean);
            if (!hits.length) continue;
            const first = hits[0][2].trim();
            const cp = /^\\u/.test(first) ? first.replace(/^\\u\{?([0-9A-Fa-f]{4}).*$/, "$1") : first.codePointAt(0).toString(16);
            out.push(F("icon_glyph_locator", "low", e.seq, T("icon_glyph_msg", { file: e.file || inMsg(), n: hits.length, code: "U+" + cp.toUpperCase() })));
          }
          return out;
        },
        mobile_raw_locator(ev) {
          const RX = /\b(?:By|MobileBy|AppiumBy)\s*\.\s*(?:xpath|XPath|className|ClassName)\s*\(|\bfindElementBy(?:XPath|ClassName)\b|\$\(\s*['"`](?:\/\/|\.[A-Za-z]|#[A-Za-z])/;
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            const n = codeOf(e).split("\n").filter((l) => RX.test(l)).length;
            if (n) out.push(F("mobile_raw_locator", "low", e.seq, T("mobile_raw_locator_msg", { file: e.file || inMsg(), n })));
          }
          return out;
        },
        /* Since 0.1.119: a gesture call whose first two arguments are numbers (not clickRow(15, 30)), or x and y numbers on a
           line about a gesture: touchAction({ action: 'tap', x: 120, y: 340 }), tap(x=100, y=200), a pointerMove. */
        hardcoded_coordinates(ev) {
          const CALL = /\b(?:tap|swipe|longPress|long_press|press|doubleTap|double_tap|click|moveTo|move_to|move_to_location|move_by_offset|point|withCoordinates)\s*\(\s*[[(]*\s*-?\d{2,}\s*,\s*-?\d{2,}/i;
          const XY = /\bx\s*[:=]\s*-?\d{2,}\s*,\s*y\s*[:=]\s*-?\d{2,}/;
          const GESTURE = /tap|swipe|press|touch|pointer|gesture|click|scroll|drag|move/i;
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            const ln = codeOf(e).split("\n").find((l) => CALL.test(l) || XY.test(l) && GESTURE.test(l));
            if (ln) out.push(F("hardcoded_coordinates", "medium", e.seq, T("hardcoded_coordinates_msg", { file: e.file || inMsg(), line: clip(ln.trim(), 60) })));
          }
          return out;
        },
        no_driver_teardown(ev) {
          const CREATE = /\bnew\s+(?:AppiumDriver|AndroidDriver|IOSDriver|RemoteWebDriver)\b|\bwebdriver\.remote\s*\(|\bRemote\s*\(\s*command_executor/i;
          const TEARDOWN = /\bdriver\.quit\s*\(\)|\bdriver\.Quit\s*\(\)|\bafterEach\s*\(|\bafter\s*\(|@After(?:Each|Class)?\b|\btearDown\b|\[TearDown\]/i;
          const out = [];
          for (const e of ev) {
            if (!e.new_content || !CREATE.test(codeOf(e)) || TEARDOWN.test(codeOf(e))) continue;
            out.push(F("no_driver_teardown", "medium", e.seq, T("no_driver_teardown_msg", { file: e.file || inMsg() })));
          }
          return out;
        },
        // ---- test smells (taxonomy: TsDetect / Pynose), per test block ----
        /* A line with a comment is skipped: the comment may explain the number, or the line is commented out. Since 0.1.120
           only a real comment counts: "#" or "//" inside a string (a CSS id, a URL) or `this.#field` is not one, and a line
           inside a block comment ("* expect(…)", and since 0.1.121 a line there with no leading *) is. */
        magic_number(ev, cfg) {
          const out = [], OK = /* @__PURE__ */ new Set([0, 1, 2, 100, 200, 201, 204, 301, 302, 400, 401, 403, 404, 405, 409, 422, 423, 429, 500, 502, 503]);
          const STRING = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
          const commented = (ln) => /\/\/|\/\*|(?:^|\s)#|^\s*\*/.test(ln.replace(STRING, '""'));
          for (const e of ev) {
            if (!e.new_content || !cfg.assert_line_patterns) continue;
            for (const [name, body] of Object.entries(blocksByTest(linesOf(e), cfg.test_fn_pattern))) {
              const nums = /* @__PURE__ */ new Set();
              for (const ln of body.split("\n"))
                if (cfg.assert_line_patterns.some((p) => p.test(ln)) && !commented(ln))
                  for (const m of ln.matchAll(/(?<![\w.])(-?\d+(?:\.\d+)?)(?![\w.])/g)) {
                    const n = +m[1];
                    if (!OK.has(n) && Math.abs(n) > 1) nums.add(m[1]);
                  }
              if (nums.size) out.push(F("magic_number", "low", e.seq, T("magic", { file: e.file || inMsg(), test: name, nums: [...nums].slice(0, 4).join(", ") })));
            }
          }
          return out;
        },
        assertion_roulette(ev, cfg) {
          const out = [];
          if (!["python", "java"].includes(cfg.language)) return out;
          for (const e of ev) {
            if (!e.new_content || !cfg.assert_line_patterns) continue;
            for (const [name, body] of Object.entries(blocksByTest(linesOf(e), cfg.test_fn_pattern))) {
              const as = body.split("\n").filter((l) => isAssertLine(l, cfg));
              const withMsg = as.filter((l) => cfg.language === "python" ? /,\s*(?:f?["'])/.test(l) : /assert\w+\s*\("[^"]*",/.test(l)).length;
              if (as.length >= 3 && withMsg === 0)
                out.push(F("assertion_roulette", "low", e.seq, T("roulette", { file: e.file || inMsg(), test: name, n: as.length })));
            }
          }
          return out;
        },
        conditional_logic(ev, cfg) {
          const out = [];
          for (const e of ev) {
            if (!e.new_content || !cfg.test_fn_pattern) continue;
            for (const [name, body] of Object.entries(blocksByTest(linesOf(e), cfg.test_fn_pattern))) {
              const inner = body.split("\n").slice(1).join("\n");
              const m = inner.match(/^[ \t]+(?:if|for|foreach|while|switch|try)\b[^\n]*/m) || inner.match(/^[ \t]+[^\n]*\.(?:forEach|ForEach)\s*\([^\n]*/m);
              if (m)
                out.push(
                  Object.assign(F("conditional_logic", "low", e.seq, T("conditional", { file: e.file || inMsg(), test: name, line: clip(m[0].trim(), 50) })), {
                    kind: "branch"
                  })
                );
            }
          }
          return out;
        },
        /* Since 0.1.127 an assertion repeated after an action is no duplicate: the same counter checked before and after a
           click proves the click left it alone (the owner's test-pw, 6 such findings). A repeat with only assertions, blank
           lines or comments between is one. */
        duplicate_assert(ev, cfg) {
          const out = [];
          for (const e of ev) {
            if (!e.new_content || !cfg.assert_line_patterns) continue;
            for (const [name, body] of Object.entries(blocksByTest(linesOf(e), cfg.test_fn_pattern))) {
              const at = /* @__PURE__ */ new Map();
              let steps = 0, dup = null;
              for (const l of body.split("\n")) {
                const t = l.trim();
                if (!t) continue;
                if (!isAssertLine(t, cfg)) {
                  steps++;
                  continue;
                }
                if (!dup && at.get(t) === steps) dup = t;
                at.set(t, steps);
              }
              if (dup) out.push(F("duplicate_assert", "low", e.seq, T("dup_assert", { file: e.file || inMsg(), test: name, line: clip(dup, 60) })));
            }
          }
          return out;
        },
        /* An async Cypress hook (0.1.121, qa-cypress): Cypress commands are queued, not awaited, so an async hook runs out of
           order. ESLint's cypress/no-async-before (vendored) sees only a titled before / beforeEach, before("load", async
           …), and nothing sees after / afterEach. This sees what it does not: an untitled before / beforeEach, and an after /
           afterEach with or without a title. So the two never report the same hook, and an async it() stays the engine's. */
        cypress_async_test(ev) {
          const RX = /\b(?:(?:before|beforeEach)\s*\(\s*async\b|(?:after|afterEach)\s*\(\s*(?:(['"`])[^'"`\n]*\1\s*,\s*)?async\b)/;
          const out = [];
          for (const e of ev) {
            if (!e.new_content) continue;
            const ln = codeOf(e).split("\n").find((l) => RX.test(l));
            if (ln) out.push(F("cypress_async_test", "medium", e.seq, T("cypress_async_hook", { file: e.file || inMsg(), line: clip(ln.trim(), 60) })));
          }
          return out;
        },
        /* test.fail() keeps the suite green while the bug it documents is still open in production. Defensible,
           but it must be a decision someone made, not a detail buried in a spec file. A test that does not run at all
           (@Disabled, t.Skip) is a skip: sleep_or_skip_added, not this (0.1.113). Since 0.1.121: Jest's it.failing /
           test.failing, and pytest's xfail only as the marker or the call (the word in a docstring or a string is not one). */
        expected_failure(ev, cfg) {
          const RX = /\btest\.fail\s*\(|\b(?:it|test)\.failing\b|\bmark\.xfail\b|\bpytest\.xfail\s*\(/;
          const out = [];
          for (const e of ev) {
            if (!e.new_content || !RX.test(codeOf(e))) continue;
            const n = (codeOf(e).match(new RegExp(RX.source, "g")) || []).length;
            out.push(F("expected_failure", "medium", e.seq, T("expected_failure", { file: e.file || inMsg(), n })));
          }
          return out;
        },
        /* Since 0.1.125 "нет" counts only as a reply: at the start of the message or of a sentence, before a comma, a stop
           or the end ("Нет, не так", "Нет!"). Anywhere else it says that something is missing: "Нет ограничения на длину
           строки" in a task (the owner's Cursor session of 11 Oct 2026), "в спеке ничего нет." And a question about what
           the agent did: "где вообще assertions?" (the same session, not seen until then), "зачем ты…" (both as the start of
           the message or a sentence), "why did you…". */
        user_frustration(ev) {
          const RX = /(?:^|[\s,.!])(?:не то|не так|не это|опять|снова|ещё раз|еще раз|я же (?:сказал|просил|писал|говорил)|ты не (?:понял|прочитал)|верни|откати|not what i|again|i (?:said|asked|told)|why did you|wrong|revert|undo)(?=[\s,.!?]|$)/i;
          const NO = /(?:^|[.!?]\s+)нет\s*(?:[,.!?…]|$)/i;
          const ASK = /(?:^|[.!?]\s+)(?:(?:а|ну|и|так)\s+)?(?:где вообще|зачем ты)(?=[\s,.!?]|$)/i;
          const out = [], users = ev.filter((e) => e.kind === "user");
          users.forEach((u, i) => {
            const t = u.text.toLowerCase(), said = t.trim();
            if (i > 0 && (RX.test(said) || NO.test(said) || ASK.test(said)) && t.length < 400)
              out.push(F("user_frustration", "medium", u.seq, T("frustration", { text: clip(u.text.trim(), 100) })));
            else if (i > 0 && t.length > 15 && users[i - 1].text.toLowerCase().slice(0, 40) === t.slice(0, 40))
              out.push(F("user_frustration", "medium", u.seq, T("repeat", { text: clip(u.text.trim(), 80) })));
          });
          return out;
        },
        stop_markers_missing(ev, cfg) {
          const p = planSeq(ev, cfg);
          const fe = ev.find((x) => ["edit", "write"].includes(x.kind) && !DOC_RX.test(x.file || ""));
          if (!fe) return [];
          if (p == null) return [F("stop_markers_missing", "medium", fe.seq, T("no_plan"))];
          if (approvalSeq(ev, p) == null) return [F("stop_markers_missing", "medium", fe.seq, T("no_approval"))];
          return [];
        }
      };
      const GHERKIN_BG_MAX_STEPS = 6;
      const GH_HEAD = (words) => new RegExp("^(?:" + words.join("|") + ")\\s*:\\s*(.*)$");
      const GH_BACKGROUND = GH_HEAD(["Background", "Предыстория", "Контекст"]);
      const GH_OUTLINE = GH_HEAD(["Scenario Outline", "Scenario Template", "Структура сценария", "Шаблон сценария"]);
      const GH_SCENARIO = GH_HEAD(["Scenario", "Example", "Сценарий", "Пример"]);
      const GH_EXAMPLES = GH_HEAD(["Examples", "Scenarios", "Примеры"]);
      const GH_STEP_WORDS = {
        Given: ["Given", "Дано", "Допустим", "Пусть"],
        When: ["When", "Когда", "Если"],
        Then: ["Then", "Тогда", "Затем", "То"],
        And: ["And", "К тому же", "Также", "И"],
        But: ["But", "Иначе", "Но", "А"]
      };
      const GH_STEP_KW = new Map(Object.entries(GH_STEP_WORDS).flatMap(([en, words]) => words.map((w) => [w, en])));
      const GH_STEP = new RegExp("^(" + [...GH_STEP_KW.keys()].join("|") + "|\\*)\\s+(.+)$");
      function parseFeature(text) {
        const scenarios = [];
        let background = null, cur = null, inExamples = false, docString = null;
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const t = lines[i].trim();
          if (docString) {
            if (t.startsWith(docString)) docString = null;
            continue;
          }
          if (t.startsWith('"""') || t.startsWith("```")) {
            docString = t.slice(0, 3);
            continue;
          }
          if (!t || t.startsWith("#") || t.startsWith("@")) continue;
          let m;
          if (m = t.match(GH_BACKGROUND)) {
            background = { steps: [], line: i + 1 };
            cur = background;
            inExamples = false;
            continue;
          }
          if (m = t.match(GH_OUTLINE)) {
            cur = { name: m[1] || `#${scenarios.length + 1}`, outline: true, steps: [], line: i + 1, hasExamples: false, exampleRows: 0, exHeaderSeen: false };
            scenarios.push(cur);
            inExamples = false;
            continue;
          }
          if (m = t.match(GH_SCENARIO)) {
            cur = { name: m[1] || `#${scenarios.length + 1}`, outline: false, steps: [], line: i + 1 };
            scenarios.push(cur);
            inExamples = false;
            continue;
          }
          if (GH_EXAMPLES.test(t)) {
            if (cur && cur.outline) {
              cur.hasExamples = true;
              inExamples = true;
            }
            continue;
          }
          if (inExamples && t.startsWith("|")) {
            if (cur.exHeaderSeen) cur.exampleRows++;
            else cur.exHeaderSeen = true;
            continue;
          }
          if (m = t.match(GH_STEP)) {
            if (cur) cur.steps.push({ kw: GH_STEP_KW.get(m[1]) || "*", text: m[2] });
            inExamples = false;
            continue;
          }
        }
        return { background, scenarios };
      }
      const normStep = (s) => s.replace(/<[^>]+>/g, "<VAR>").replace(/["'][^"']*["']/g, '"…"').replace(/\s+/g, " ").trim().toLowerCase();
      function gherkinChecks(ev) {
        const out = [];
        const byName = /* @__PURE__ */ new Map();
        for (const e of ev) {
          if (!e.new_content || !e.file || !/\.feature$/i.test(e.file)) continue;
          byName.set(e.file, { seq: e.seq, file: e.file, code: e.new_content });
        }
        for (const { seq, file, code } of byName.values()) {
          const { background, scenarios } = parseFeature(code);
          for (const sc of scenarios) {
            if (sc.outline && (!sc.hasExamples || !sc.exampleRows))
              out.push(F("outline_no_examples", "high", seq, T("outline_no_examples_msg", { file, scenario: sc.name })));
            if (!sc.steps.some((s) => s.kw === "Then" || s.kw === "*"))
              out.push(F("scenario_no_then", "high", seq, T("scenario_no_then_msg", { file, scenario: sc.name })));
          }
          if (background && background.steps.length > GHERKIN_BG_MAX_STEPS)
            out.push(F("bloated_background", "medium", seq, T("bloated_background_msg", { file, n: background.steps.length, max: GHERKIN_BG_MAX_STEPS })));
          const bySig = /* @__PURE__ */ new Map();
          for (const sc of scenarios) {
            if (sc.steps.length < 2) continue;
            const sig = [...new Set(sc.steps.map((s) => normStep(s.text)))].sort().join(" | ");
            if (!sig) continue;
            const arr = bySig.get(sig) || [];
            arr.push(sc.name);
            bySig.set(sig, arr);
          }
          for (const names of bySig.values()) {
            if (names.length > 1)
              out.push(F("duplicate_step_text", "low", seq, T("duplicate_step_text_msg", { file, scenarios: names.slice(0, 4).join(", "), n: names.length })));
          }
        }
        return out.map((f) => Object.assign(f, { source: "gherkin" }));
      }
      const asCount = (x) => typeof x === "number" ? x : typeof x === "string" && /^\s*\d+\s*$/.test(x) ? Number(x) : NaN;
      function calibLevel(st) {
        const ok = st ? asCount(st.ok) : 0, fp = st ? asCount(st.fp) : 0;
        if (!(ok >= 0 && fp >= 0 && Number.isFinite(ok + fp))) return { n: 0, p: null, level: "need" };
        const n = ok + fp;
        const p = n ? ok / n : null;
        const level = n >= 10 && p < 0.3 ? "off" : n >= 10 && p < 0.5 ? "demoted" : n < 10 ? "need" : "ok";
        return { n, p, level };
      }
      const RETRY_RX = /retr|rerun|flaky/i;
      function runChecks(ev, cfg) {
        const out = [];
        for (const name of cfg.checks) if (checks[name]) out.push(...checks[name](ev, cfg));
        return sortFindings(dedupe(out).map((f) => Object.assign(f, { source: "formal" })));
      }
      const CALIBRATED_SPEC = /* @__PURE__ */ new Set(["test_without_requirement", "out_of_scope_tested"]);
      const isTrial = (check) => (C().CHECKS[check] || {}).trial === true;
      function calibrated(f) {
        if ((C().CHECKS[f.check] || {}).calibrate === false) return false;
        const src = f.source || "formal";
        return src === "formal" || src === "lint" || src === "gherkin" || src === "spec" && CALIBRATED_SPEC.has(f.check);
      }
      function calibrate(findings, calib, overrides) {
        const shown = [], hidden = [], off = /* @__PURE__ */ new Map();
        for (const f of findings) {
          if (!calibrated(f)) {
            shown.push(f);
            continue;
          }
          const src = f.source || "formal";
          const cl = calibLevel(calib && calib[f.check] && calib[f.check][src]);
          if (cl.level === "off" && ((overrides || {})[f.check] || {}).enabled !== true) {
            hidden.push(f);
            off.set(f.check + "|" + src, { check: f.check, source: src, precision: cl.p, n: cl.n });
          } else if (cl.level === "demoted") shown.push({ ...f, severity: "low", demoted: true });
          else if (cl.level === "need" && isTrial(f.check)) shown.push({ ...f, severity: "low", trial: true });
          else shown.push(f);
        }
        return { findings: shown, hidden, suppressed: [...off.values()] };
      }
      function dedupe(out) {
        const seen = /* @__PURE__ */ new Set();
        return out.filter((f) => {
          const k = `${f.check}|${f.message}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      function sortFindings(out) {
        const o = { high: 0, medium: 1, low: 2 };
        const pri = (f) => (C().CHECKS[f.check] || {}).sortPriority || 0;
        return out.sort((a, b) => pri(a) - pri(b) || o[a.severity] - o[b.severity] || a.seq - b.seq);
      }
      function metrics(ev, cfg) {
        const reads = ev.filter((e) => ["read", "search"].includes(e.kind) || shellReads(e, cfg || {})).length, edits = ev.filter((e) => ["edit", "write"].includes(e.kind)).length;
        const runs = ev.filter((e) => e.kind === "run_tests" && e.tests);
        const green = runs.find((r) => !(r.tests.failed || r.tests.errors));
        const editsToGreen = green ? ev.filter((e) => ["edit", "write"].includes(e.kind) && e.seq < green.seq).length : null;
        return {
          reads,
          edits,
          readEdit: edits ? +(reads / edits).toFixed(1) : null,
          runs: runs.length,
          editsToGreen,
          firstGreenRun: green ? runs.indexOf(green) + 1 : null
        };
      }
      function verdict(findings) {
        const s = new Set(findings.map((f) => f.severity));
        return s.has("high") ? "red" : s.has("medium") ? "yellow" : "green";
      }
      const RULE_KEYS = Object.fromEntries(Object.entries(C().CHECKS).map(([c, v]) => [c, v.ruleKey]));
      const RULES = new Proxy(
        {},
        {
          get: (_, k) => {
            if (RULE_KEYS[
              /** @type {string} */
              k
            ]) return T(RULE_KEYS[
              /** @type {string} */
              k
            ]);
            if (typeof k === "string") C().warnUnknown(k, "Lens.RULES");
            return "";
          }
        }
      );
      const fkey = (f) => `${f.check}@${f.seq}@${String(f.message || "").slice(0, 40)}`;
      function snippet(f) {
        const ev = f.evidence || (f.code ? (f.code.split("\n").find((l) => l.includes("▸")) || "").replace(/^\s*\d+\s*▸\s?/, "") : "");
        return clip((ev || f.message).replace(/\s+/g, " ").trim(), 140);
      }
      const ANALYSIS_VERSION = "0.1.132";
      function canon(v) {
        if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
        if (v && typeof v === "object")
          return "{" + Object.keys(v).sort().filter((k) => v[k] !== void 0).map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
        return JSON.stringify(v === void 0 ? null : v);
      }
      function analysisGen(o) {
        const src = canon({ r: o && o.ruleOverrides || {}, l: !(o && o.lint === false), e: o && o.epoch || 0, v: ANALYSIS_VERSION });
        let h = 2166136261;
        for (let i = 0; i < src.length; i++) {
          h ^= src.charCodeAt(i);
          h = Math.imul(h, 16777619) >>> 0;
        }
        return ("0000000" + h.toString(16)).slice(-8);
      }
      function carryVerdicts(s) {
        const verdicts = s && s.verdicts;
        if (!verdicts || typeof verdicts !== "object") return 0;
        const all = [...Array.isArray(s.findings) ? s.findings : [], ...Array.isArray(s.calibHidden) ? s.calibHidden : []];
        const now = new Set(all.map(fkey));
        let moved = 0;
        const move = (k, f) => {
          const nk = fkey(f);
          verdicts[nk] = verdicts[k];
          delete verdicts[k];
          now.add(nk);
          moved++;
        };
        for (const k of Object.keys(verdicts)) {
          if (now.has(k)) continue;
          const [check, seq] = k.split("@");
          const free = all.filter((f) => f.check === check && String(f.seq) === seq && !verdicts[fkey(f)]);
          if (free.length === 1) move(k, free[0]);
        }
        const words = (k) => k.split("@").slice(2).join("@").replace(/\d+/g, "#");
        const groups = /* @__PURE__ */ new Map();
        const group = (check, w) => {
          const k = check + "@" + w;
          if (!groups.has(k)) groups.set(k, { old: [], now: [] });
          return groups.get(k);
        };
        for (const k of Object.keys(verdicts)) if (!now.has(k)) group(k.split("@")[0], words(k)).old.push(k);
        for (const f of all) if (!verdicts[fkey(f)]) group(f.check, words(fkey(f))).now.push(f);
        for (const g of groups.values()) {
          if (!g.old.length || g.old.length !== g.now.length) continue;
          g.old.sort((a, b) => Number(a.split("@")[1]) - Number(b.split("@")[1]));
          g.now.sort((a, b) => a.seq - b.seq);
          g.old.forEach((k, i) => move(k, g.now[i]));
        }
        return moved;
      }
      function sessionStarted(events) {
        for (const e of Array.isArray(events) ? events : []) {
          const t = e && typeof e.ts === "string" && e.ts ? Date.parse(e.ts) : NaN;
          if (!isNaN(t)) return new Date(t).toISOString();
        }
        return "";
      }
      const wordChar = (c) => /[\p{L}\p{N}_$]/u.test(c || "");
      function clip(text, n) {
        const t = String(text || "");
        if (t.length <= n) return t;
        let k = n - 1;
        while (k > n / 2 && wordChar(t[k - 1]) && wordChar(t[k])) k--;
        if (k <= n / 2) k = n - 1;
        return t.slice(0, k).replace(/[\s,;:.·/—–([{=-]+$/, "") + "…";
      }
      function sessionSummary(s) {
        const findings = Array.isArray(s.findings) ? s.findings : [], verdicts = s.verdicts && typeof s.verdicts === "object" ? s.verdicts : {};
        const checkStats = {}, sourceStats = {}, confirmed = [];
        let open = 0;
        const count = (f, vd) => {
          const per = sourceStats[f.check] = sourceStats[f.check] || {}, src = f.source || "formal";
          for (const x of [checkStats[f.check] = checkStats[f.check] || { total: 0, ok: 0, fp: 0 }, per[src] = per[src] || { total: 0, ok: 0, fp: 0 }]) {
            x.total++;
            if (vd && (vd.v === "ok" || vd.v === "fp")) x[vd.v]++;
          }
        };
        for (const f of findings) {
          const k = fkey(f), vd = verdicts[k];
          count(f, vd);
          if (!vd) open++;
          if (vd && vd.v === "ok")
            confirmed.push({ key: k, check: f.check, seq: f.seq, message: clip(f.message, 90), snippet: snippet(f), note: String(vd.note || "") });
        }
        for (const f of Array.isArray(s.calibHidden) ? s.calibHidden : []) count(f, verdicts[fkey(f)]);
        const origin = AGENTS.includes(s.agent) ? { agent: s.agent, project: cleanProject(s.project) } : transcriptOrigin(s.source_text, { cursorProject: s.source_project });
        origin.project = projectOf(s, origin.project);
        return {
          id: s.id,
          name: s.name || "",
          task: s.task || "",
          profile: s.profile || "",
          created: s.created || "",
          started: sessionStarted(s.events),
          reviewed: !!s.reviewed,
          nameSet: !!s.nameSet,
          specN: s.specParsed && s.specParsed.n || 0,
          verdict: verdict(findings),
          findingsCount: findings.length,
          hiddenCount: Array.isArray(s.calibHidden) ? s.calibHidden.length : 0,
          verdictsCount: Object.keys(verdicts).length,
          openCount: open,
          agent: origin.agent,
          project: origin.project,
          group: cleanGroup(s.group),
          checkStats,
          sourceStats,
          confirmed
        };
      }
      function displayName(s) {
        if (!s) return "";
        return s.nameSet && s.name || s.task || s.name || s.id || "";
      }
      function otherName(s) {
        if (!s) return "";
        const d = displayName(s);
        return d === s.name ? s.task || s.name || "" : s.name || "";
      }
      const VALIDATED_PROFILES = ["qa-ts", "qa-python", "qa-generic"];
      const UNVERIFIED_MIN = 5;
      const PROBE_EXT = [".ts", ".js", ".py", ".java", ".kt", ".cs", ".go", ".feature", ".robot"];
      function isValidated(name, verdicts) {
        return VALIDATED_PROFILES.includes(name) || (verdicts || 0) >= UNVERIFIED_MIN;
      }
      const lintLanguage = (cfg) => cfg && (cfg.lint_language || cfg.language) || "";
      function profileInfo(name, deps) {
        const d = deps || {}, cfg = profile(name), lang = lintLanguage(cfg), C2 = d.checks, L = d.lint, S = d.spec;
        const overrides = d.overrides || {}, settings = d.settings || {};
        const regex = new Set((cfg.checks || []).filter((k) => !C2 || C2.CHECKS[k]));
        const map = L && L.RULE_MAPS && L.RULE_MAPS[lang] || {};
        const lint = new Set(
          Object.values(map).map((v) => Array.isArray(v) ? v[0] : v).filter((k) => !C2 || C2.CHECKS[k])
        );
        const gherkin = C2 ? Object.keys(C2.CHECKS).filter((k) => C2.CHECKS[k].sources.includes("gherkin")) : [];
        const all = /* @__PURE__ */ new Set([...regex, ...lint, ...gherkin]);
        const order = C2 ? Object.keys(C2.CHECKS) : [...all];
        const groups = (C2 ? C2.GROUPS_ORDER : ["checks"]).map((g) => ({
          group: g,
          checks: order.filter((k) => all.has(k) && (!C2 || C2.CHECKS[k].group === g)).map((k) => ({
            name: k,
            off: (overrides[k] || {}).enabled === false,
            engineOnly: lint.has(k) && !regex.has(k) && !gherkin.includes(k)
          }))
        })).filter((g) => g.checks.length);
        const files = L && L.ENGINE_FILES ? L.ENGINE_FILES[lang] : null;
        const kind = files ? files.boot ? files.js.includes("lint-ruff.js") ? "tree-sitter-ruff" : "tree-sitter" : lang === "cypress" ? "eslint-cypress" : lang === "detox" ? "eslint-detox" : "eslint" : lint.size ? "robot-parser" : "none";
        const engine = { kind, state: kind === "none" ? "none" : settings.lint === false ? "off" : "on" };
        if (kind !== "none" && cfg.lint_ext) engine.files = cfg.lint_ext.slice();
        const exts = (cfg.code_ext && cfg.code_ext.length ? cfg.code_ext : PROBE_EXT).filter((e) => !/\.(?:postman_\w+\.)?json$/.test(e));
        const spec = S ? {
          read: exts.filter((e) => S.supports(cfg.language, "file" + e)),
          notRead: exts.filter((e) => !S.supports(cfg.language, "file" + e)),
          anyFile: !(cfg.code_ext && cfg.code_ext.length)
        } : null;
        return {
          profile: cfg.profile,
          language: cfg.language,
          codeExt: cfg.code_ext || [],
          runners: cfg.test_runner_patterns || [],
          groups,
          count: all.size,
          engine,
          spec,
          asserts: !!(cfg.test_fn_pattern && (cfg.assert_line_patterns || []).length),
          gherkin: gherkin.length > 0,
          calibration: {
            validated: isValidated(cfg.profile, d.verdicts),
            builtIn: VALIDATED_PROFILES.includes(cfg.profile),
            verdicts: d.verdicts || 0,
            min: UNVERIFIED_MIN
          }
        };
      }
      return {
        profile,
        lintLanguage,
        PROFILES: VISIBLE,
        ALIAS,
        redactSecrets,
        joinSubagents,
        heredocWrites,
        personText,
        browserTool,
        mcpParts,
        importAny,
        homeless,
        clip,
        transcriptOrigin,
        usageOf,
        normPrices,
        usageCost,
        AGENTS,
        cleanGroup,
        projectOf,
        GROUP_MAX,
        isCursorJsonl,
        cursorProjectSlug,
        isCursorStreamJson,
        unreadToolCalls,
        IMPORT_GEN,
        needsReimport,
        subagentsMissing,
        cursorEditsMissing,
        transcriptMatch,
        pickConversation,
        runChecks,
        calibrate,
        isCalibrated: (check, source) => calibrated({ check, source }),
        isTrial,
        gherkinChecks,
        sortFindings,
        metrics,
        verdict,
        phases,
        taskId,
        guessTask,
        RULES,
        calibLevel,
        parseTests,
        compareAsserts,
        poAssertions,
        blocksByTest,
        fkey,
        carryVerdicts,
        snippet,
        analysisGen,
        ANALYSIS_VERSION,
        displayName,
        otherName,
        sessionSummary,
        profileInfo,
        isValidated,
        VALIDATED_PROFILES,
        UNVERIFIED_MIN
      };
    });
  }
});

// src/hook/cursor-hook.js
var fs = require("fs");
var os = require("os");
var path = require("path");
var Lens = require_lens();
var VERSION = 1;
var MAX_COMMAND = 2e3;
var MAX_OUTPUT = 2e4;
var MAX_EDIT = 2e4;
var MAX_EDITS = 50;
var MAX_FILE = 2e5;
var SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
var WRITES = /* @__PURE__ */ new Set(["Write", "StrReplace", "Edit", "MultiEdit", "EditNotebook", "ApplyPatch"]);
var str = (v) => typeof v === "string" ? v : "";
var head = (s, n) => s.length > n ? s.slice(0, n) : s;
var tail = (s, n) => s.length > n ? s.slice(-n) : s;
var mask = (s) => Lens.redactSecrets(s).text;
var num = (v) => typeof v === "number" && isFinite(v) ? v : void 0;
function exitCodeOf(out) {
  if (out && typeof out === "object") return num(out.exitCode);
  try {
    return num(JSON.parse(str(out)).exitCode);
  } catch (e) {
    return void 0;
  }
}
function record(p, now) {
  if (!p || typeof p !== "object" || !SAFE_ID.test(str(p.conversation_id))) return null;
  const base = { v: VERSION, ts: now.toISOString(), conversation_id: p.conversation_id, generation_id: str(p.generation_id) || void 0 };
  const ev = p.hook_event_name;
  if (ev === "afterShellExecution") {
    const output = str(p.output);
    return Object.assign(base, {
      event: "shell",
      tool_use_id: str(p.tool_use_id) || void 0,
      command: mask(head(str(p.command), MAX_COMMAND)),
      output: mask(tail(output, MAX_OUTPUT)),
      output_chars: output.length,
      duration: num(p.duration)
    });
  }
  if (ev === "afterFileEdit") {
    const edits = (Array.isArray(p.edits) ? p.edits : []).slice(0, MAX_EDITS);
    return Object.assign(base, {
      event: "edit",
      file_path: str(p.file_path),
      edits: edits.map((e) => ({ old: head(str(e && e.old_string), MAX_EDIT), new: head(str(e && e.new_string), MAX_EDIT) }))
    });
  }
  if ((ev === "postToolUse" || ev === "postToolUseFailure") && p.tool_name === "Shell") {
    const code = exitCodeOf(p.tool_output);
    return Object.assign(base, {
      event: "exit",
      tool_use_id: str(p.tool_use_id) || void 0,
      command: mask(head(str(p.tool_input && p.tool_input.command), MAX_COMMAND)),
      exit_code: code,
      failed: ev === "postToolUseFailure" || code !== void 0 && code !== 0
    });
  }
  if (ev === "postToolUse" && WRITES.has(p.tool_name) && p.tool_input && typeof p.tool_input.content === "string") {
    const content = p.tool_input.content;
    if (content.length > MAX_FILE) return null;
    return Object.assign(base, { event: "file", file_path: str(p.tool_input.file_path) || str(p.tool_input.path), content });
  }
  if (ev === "stop") {
    return Object.assign(base, {
      event: "stop",
      status: str(p.status) || void 0,
      model: str(p.model_id) || str(p.model) || void 0,
      input_tokens: num(p.input_tokens),
      output_tokens: num(p.output_tokens),
      cache_read_tokens: num(p.cache_read_tokens),
      cache_write_tokens: num(p.cache_write_tokens)
    });
  }
  return null;
}
var logDir = (env) => env.SESSIONLENS_HOOK_LOG || path.join(os.homedir(), ".cursor", "sessionlens", "log");
function handle(input, { env = process.env, now = /* @__PURE__ */ new Date() } = {}) {
  try {
    const r = record(JSON.parse(input), now);
    if (!r) return null;
    const dir = logDir(env);
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify(r) + "\n";
    fs.appendFileSync(path.join(dir, r.conversation_id + ".jsonl"), line);
    return line;
  } catch (e) {
    return null;
  }
}
function main() {
  const chunks = [];
  let done = false;
  const finish = (write) => {
    if (done) return;
    done = true;
    if (write) handle(Buffer.concat(chunks).toString("utf8"));
    try {
      process.stdout.write("{}\n");
    } catch (e) {
    }
    process.exit(0);
  };
  process.on("uncaughtException", () => finish(false));
  setTimeout(() => finish(false), 5e3).unref();
  process.stdin.on("data", (c) => chunks.push(c));
  process.stdin.on("error", () => finish(false));
  process.stdin.on("end", () => finish(true));
}
module.exports = { record, handle, logDir, VERSION, MAX_OUTPUT, MAX_COMMAND, MAX_EDIT, MAX_EDITS, MAX_FILE };
if (require.main === module) main();
