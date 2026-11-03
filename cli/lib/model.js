"use strict";
/* --review: a language model reviews the session, with the panel's own code: LensAI.review in media/ai.js (the prompt,
   the masking of secrets, the retries, the verification) over providers.js (the request, its time limit, a key never
   shown in an error). The key comes from the environment and stays in the transport; ai.js never holds it.

   The review explains, it does not judge. In the lab's measurement (73 reviews, 2 November) a high finding did not
   tell honest sessions from a cheat, and two reviews of one session often differed. So its findings never reach
   s.findings: they do not count in the verdict or in --fail-on, and a model that fails leaves the report as it was.
   This file is loaded only with --review, so that a run without it has no network code. */
const fs = require("fs");
const path = require("path");

const MEDIA = require("./media");
const I18N = require(path.join(MEDIA, "i18n.js"));
const LensAI = require(path.join(MEDIA, "ai.js"));
const LensReport = require(path.join(MEDIA, "report.js"));
// the extension's file, in the repository's root; scripts/pack-cli.js puts a copy next to this one in the package
const { createProviderCall, validUrl } = require(fs.existsSync(path.join(__dirname, "providers.js")) ? "./providers.js" : "../../providers.js");

const KEY_ENV = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  qwen: "DASHSCOPE_API_KEY",
};
const PROVIDERS = Object.keys(LensAI.PROVIDERS).filter((name) => !LensAI.PROVIDERS[name].cli);
// in CI nobody could be asked, so "the agent should have asked" says where the session ran, as stop_markers_missing does
const CI_CONTEXT = new Set(["ai_questions"]);

// what is wrong with the --review options, or "": a mistake here is exit 2, before anything is sent
function optionError(o) {
  if (!o.review) {
    const stray = ["provider", "model", "base-url"].find((k) => o[k]);
    return stray ? `--${stray} goes with --review` : "";
  }
  const names = PROVIDERS.join(", ");
  if (!o.provider) return `--review needs --provider: ${names}`;
  const p = LensAI.PROVIDERS[o.provider];
  if (!p) return `unknown provider "${o.provider}": ${names}`;
  if (p.cli) return `--provider ${o.provider} runs through a subscription, which the CLI does not do yet: ${names}`;
  if (o["base-url"]) {
    if (!p.local && !p.editableBase) return "--base-url is for the providers local and qwen";
    if (!validUrl(o["base-url"])) return `--base-url is not an http or https address: ${o["base-url"]}`;
  }
  return "";
}

// where the material goes, for the line on stderr that says so
const destination = (o) => LensAI.PROVIDERS[o.provider].label + (o["base-url"] ? ` at ${o["base-url"]}` : "");

// the model's text is under the influence of the transcript: one line, and no escape codes for a terminal
const clean = (text) =>
  String(text == null ? "" : text)
    .replace(/\p{Cc}+/gu, " ")
    .trim();
const row = (f) => ({
  check: f.check,
  severity: f.severity,
  seq: f.seq,
  message: clean(f.message),
  source: "ai",
  ...LensReport.modelOf(f),
  verified: !!f.verified,
});

/* → { model, findings, context, dropped, truncated?, verifyError?, partial? }, or { model, error } when there is no review: a
   missing key is one of these, since a pull request from a fork has no secrets and that must not break its build.
   io.fetchImpl and io.minGapMs are for tests. */
async function review(s, o, io) {
  const name = o.provider,
    p = LensAI.PROVIDERS[name];
  const model = LensAI.modelLabel({ provider: name, model: o.model });
  const envName = KEY_ENV[name];
  const key = envName ? String((io.env || {})[envName] || "").trim() : "";
  if (envName && !key) return { model, error: `${envName} is not set` };
  LensAI.setKeyStatus({ [name]: true });
  const call = createProviderCall({ LensAI, i18n: I18N, getKey: async () => key, getBaseUrl: async () => o["base-url"] || "", fetchImpl: io.fetchImpl });
  LensAI.setTransport((payload) => call(payload));
  const settings = {
    provider: name,
    model: o.model || p.defaultModel,
    verify: true,
    maxCode: p.local ? 12000 : 40000, // the panel's defaults
    ...(Number.isFinite(io.minGapMs) ? { minGapMs: io.minGapMs } : {}),
  };
  let r;
  try {
    r = await LensAI.review(s, settings);
  } catch (e) {
    return { model, error: clean(e.message) };
  }
  // a local server is asked file by file, and a file that fails does not stop the others (LensAI.review)
  const failed = r.fileErrors || [];
  if (failed.length && failed.length === r.files) return { model, error: clean(failed[0]) };
  const rows = r.findings.map(row);
  const aside = (f) => !!o.ci && CI_CONTEXT.has(f.check);
  return {
    model,
    findings: rows.filter((f) => !aside(f)),
    context: rows.filter(aside),
    dropped: (r.dropped || []).map((f) => ({ ...row(f), why: clean(f.why) })),
    ...(r.truncated ? { truncated: true } : {}),
    ...(r.verifyError ? { verifyError: clean(r.verifyError) } : {}),
    ...(failed.length ? { partial: `${failed.length} of ${r.files} files not reviewed: ${clean(failed[0])}` } : {}),
  };
}

module.exports = { review, optionError, destination, PROVIDERS, KEY_ENV };
